using GestPR.Dtos;
using GestPR.Service.MachineLearning;
using Microsoft.AspNetCore.Hosting;
using Moq;
using Xunit;

namespace GestPR.Tests
{
    public class DelaiValidationServiceTests : IDisposable
    {
        private readonly string _tempContentRoot;

        public DelaiValidationServiceTests()
        {
            _tempContentRoot = Path.Combine(Path.GetTempPath(), "GestPRTests_Delai_" + Guid.NewGuid());
            Directory.CreateDirectory(_tempContentRoot);
        }

        public void Dispose()
        {
            if (Directory.Exists(_tempContentRoot))
                Directory.Delete(_tempContentRoot, recursive: true);
        }

        // Dataset simulé : le Validateur 1 traite toujours vite (1-2 jours),
        // le Validateur 2 traite toujours lentement (10-12 jours) — peu importe le montant.
        private static List<ValidationDatasetRow> ConstruireDatasetControle()
        {
            var lignes = new List<ValidationDatasetRow>();
            var montants = new double[] { 100000, 250000, 500000, 750000 };

            for (int i = 0; i < montants.Length; i++)
            {
                lignes.Add(new ValidationDatasetRow
                {
                    DemandeId = i + 1,
                    Montant = montants[i],
                    ValidateurId = 1, // "rapide"
                    NbJours = 1 + (i % 2), // 1 ou 2 jours
                    DateCreation = DateTime.UtcNow.AddDays(-20),
                    DateValidation = DateTime.UtcNow.AddDays(-18)
                });

                lignes.Add(new ValidationDatasetRow
                {
                    DemandeId = i + 100,
                    Montant = montants[i],
                    ValidateurId = 2, // "lent"
                    NbJours = 10 + (i % 3), // 10 à 12 jours
                    DateCreation = DateTime.UtcNow.AddDays(-20),
                    DateValidation = DateTime.UtcNow.AddDays(-8)
                });
            }

            return lignes;
        }

        [Fact]
        public async Task PredireAsync_DoitPredireUnDelaiPlusLongPourLeValideurLent()
        {
            // ARRANGE
            var mockDataset = new Mock<IValidationDatasetService>();
            mockDataset.Setup(s => s.GetDatasetAsync())
                       .ReturnsAsync((ConstruireDatasetControle(), 0));

            var mockEnv = new Mock<IWebHostEnvironment>();
            mockEnv.Setup(e => e.ContentRootPath).Returns(_tempContentRoot);

            var service = new DelaiValidationService(mockDataset.Object, mockEnv.Object);
            await service.TrainAndSaveAsync();

            // ACT : même montant, deux valideurs différents
            var delaiRapide = await service.PredireAsync(montant: 400000, validateurId: 1);
            var delaiLent = await service.PredireAsync(montant: 400000, validateurId: 2);

            // ASSERT : le modèle doit avoir appris que le Validateur 2 est plus lent,
            // peu importe la valeur exacte prédite.
            Assert.True(delaiLent > delaiRapide,
                $"Le valideur lent ({delaiLent:F1}j) devrait être prédit plus lent que le rapide ({delaiRapide:F1}j)");
        }

        [Fact]
        public async Task PredireAsync_NeDoitJamaisRetournerUnDelaiNegatif()
        {
            var mockDataset = new Mock<IValidationDatasetService>();
            mockDataset.Setup(s => s.GetDatasetAsync())
                       .ReturnsAsync((ConstruireDatasetControle(), 0));

            var mockEnv = new Mock<IWebHostEnvironment>();
            mockEnv.Setup(e => e.ContentRootPath).Returns(_tempContentRoot);

            var service = new DelaiValidationService(mockDataset.Object, mockEnv.Object);
            await service.TrainAndSaveAsync();

            var delai = await service.PredireAsync(montant: 10000000, validateurId: 1); // montant extrême, jamais vu

            Assert.True(delai >= 0, "Un délai prédit ne peut jamais être négatif");
        }

        [Fact]
        public async Task TrainAndSaveAsync_DoitRefuserSiTropPeuDeDonnees()
        {
            var mockDataset = new Mock<IValidationDatasetService>();
            mockDataset.Setup(s => s.GetDatasetAsync())
                       .ReturnsAsync((ConstruireDatasetControle().Take(2).ToList(), 0));

            var mockEnv = new Mock<IWebHostEnvironment>();
            mockEnv.Setup(e => e.ContentRootPath).Returns(_tempContentRoot);

            var service = new DelaiValidationService(mockDataset.Object, mockEnv.Object);

            await Assert.ThrowsAsync<InvalidOperationException>(() => service.TrainAndSaveAsync());
        }

        [Fact]
        public async Task PredireAsync_DoitEchouerSiAucunModeleEntraine()
        {
            var mockDataset = new Mock<IValidationDatasetService>();
            var mockEnv = new Mock<IWebHostEnvironment>();
            mockEnv.Setup(e => e.ContentRootPath).Returns(_tempContentRoot);

            var service = new DelaiValidationService(mockDataset.Object, mockEnv.Object);

            // Aucun /train appelé avant : doit échouer clairement, pas planter obscurément
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.PredireAsync(montant: 100000, validateurId: 1));
        }
    }
}
