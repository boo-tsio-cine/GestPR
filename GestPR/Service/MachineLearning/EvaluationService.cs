using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GestPR.Service.MachineLearning
{
    public class ResultatDetectionSynthetiqueDto
    {
        public double FacteurDeviation { get; set; } // ex: 1.5 = prix x1.5 par rapport au dernier prix reel
        public double TauxDetectionHeuristiquePourcent { get; set; }
        public double TauxDetectionMlPourcent { get; set; }
    }

    public class ResultatEvaluationDto
    {
        public int NbDesignationsEvaluees { get; set; }
        public int NbPointsEvaluesLeaveOneOut { get; set; }

        // Sur donnees reelles validees : plus bas = mieux (moins de fausses alertes)
        public double TauxFauxPositifsHeuristiquePourcent { get; set; }
        public double TauxFauxPositifsMlPourcent { get; set; }

        // Sur anomalies synthetiques injectees : plus haut = mieux (le modele detecte bien l'ecart)
        public List<ResultatDetectionSynthetiqueDto> DetectionParFacteurDeviation { get; set; } = new();

        // Table d'accord / desaccord entre les deux methodes (sur le leave-one-out)
        public int AccordNormal { get; set; }     // les deux disent "normal"
        public int AccordAnomalie { get; set; }   // les deux disent "anomalie"
        public int SeulHeuristiqueAlerte { get; set; }
        public int SeulMlAlerte { get; set; }
    }

 

    public class EvaluationService : IEvaluationService
    {
        // Doivent rester coherents avec les seuils utilises dans AnomalyDetectionService
        private const decimal SEUIL_ALERTE_HEURISTIQUE_POURCENT = 20m;
        private const double SEUIL_ALERTE_ML = 0.65;
        private const int NB_MINIMUM_POUR_ML = 5;

        private readonly IDatasetEntrainementService _datasetService;

        public EvaluationService(IDatasetEntrainementService datasetService)
        {
            _datasetService = datasetService;
        }

        public async Task<ResultatEvaluationDto> EvaluerAsync(double[]? facteursDeviation = null)
        {
            facteursDeviation ??= new[] { 1.3, 1.5, 2.0, 3.0 };

            var dataset = await _datasetService.ExtraireDatasetAsync(NB_MINIMUM_POUR_ML);
            var result = new ResultatEvaluationDto { NbDesignationsEvaluees = dataset.Count };

            int totalPoints = 0;
            int fauxPositifsHeuristique = 0;
            int fauxPositifsMl = 0;

            foreach (var groupe in dataset)
            {
                // Deja trie par date croissante par DatasetEntrainementService
                var prix = groupe.Prix.Select(p => (double)p.PrixDeRevient).ToList();

                for (int i = 0; i < prix.Count; i++)
                {
                    var pointTeste = prix[i];
                    var reste = prix.Where((_, idx) => idx != i).ToList();

                    // Pas assez de points restants pour entrainer proprement sans le point teste
                    if (reste.Count < NB_MINIMUM_POUR_ML - 1) continue;

                    totalPoints++;

                    // --- Heuristique : ecart vs le prix valide le plus recent parmi le reste ---
                    var dernierReste = reste.Last();
                    var ecartPourcent = dernierReste == 0 ? 0 : Math.Abs((pointTeste - dernierReste) / dernierReste) * 100;
                    bool alerteH = (decimal)ecartPourcent >= SEUIL_ALERTE_HEURISTIQUE_POURCENT;
                    if (alerteH) fauxPositifsHeuristique++;

                    // --- ML : entrainement sur le reste, score du point retire ---
                    var forest = new IsolationForest(reste);
                    var score = forest.ScoreAnomalie(pointTeste);
                    bool alerteM = score >= SEUIL_ALERTE_ML;
                    if (alerteM) fauxPositifsMl++;

                    if (alerteH && alerteM) result.AccordAnomalie++;
                    else if (!alerteH && !alerteM) result.AccordNormal++;
                    else if (alerteH) result.SeulHeuristiqueAlerte++;
                    else result.SeulMlAlerte++;
                }
            }

            result.NbPointsEvaluesLeaveOneOut = totalPoints;
            result.TauxFauxPositifsHeuristiquePourcent = totalPoints == 0 ? 0 : Math.Round(100.0 * fauxPositifsHeuristique / totalPoints, 2);
            result.TauxFauxPositifsMlPourcent = totalPoints == 0 ? 0 : Math.Round(100.0 * fauxPositifsMl / totalPoints, 2);

            // --- Detection sur anomalies synthetiques injectees ---
            foreach (var facteur in facteursDeviation)
            {
                int totalSynth = 0, detecteH = 0, detecteM = 0;

                foreach (var groupe in dataset)
                {
                    var prix = groupe.Prix.Select(p => (double)p.PrixDeRevient).ToList();
                    if (prix.Count < NB_MINIMUM_POUR_ML) continue;

                    var dernier = prix.Last();
                    var prixSynthetique = dernier * facteur;

                    totalSynth++;

                    var ecartPourcent = Math.Abs((prixSynthetique - dernier) / dernier) * 100;
                    if ((decimal)ecartPourcent >= SEUIL_ALERTE_HEURISTIQUE_POURCENT) detecteH++;

                    var forest = new IsolationForest(prix);
                    var score = forest.ScoreAnomalie(prixSynthetique);
                    if (score >= SEUIL_ALERTE_ML) detecteM++;
                }

                result.DetectionParFacteurDeviation.Add(new ResultatDetectionSynthetiqueDto
                {
                    FacteurDeviation = facteur,
                    TauxDetectionHeuristiquePourcent = totalSynth == 0 ? 0 : Math.Round(100.0 * detecteH / totalSynth, 2),
                    TauxDetectionMlPourcent = totalSynth == 0 ? 0 : Math.Round(100.0 * detecteM / totalSynth, 2)
                });
            }

            return result;
        }
    }
}