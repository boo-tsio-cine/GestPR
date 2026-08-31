using GestPR.Dtos;
using Microsoft.ML;
using Microsoft.ML.Data;

namespace GestPR.Service.MachineLearning
{
    // Ligne d'entrée du modèle : uniquement les features numériques utilisées pour l'entraînement.
    // Volontairement séparée de AchatDatasetRow (qui contient aussi les métadonnées ArticleId/Designation)
    // car ML.NET travaille sur des colonnes de features propres, sans "bruit" métier.
    public class AchatModelInput
    {
        public float LogPrixDeRevient { get; set; }
        public float ZScoreDesignation { get; set; }
        public float NbOccurrencesDesignation { get; set; }
    }

    // Sortie du modèle pour une ligne donnée
    public class AchatAnomalyPrediction
    {
        [ColumnName("PredictedLabel")]
        public bool EstAnomalie { get; set; }

        [ColumnName("Score")]
        public float ScoreAnomalie { get; set; } // erreur de reconstruction PCA : plus c'est élevé, plus c'est anormal
    }

    // Ligne enrichie renvoyée à l'API : la prédiction + les métadonnées métier pour l'affichage
    public class AchatAnomalieResultat
    {
        public int ArticleId { get; set; }
        public string CodeLot { get; set; } = "";
        public string Designation { get; set; } = "";
        public decimal PrixDeRevient { get; set; }
        public double ZScoreDesignation { get; set; }
        public bool EstAnomalie { get; set; }
        public float ScoreAnomalie { get; set; }
        public bool IsLikelyTestData { get; set; }
    }

    public class AnomalyDetectionService
    {
        private readonly AchatDatasetService _datasetService;
        private readonly MLContext _mlContext;
        private readonly string _modelPath;

        public AnomalyDetectionService(AchatDatasetService datasetService, IWebHostEnvironment env)
        {
            _datasetService = datasetService;
            _mlContext = new MLContext(seed: 1); // seed fixe : résultats reproductibles pour la démo

            // Dossier persistant pour le modèle entraîné (créé si absent)
            var modelsDir = Path.Combine(env.ContentRootPath, "MLModels");
            Directory.CreateDirectory(modelsDir);
            _modelPath = Path.Combine(modelsDir, "anomaly_model.zip");
        }

        // Entraîne le modèle sur le dataset actuel et le sauvegarde sur disque.
        // excludeTestData=true : n'entraîne que sur les données jugées réelles (recommandé),
        // avec repli automatique sur tout le dataset si l'échantillon réel est trop petit.
        public async Task<(int nbLignesUtilisees, bool aExcluDonneesTest, string modelPath)> TrainAndSaveAsync(bool excludeTestData = true)
        {
            var dataset = await _datasetService.GetDatasetAsync();

            var donneesEntrainement = excludeTestData
                ? dataset.Where(x => !x.IsLikelyTestData).ToList()
                : dataset;

            bool aExclu = excludeTestData && donneesEntrainement.Count < dataset.Count;

            // Repli : si trop peu de données réelles restent, on entraîne sur tout le dataset
            // (mieux vaut un modèle imparfait que pas de modèle du tout, tant que le vrai volume grandit)
            const int minimumLignesRequises = 4; // RandomizedPCA a besoin d'au moins quelques exemples
            if (donneesEntrainement.Count < minimumLignesRequises)
            {
                donneesEntrainement = dataset;
                aExclu = false;
            }

            if (donneesEntrainement.Count < minimumLignesRequises)
            {
                throw new InvalidOperationException(
                    $"Pas assez de données pour entraîner un modèle (minimum {minimumLignesRequises}, disponible {donneesEntrainement.Count}).");
            }

            var inputs = donneesEntrainement.Select(x => new AchatModelInput
            {
                LogPrixDeRevient = (float)x.LogPrixDeRevient,
                ZScoreDesignation = (float)x.ZScoreDesignation,
                NbOccurrencesDesignation = x.NbOccurrencesDesignation
            }).ToList();

            IDataView trainingData = _mlContext.Data.LoadFromEnumerable(inputs);

            var pipeline = _mlContext.Transforms
                .Concatenate("Features", nameof(AchatModelInput.LogPrixDeRevient),
                                          nameof(AchatModelInput.ZScoreDesignation),
                                          nameof(AchatModelInput.NbOccurrencesDesignation))
                // Normalisation indispensable : sans ça, LogPrixDeRevient (échelle ~10-17) écrase
                // complètement ZScoreDesignation (échelle ~-1 à 1) dans le calcul du PCA.
                .Append(_mlContext.Transforms.NormalizeMeanVariance("Features"))
                .Append(_mlContext.AnomalyDetection.Trainers.RandomizedPca(featureColumnName: "Features", rank: 2));

            var model = pipeline.Fit(trainingData);

            _mlContext.Model.Save(model, trainingData.Schema, _modelPath);

            return (donneesEntrainement.Count, aExclu, _modelPath);
        }

