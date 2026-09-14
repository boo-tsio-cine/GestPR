using GestPR.Dtos;
using GestPR.Service.Demandes;
using GestPR.Service.MachineLearning;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GestPR.Service.Anomalies
{
    public class AnomalyDetectionService : IAnomalyDetectionService
    {
        // Ancienne heuristique (conservee pour comparaison dans le chapitre resultats du memoire)
        private const decimal SEUIL_ALERTE_HEURISTIQUE_POURCENT = 20m;

        // Seuil ML : a calibrer avec de vraies donnees une fois le dataset disponible
        private const double SEUIL_ALERTE_ML = 0.65;

        // Doit rester coherent avec le seuil utilise par DatasetEntrainementService
        private const int NB_MINIMUM_POUR_ML = 2;

        private const string CACHE_KEY_DATASET = "ml_dataset_designations";
        private static readonly TimeSpan DUREE_CACHE = TimeSpan.FromMinutes(15);

        private readonly IDemandeService _demandeService;
        private readonly IDatasetEntrainementService _datasetService;
        private readonly IMemoryCache _cache;

        public AnomalyDetectionService(
            IDemandeService demandeService,
            IDatasetEntrainementService datasetService,
            IMemoryCache cache)
        {
            _demandeService = demandeService;
            _datasetService = datasetService;
            _cache = cache;
        }

        public async Task<AnomalyResultDto> AnalyserPrixAsync(string designation, string? codeLot, decimal prixDeRevient)
        {
            // 1. Heuristique existante (ecart vs dernier prix connu)
            var result = await CalculerHeuristiqueAsync(designation, prixDeRevient);

            // 2. Score Isolation Forest (ML), quand assez d'historique valide est disponible
            await CompleterAvecScoreMlAsync(result, designation, prixDeRevient);

            return result;
        }

        private async Task<AnomalyResultDto> CalculerHeuristiqueAsync(string designation, decimal prixDeRevient)
        {
            var brutHistorique = await _demandeService.GetHistoriqueByDesignationAsync(designation);

            var historique = brutHistorique
                .Cast<HistoriqueArticleDto>()
                .Where(h => h.PrixDeRevient > 0)
                .OrderByDescending(h => h.Date)
                .ToList();

            var result = new AnomalyResultDto
            {
                NbOccurrencesHistorique = historique.Count
            };

            if (historique.Count == 0)
            {
                result.Message = $"Aucun historique trouvé pour « {designation} ». Ce sera le premier prix enregistré pour cet article.";
                return result;
            }

            var dernier = historique.First();
            var moyenne = historique.Average(h => h.PrixDeRevient);

            result.DernierPrixConnu = dernier.PrixDeRevient;
            result.DateDernierPrix = dernier.Date;
            result.PrixMoyenHistorique = Math.Round(moyenne, 2);

            var ecartPourcent = dernier.PrixDeRevient == 0
                ? 0
                : Math.Round(((prixDeRevient - dernier.PrixDeRevient) / dernier.PrixDeRevient) * 100m, 2);

            result.EcartVsDernierPrixPourcent = ecartPourcent;
            result.AlerteEcartRecent = Math.Abs(ecartPourcent) >= SEUIL_ALERTE_HEURISTIQUE_POURCENT;

            return result;
        }

        private async Task CompleterAvecScoreMlAsync(AnomalyResultDto result, string designation, decimal prixDeRevient)
        {
            var dataset = await ObtenirDatasetEnCacheAsync();

            var groupe = dataset.FirstOrDefault(d =>
                string.Equals(d.Designation, designation.Trim(), StringComparison.OrdinalIgnoreCase));

            if (groupe == null)
            {
                // Designation absente du dataset d'entrainement (< NB_MINIMUM_POUR_ML prix valides)
                // -> pas de score ML calcule, le badge front n'affichera rien de ce cote.
                result.Message = string.IsNullOrEmpty(result.Message)
                    ? $"Historique insuffisant pour une analyse ML (moins de {NB_MINIMUM_POUR_ML} prix validés). Consultez l'historique manuel."
                    : result.Message;
                return;
            }

            var valeurs = groupe.Prix.Select(p => (double)p.PrixDeRevient).ToList();
            var forest = new IsolationForest(valeurs);
            var score = forest.ScoreAnomalie((double)prixDeRevient);

            result.ScoreAnomalieMl = Math.Round(score, 4);
            result.AlerteAnomalieMl = score >= SEUIL_ALERTE_ML;

            result.Message = result.AlerteAnomalieMl
                ? $"Le modèle ML détecte ce prix comme atypique (score {result.ScoreAnomalieMl:P0}) par rapport à {groupe.Prix.Count} prix validés historiques."
                : $"Prix cohérent avec l'historique selon le modèle ML (score {result.ScoreAnomalieMl:P0}) sur {groupe.Prix.Count} prix validés.";
        }

        private async Task<List<DesignationDataset>> ObtenirDatasetEnCacheAsync()
        {
            if (_cache.TryGetValue(CACHE_KEY_DATASET, out List<DesignationDataset>? dataset) && dataset != null)
                return dataset;

            dataset = await _datasetService.ExtraireDatasetAsync(NB_MINIMUM_POUR_ML);
            _cache.Set(CACHE_KEY_DATASET, dataset, DUREE_CACHE);
            return dataset;
        }
    }
}