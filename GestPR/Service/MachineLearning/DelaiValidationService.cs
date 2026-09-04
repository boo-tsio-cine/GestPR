using GestPR.Dtos;
using Microsoft.ML;
using Microsoft.ML.Data;

namespace GestPR.Service.MachineLearning
{
    // Ligne d'entrée du modèle de régression
    public class DelaiModelInput
    {
        public float Montant { get; set; }

        // Traité comme une variable catégorielle (chaque valideur a ses propres habitudes de délai),
        // pas comme un nombre continu — un ValidateurId 12 n'est pas "2x plus" que 6.
        public string ValidateurId { get; set; } = "";

        // Label à prédire
        public float NbJours { get; set; }
    }

    public class DelaiPrediction
    {
        [ColumnName("Score")]
        public float NbJoursPredits { get; set; }
    }

    public class DelaiValidationService
    {
        private readonly ValidationDatasetService _datasetService;
        private readonly MLContext _mlContext;
        private readonly string _modelPath;

        public DelaiValidationService(ValidationDatasetService datasetService, IWebHostEnvironment env)
        {
            _datasetService = datasetService;
            _mlContext = new MLContext(seed: 1);

            var modelsDir = Path.Combine(env.ContentRootPath, "MLModels");
            Directory.CreateDirectory(modelsDir);
            _modelPath = Path.Combine(modelsDir, "delai_validation_model.zip");
        }

        public async Task<(int nbLignesUtilisees, int nbDemandesSansAuditTrail, string modelPath)> TrainAndSaveAsync()
        {
            var (dataset, sansAuditTrail) = await _datasetService.GetDatasetAsync();

            const int minimumLignesRequises = 5;
            if (dataset.Count < minimumLignesRequises)
            {
                throw new InvalidOperationException(
                    $"Pas assez de demandes validées avec trace d'audit pour entraîner un modèle " +
                    $"(minimum {minimumLignesRequises}, disponible {dataset.Count}, " +
                    $"{sansAuditTrail} demande(s) écartée(s) faute de log de validation).");
            }

            var inputs = dataset.Select(x => new DelaiModelInput
            {
                Montant = (float)x.Montant,
                ValidateurId = x.ValidateurId.ToString(),
                NbJours = (float)x.NbJours
            }).ToList();

            IDataView trainingData = _mlContext.Data.LoadFromEnumerable(inputs);

            var pipeline = _mlContext.Transforms.Categorical.OneHotEncoding("ValidateurEncoded", nameof(DelaiModelInput.ValidateurId))
                .Append(_mlContext.Transforms.Concatenate("Features", nameof(DelaiModelInput.Montant), "ValidateurEncoded"))
                .Append(_mlContext.Regression.Trainers.Sdca(labelColumnName: nameof(DelaiModelInput.NbJours), featureColumnName: "Features"));

            var model = pipeline.Fit(trainingData);

            _mlContext.Model.Save(model, trainingData.Schema, _modelPath);

            return (dataset.Count, sansAuditTrail, _modelPath);
        }

        public async Task<float> PredireAsync(double montant, int validateurId)
        {
            if (!File.Exists(_modelPath))
            {
                throw new InvalidOperationException("Aucun modèle entraîné trouvé. Appelez /train d'abord.");
            }

            ITransformer model = _mlContext.Model.Load(_modelPath, out _);
            var predictionEngine = _mlContext.Model.CreatePredictionEngine<DelaiModelInput, DelaiPrediction>(model);

            var input = new DelaiModelInput
            {
                Montant = (float)montant,
                ValidateurId = validateurId.ToString()
            };

            var prediction = predictionEngine.Predict(input);

            // Un délai prédit ne peut pas être négatif
            return Math.Max(0, prediction.NbJoursPredits);
        }
    }
}