        // Charge le modèle sauvegardé et score l'ensemble du dataset actuel (y compris les données de test, marquées comme telles)
        public async Task<List<AchatAnomalieResultat>> DetectAsync()
        {
            if (!File.Exists(_modelPath))
            {
                throw new InvalidOperationException("Aucun modèle entraîné trouvé. Appelez /train d'abord.");
            }

            var dataset = await _datasetService.GetDatasetAsync();

            ITransformer model = _mlContext.Model.Load(_modelPath, out _);
            var predictionEngine = _mlContext.Model.CreatePredictionEngine<AchatModelInput, AchatAnomalyPrediction>(model);

            var resultats = dataset.Select(x =>
            {
                var input = new AchatModelInput
                {
                    LogPrixDeRevient = (float)x.LogPrixDeRevient,
                    ZScoreDesignation = (float)x.ZScoreDesignation,
                    NbOccurrencesDesignation = x.NbOccurrencesDesignation
                };

                var prediction = predictionEngine.Predict(input);

                return new AchatAnomalieResultat
                {
                    ArticleId = x.ArticleId,
                    CodeLot = x.CodeLot,
                    Designation = x.Designation,
                    PrixDeRevient = x.PrixDeRevient,
                    ZScoreDesignation = x.ZScoreDesignation,
                    EstAnomalie = prediction.EstAnomalie,
                    ScoreAnomalie = prediction.ScoreAnomalie,
                    IsLikelyTestData = x.IsLikelyTestData
                };
            })
            .OrderByDescending(x => x.ScoreAnomalie)
            .ToList();

            return resultats;
        }

        // Analyse une SEULE ligne d'achat (pas encore enregistrée en base) et retourne
        // un verdict immédiat, en la comparant à l'historique existant de sa désignation.
        public async Task<AnalysePrixResponseDto> AnalyserPrixAsync(string designation, string codeLot, decimal prixDeRevient, double seuilPourcentAlerte = 20)
        {
            if (!File.Exists(_modelPath))
            {
                throw new InvalidOperationException("Aucun modèle entraîné trouvé. Appelez /train d'abord.");
            }

            if (prixDeRevient <= 0)
            {
                throw new ArgumentException("Le prix de revient doit être supérieur à 0.");
            }

            var stats = await _datasetService.GetStatsDesignationAsync(designation);
            var (dateDernier, dernierPrix) = await _datasetService.GetDernierPrixDesignationAsync(designation);

            double prixDouble = (double)prixDeRevient;
            double logPrix = Math.Log(prixDouble + 1);

            double zScore = stats.EcartType > 0
                ? (prixDouble - stats.Moyenne) / stats.EcartType
                : 0;

            var input = new AchatModelInput
            {
                LogPrixDeRevient = (float)logPrix,
                ZScoreDesignation = (float)zScore,
                NbOccurrencesDesignation = stats.Count
            };

            ITransformer model = _mlContext.Model.Load(_modelPath, out _);
            var predictionEngine = _mlContext.Model.CreatePredictionEngine<AchatModelInput, AchatAnomalyPrediction>(model);
            var prediction = predictionEngine.Predict(input);
            bool estAnomalieML = stats.Count > 0 && prediction.EstAnomalie;

            // Comparaison directe au dernier prix connu — le critère principal et transparent,
            // celui qu'on met en avant auprès des utilisateurs métier.
            double? ecartPourcent = null;
            bool alerteEcartRecent = false;
            if (dernierPrix.HasValue && dernierPrix.Value > 0)
            {
                ecartPourcent = Math.Round(((double)(prixDeRevient - dernierPrix.Value) / (double)dernierPrix.Value) * 100, 2);
                alerteEcartRecent = Math.Abs(ecartPourcent.Value) > seuilPourcentAlerte;
            }

            string message;
            if (stats.Count == 0)
            {
                message = "Aucun historique pour cette désignation : impossible de comparer, prudence recommandée.";
            }
            else if (alerteEcartRecent)
            {
                message = $"⚠️ Ce prix diffère de {ecartPourcent:+0.##;-0.##}% par rapport au dernier prix enregistré " +
                           $"({dernierPrix:N0} Ar, saisi le {dateDernier:dd/MM/yyyy}).";
            }
            else
            {
                message = $"Prix cohérent avec le dernier enregistré ({dernierPrix:N0} Ar du {dateDernier:dd/MM/yyyy}), écart de {ecartPourcent:+0.##;-0.##}%.";
            }

            return new AnalysePrixResponseDto
            {
                Designation = designation,
                CodeLot = codeLot,
                PrixDeRevient = prixDeRevient,
                NbOccurrencesHistorique = stats.Count,
                MoyenneHistorique = Math.Round(stats.Moyenne, 4),
                ZScoreDesignation = Math.Round(zScore, 4),
                ScoreAnomalie = prediction.ScoreAnomalie,
                EstAnomalie = estAnomalieML,
                DernierPrixConnu = dernierPrix,
                DateDernierPrix = dateDernier,
                EcartVsDernierPrixPourcent = ecartPourcent,
                AlerteEcartRecent = alerteEcartRecent,
                Message = message
            };
        }
    }
}