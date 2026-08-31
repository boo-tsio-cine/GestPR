using GestPR.Data;
using GestPR.Dtos;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Service.MachineLearning
{
    public class AchatDatasetService
    {
        private readonly AppDbContext _context;


        public AchatDatasetService(AppDbContext context)
        {
            _context = context;
        }

        // Ligne brute extraite de la base, avant nettoyage/enrichissement
        private class AchatBrut
        {
            public int ArticleId { get; set; }
            public string CodeLot { get; set; } = "";
            public string Designation { get; set; } = "";
            public decimal PrixDeRevient { get; set; }
            public int DemandeId { get; set; }
            public DateTime DateTime { get; set; }
            public string Status { get; set; } = "";
            public int DemandeurId { get; set; }
        }


        // Extraction (jointure Article + Demande) + nettoyage, réutilisé par toutes les vues du dataset
        // (par désignation, par CodeLot, futurs regroupements...) pour ne jamais dupliquer cette logique.
        private async Task<List<AchatBrut>> GetNettoyeAsync()
        {
            // 1. EXTRACTION : jointure Article + Demande
            var brut = await _context.Article
                .Join(_context.Demande,
                    a => a.DemandeId,
                    d => d.Id,
                    (a, d) => new AchatBrut
                    {
                        ArticleId = a.Id,
                        CodeLot = a.CodeLot,
                        Designation = a.Designation,
                        PrixDeRevient = a.PrixDeRevient,
                        DemandeId = d.Id,
                        DateTime = d.DateTime,
                        Status = d.Status,
                        DemandeurId = d.DemandeurId
                    }
                )
                .ToListAsync();

            // 2. NETTOYAGE : trim + exclusion des lignes clairement invalides (prix à 0)
            return brut
               .Select(x => new AchatBrut
               {
                   ArticleId = x.ArticleId,
                   CodeLot = x.CodeLot.Trim(),
                   Designation = x.Designation.Trim(),
                   PrixDeRevient = x.PrixDeRevient,
                   DemandeId = x.DemandeId,
                   DateTime = x.DateTime,
                   Status = x.Status,
                   DemandeurId = x.DemandeurId
               })
               .Where(x => x.PrixDeRevient > 0) // exclut les lignes à prix 0 (saisies incomplètes/invalides)
               .ToList();
        }


        // Vue "par désignation" : utilisée pour l'export CSV et l'entraînement ML.NET
        public async Task<List<AchatDatasetRow>> GetDatasetAsync()
        {
            // 1. EXTRACTION : jointure Article + Demande
            var brut = await _context.Article
                .Join(_context.Demande,
                    a => a.DemandeId,
                    d => d.Id,
                    (a, d) => new AchatBrut
                    {
                        ArticleId = a.Id,
                        CodeLot = a.CodeLot,
                        Designation = a.Designation,
                        PrixDeRevient = a.PrixDeRevient,
                        DemandeId = d.Id,
                        DateTime = d.DateTime,
                        Status = d.Status,
                        DemandeurId = d.DemandeurId
                    })
                .ToListAsync();

            // 2. NETTOYAGE : trim + exclusion des lignes clairement invalides (prix à 0)
            var nettoye = brut
                .Select(x => new AchatBrut
                {
                    ArticleId = x.ArticleId,
                    CodeLot = x.CodeLot.Trim(),
                    Designation = x.Designation.Trim(),
                    PrixDeRevient = x.PrixDeRevient,
                    DemandeId = x.DemandeId,
                    DateTime = x.DateTime,
                    Status = x.Status,
                    DemandeurId = x.DemandeurId
                })
                .Where(x => x.PrixDeRevient > 0) // exclut les lignes à prix 0 (saisies incomplètes/invalides)
                .ToList();

            // 3. STRUCTURATION : statistiques par désignation (moyenne, écart-type)
            var statsParDesignation = nettoye
                .GroupBy(x => x.Designation, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.Key,
                    g =>
                    {
                        var prix = g.Select(x => (double)x.PrixDeRevient).ToList();
                        double moyenne = prix.Average();
                        double variance = prix.Count > 1
                            ? prix.Sum(p => Math.Pow(p - moyenne, 2)) / (prix.Count - 1)
                            : 0;
                        double ecartType = Math.Sqrt(variance);
                        return (Count: prix.Count, Moyenne: moyenne, EcartType: ecartType);
                    },
                    StringComparer.OrdinalIgnoreCase);

            // 4. ENRICHISSEMENT + marquage transparent des données suspectes (test/placeholder)
            var dataset = nettoye.Select(x =>
            {
                var stats = statsParDesignation[x.Designation];
                double prixDouble = (double)x.PrixDeRevient;

                double zScore = stats.EcartType > 0
                    ? (prixDouble - stats.Moyenne) / stats.EcartType
                    : 0; // pas assez de variance pour calculer un Z-score (ex: 1 seule occurrence)

                bool suspect =
                    string.Equals(x.Designation, "string", StringComparison.OrdinalIgnoreCase) ||
                    x.Designation.All(c => c == x.Designation[0]) || // ex: "XXXXXXXX"
                    x.CodeLot.Contains("TEST", StringComparison.OrdinalIgnoreCase);

                return new AchatDatasetRow
                {
                    ArticleId = x.ArticleId,
                    CodeLot = x.CodeLot,
                    Designation = x.Designation,
                    PrixDeRevient = x.PrixDeRevient,
                    LogPrixDeRevient = Math.Log(prixDouble + 1),
                    DateTime = x.DateTime,
                    Status = x.Status,
                    DemandeurId = x.DemandeurId,
                    NbOccurrencesDesignation = stats.Count,
                    MoyenneDesignation = Math.Round(stats.Moyenne, 4),
                    EcartTypeDesignation = Math.Round(stats.EcartType, 4),
                    ZScoreDesignation = Math.Round(zScore, 4),
                    IsLikelyTestData = suspect
                };
            })
            .OrderBy(x => x.Designation)
            .ThenBy(x => x.DateTime)
            .ToList();

            return dataset;

        }


        // Vue "par CodeLot" : alerte simple et directement explicable — si un même CodeLot
        // a des prix très différents d'une ligne à l'autre, c'est suspect (double saisie, erreur, fraude...).
        // Ne nécessite PAS le modèle ML.NET : une règle statistique directe suffit ici.
        public async Task<List<Ecartcodelotdto>> GetEcartsCodeLotAsync(double seuilPourcentAlerte = 20)
        {
            var nettoye = await GetNettoyeAsync();

            var resultats = nettoye
                .GroupBy(x => x.CodeLot, StringComparer.OrdinalIgnoreCase)
                .Where(g => g.Count() > 1) // un écart n'a de sens que s'il y a au moins 2 occurrences
                .Select(g =>
                {
                    var prix = g.Select(x => (double)x.PrixDeRevient).ToList();
                    double moyenne = prix.Average();
                    decimal min = g.Min(x => x.PrixDeRevient);
                    decimal max = g.Max(x => x.PrixDeRevient);

                    double ecartPourcent = moyenne > 0
                        ? ((double)(max - min) / moyenne) * 100
                        : 0;

                    return new Ecartcodelotdto
                    {
                        CodeLot = g.Key,
                        NbOccurrences = g.Count(),
                        PrixMin = min,
                        PrixMax = max,
                        PrixMoyen = Math.Round(moyenne, 4),
                        EcartPourcent = Math.Round(ecartPourcent, 2),
                        AlerteEcart = ecartPourcent > seuilPourcentAlerte,
                        Articles = g.Select(x => new ArticleEcartDto
                        {
                            Id = x.ArticleId,
                            Designation = x.Designation,
                            PrixDeRevient = x.PrixDeRevient,
                            EcartParRapportMoyennePourcent = moyenne > 0
                                ? Math.Round(((double)x.PrixDeRevient - moyenne) / moyenne * 100, 2)
                                : 0
                        }).ToList()
                    };
                })
                .OrderByDescending(x => x.EcartPourcent)
                .ToList();

            return resultats;
        }
        // Statistiques d'une seule désignation, isolément — utilisé pour analyser une nouvelle
        // ligne d'achat pas encore enregistrée en base (comparaison à l'historique existant)
        public async Task<(int Count, double Moyenne, double EcartType)> GetStatsDesignationAsync(string designation)
        {
            var nettoye = await GetNettoyeAsync();
            var groupe = nettoye
                .Where(x => string.Equals(x.Designation, designation.Trim(), StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (groupe.Count == 0) return (0, 0, 0);

            var prix = groupe.Select(x => (double)x.PrixDeRevient).ToList();
            double moyenne = prix.Average();
            double variance = prix.Count > 1
                ? prix.Sum(p => Math.Pow(p - moyenne, 2)) / (prix.Count - 1)
                : 0;
            double ecartType = Math.Sqrt(variance);
            return (prix.Count, moyenne, ecartType);
        }

        // Le prix le plus RÉCENT enregistré pour cette désignation — plus facile à comprendre
        // pour un utilisateur métier qu'une moyenne statistique ("pourquoi c'est différent de la moyenne ?").
        public async Task<(DateTime? Date, decimal? Prix)> GetDernierPrixDesignationAsync(string designation)
        {
            var nettoye = await GetNettoyeAsync();
            var dernier = nettoye
                .Where(x => string.Equals(x.Designation, designation.Trim(), StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(x => x.DateTime)
                .FirstOrDefault();

            return dernier == null ? (null, null) : (dernier.DateTime, dernier.PrixDeRevient);
        }

    }
}
