using GestPR.Dtos;
using GestPR.Service.MachineLearning;
using Microsoft.AspNetCore.Hosting;
using Moq;
using Xunit;

namespace GestPR.Tests
{
    // Tests "comportementaux" du modèle d'anomalies : on ne vérifie pas un chiffre exact
    // (le ML a une part de variance), mais des INVARIANTS métier qui doivent toujours être vrais,
    // quel que soit le détail interne de l'algorithme RandomizedPCA.
    public class AnomalyDetectionServiceTests : IDisposable
    {
        private readonly string _tempContentRoot;

        public AnomalyDetectionServiceTests()
        {
            // Dossier temporaire isolé : n'écrit jamais dans le vrai MLModels/ du projet,
            // et permet de lancer les tests en parallèle sans collision de fichiers.
            _tempContentRoot = Path.Combine(Path.GetTempPath(), "GestPRTests_" + Guid.NewGuid());
            Directory.CreateDirectory(_tempContentRoot);
        }

        public void Dispose()
        {
            if (Directory.Exists(_tempContentRoot))
                Directory.Delete(_tempContentRoot, recursive: true);
        }

        // Construit un dataset simulé : 4 achats "normaux" + 1 achat manifestement aberrant
        // (100x plus cher que tout le reste), sans jamais toucher à SQL Server.
        private static List<AchatDatasetRow> ConstruireDatasetControle()
        {
            return new List<AchatDatasetRow>
            {
                new() { ArticleId = 1, CodeLot = "LOT-A1", Designation = "PIECE_A", PrixDeRevient = 50000m,
                        LogPrixDeRevient = Math.Log(50001), NbOccurrencesDesignation = 2,
                        MoyenneDesignation = 51000, EcartTypeDesignation = 1414, ZScoreDesignation = -0.71,
                        IsLikelyTestData = false, DateTime = DateTime.UtcNow, Status = "Validée" },

                new() { ArticleId = 2, CodeLot = "LOT-A2", Designation = "PIECE_A", PrixDeRevient = 52000m,
                        LogPrixDeRevient = Math.Log(52001), NbOccurrencesDesignation = 2,
                        MoyenneDesignation = 51000, EcartTypeDesignation = 1414, ZScoreDesignation = 0.71,
                        IsLikelyTestData = false, DateTime = DateTime.UtcNow, Status = "Validée" },

                new() { ArticleId = 3, CodeLot = "LOT-B1", Designation = "PIECE_B", PrixDeRevient = 48000m,
                        LogPrixDeRevient = Math.Log(48001), NbOccurrencesDesignation = 1,
                        MoyenneDesignation = 48000, EcartTypeDesignation = 0, ZScoreDesignation = 0,
                        IsLikelyTestData = false, DateTime = DateTime.UtcNow, Status = "Validée" },

                new() { ArticleId = 4, CodeLot = "LOT-C1", Designation = "PIECE_C", PrixDeRevient = 51000m,
                        LogPrixDeRevient = Math.Log(51001), NbOccurrencesDesignation = 1,
                        MoyenneDesignation = 51000, EcartTypeDesignation = 0, ZScoreDesignation = 0,
                        IsLikelyTestData = false, DateTime = DateTime.UtcNow, Status = "Validée" },

                // ⚠️ Le point aberrant : 100x plus cher que le reste du dataset
                new() { ArticleId = 5, CodeLot = "LOT-X1", Designation = "PIECE_X", PrixDeRevient = 5000000m,
                        LogPrixDeRevient = Math.Log(5000001), NbOccurrencesDesignation = 1,
                        MoyenneDesignation = 5000000, EcartTypeDesignation = 0, ZScoreDesignation = 0,
                        IsLikelyTestData = false, DateTime = DateTime.UtcNow, Status = "Validée" },
            };
        }

        [Fact]
        public async Task DetectAsync_DoitClasserLePrixAberrantCommeLePlusSuspect()
        {
            // ARRANGE : on simule la source de données avec notre dataset contrôlé
            var mockDataset = new Mock<IAchatDatasetService>();
            mockDataset.Setup(s => s.GetDatasetAsync())
                       .ReturnsAsync(ConstruireDatasetControle());

            var mockEnv = new Mock<IWebHostEnvironment>();
            mockEnv.Setup(e => e.ContentRootPath).Returns(_tempContentRoot);

            var service = new AnomalyDetectionService(mockDataset.Object, mockEnv.Object);

            // ACT : on entraîne puis on détecte, sur le MÊME dataset simulé et reproductible
            await service.TrainAndSaveAsync(excludeTestData: false);
            var resultats = await service.DetectAsync();

            // ASSERT : quel que soit le score exact, le point aberrant (ArticleId=5) doit
            // TOUJOURS ressortir en tête du classement — c'est l'invariant métier non négociable.
            var pireResultat = resultats.OrderByDescending(r => r.ScoreAnomalie).First();
            Assert.Equal(5, pireResultat.ArticleId);
        }

        [Fact]
        public async Task TrainAndSaveAsync_DoitRefuserSiTropPeuDeDonnees()
        {
            // ARRANGE : seulement 2 lignes, en dessous du minimum requis (4)
            var mockDataset = new Mock<IAchatDatasetService>();
            mockDataset.Setup(s => s.GetDatasetAsync())
                       .ReturnsAsync(ConstruireDatasetControle().Take(2).ToList());

            var mockEnv = new Mock<IWebHostEnvironment>();
            mockEnv.Setup(e => e.ContentRootPath).Returns(_tempContentRoot);

            var service = new AnomalyDetectionService(mockDataset.Object, mockEnv.Object);

            // ACT + ASSERT : le service doit refuser clairement, pas planter avec une erreur ML.NET obscure
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.TrainAndSaveAsync(excludeTestData: false));
        }

        [Fact]
        public async Task AnalyserPrixAsync_SansHistorique_NeDoitJamaisAlerterAtort()
        {
            // ARRANGE : on entraîne d'abord sur un dataset normal
            var mockDataset = new Mock<IAchatDatasetService>();
            mockDataset.Setup(s => s.GetDatasetAsync())
                       .ReturnsAsync(ConstruireDatasetControle());
            mockDataset.Setup(s => s.GetStatsDesignationAsync("DESIGNATION_JAMAIS_VUE"))
                       .ReturnsAsync((0, 0.0, 0.0)); // aucun historique pour cette désignation

            var mockEnv = new Mock<IWebHostEnvironment>();
            mockEnv.Setup(e => e.ContentRootPath).Returns(_tempContentRoot);

            var service = new AnomalyDetectionService(mockDataset.Object, mockEnv.Object);
            await service.TrainAndSaveAsync(excludeTestData: false);

            // ACT : on analyse un prix pour une désignation totalement inconnue
            var resultat = await service.AnalyserPrixAsync("DESIGNATION_JAMAIS_VUE", "LOT-NEW", 99999m);

            // ASSERT : sans historique, on ne peut pas juger — jamais d'alerte "à tort"
            Assert.False(resultat.EstAnomalie);
            Assert.Equal(0, resultat.NbOccurrencesHistorique);
        }
    }
}
