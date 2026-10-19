using GestPR.Data;
using GestPR.Models;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace GestPR.Service
{
    // Services/DatasetExtractionService.cs
    public class DatasetEntry
    {
        public string CodeArticle { get; set; }
        public string CodeLot { get; set; }
        public string Designation { get; set; }
        public decimal PrixDeRevient { get; set; }
        public DateTime DateValidation { get; set; }   // ← DateOnly au lieu de DateTime
    }

    public class DatasetExtractionResult
    {
        public int ArticlesEligibles { get; set; }
        public int LignesBrutes { get; set; }
        public int LignesApresNettoyage { get; set; }
        public int ArticlesExclusHistoriqueInsuffisant { get; set; }
        public string CheminFichier { get; set; }
    }

    public class DatasetExtractionService
    {
        private readonly AppDbContext _context;
        private const int SEUIL_MIN_HISTORIQUE = 5;

        public DatasetExtractionService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DatasetExtractionResult> ExtraireEtNettoyerAsync()
        {
            // 1) Extraction : uniquement les demandes validées
            var donneesBrutes = await _context.Article
                 .Join(_context.Demande,
                     article => article.DemandeId,
                     demande => demande.Id,
                     (article, demande) => new { article, demande })
                 .Where(x => x.demande.Status == "Validée"
                          && x.demande.DateValidation != null)
                 .Select(x => new DatasetEntry
                 {
                     CodeArticle = x.article.CodeArticle,
                     CodeLot = x.article.CodeLot,
                     Designation = x.article.Designation,
                     PrixDeRevient = x.article.PrixDeRevient,
                     DateValidation = x.demande.DateValidation!.Value
                 })
                 .ToListAsync();

            int lignesBrutes = donneesBrutes.Count;
            // 2) Nettoyage
            var nettoyees = donneesBrutes
                .Where(d => d.PrixDeRevient > 0)                 // prix nul/négatif exclu
                .GroupBy(d => new { d.CodeArticle, d.DateValidation, d.PrixDeRevient })
                .Select(g => g.First())                          // dédoublonnage
                .OrderBy(d => d.DateValidation)
                .ToList();

            // 3) Regroupement par article + filtre historique minimum
            var parArticle = nettoyees
                .GroupBy(d => d.CodeArticle)
                .ToList();

            var articlesEligibles = parArticle
                .Where(g => g.Count() >= SEUIL_MIN_HISTORIQUE)
                .ToList();

            int exclus = parArticle.Count - articlesEligibles.Count;

            var datasetFinal = articlesEligibles.SelectMany(g => g).ToList();

            // 4) Export CSV
            string chemin = await ExporterCsvAsync(datasetFinal);

            return new DatasetExtractionResult
            {
                ArticlesEligibles = articlesEligibles.Count,
                LignesBrutes = lignesBrutes,
                LignesApresNettoyage = datasetFinal.Count,
                ArticlesExclusHistoriqueInsuffisant = exclus,
                CheminFichier = chemin
            };
        }

        private async Task<string> ExporterCsvAsync(List<DatasetEntry> dataset)
        {
            string nomFichier = $"dataset_entrainement_{DateTime.Now:yyyy-MM-dd}.csv";
            string chemin = Path.Combine("Data", "Datasets", nomFichier);
            Directory.CreateDirectory(Path.GetDirectoryName(chemin)!);

            var sb = new StringBuilder();
            sb.AppendLine("CodeArticle;CodeLot;Designation;PrixDeRevient;DateValidation");
            foreach (var d in dataset)
            {
                sb.AppendLine($"{d.CodeArticle};{d.CodeLot};{d.Designation};{d.PrixDeRevient};{d.DateValidation:yyyy-MM-dd}");
            }

            await File.WriteAllTextAsync(chemin, sb.ToString());
            return chemin;
        }
    }
}
