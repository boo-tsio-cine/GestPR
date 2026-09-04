using GestPR.Data;
using GestPR.Dtos;
using GestPR.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace GestPR.Service.MachineLearning
{
    public class ValidationDatasetService
    {
        private readonly AppDbContext _context;
        private readonly IMongoCollection<AuditLog> _auditCollection;

        public ValidationDatasetService(AppDbContext context, IMongoDatabase mongoDatabase, IOptions<MongoDbSetting> settings)
        {
            _context = context;
            _auditCollection = mongoDatabase.GetCollection<AuditLog>(settings.Value.CollectionName);
        }

        // Retourne le dataset exploitable, et le nombre de demandes écartées faute de trace d'audit
        public async Task<(List<ValidationDatasetRow> Dataset, int NbDemandesSansAuditTrail)> GetDatasetAsync()
        {
            // 1. Demandes ayant un montant calculable (au moins un article avec un prix valide)
            var demandes = await _context.Demande
                .Include(d => d.Articles)
                .Where(d => d.Articles.Any(a => a.PrixDeRevient > 0))
                .ToListAsync();

            var dataset = new List<ValidationDatasetRow>();
            int sansAuditTrail = 0;

            foreach (var demande in demandes)
            {
                // 2. Le log d'audit "Validation" le plus ancien pour cette demande
                //    (au cas où plusieurs événements existeraient, on prend le premier)
                var logValidation = await _auditCollection
                    .Find(l => l.DemandeId == demande.Id && l.Action == "Validation")
                    .SortBy(l => l.DateAction)
                    .FirstOrDefaultAsync();

                if (logValidation == null)
                {
                    sansAuditTrail++;
                    continue; // pas de trace exploitable pour cette demande
                }

                double montant = (double)demande.Articles.Sum(a => a.PrixDeRevient);
                double nbJours = (logValidation.DateAction - demande.DateTime).TotalDays;

                if (nbJours < 0) continue; // donnée incohérente (horloge, fuseau...), écartée par sécurité

                dataset.Add(new ValidationDatasetRow
                {
                    DemandeId = demande.Id,
                    Montant = montant,
                    ValidateurId = logValidation.UtilisateurId,
                    NbJours = Math.Round(nbJours, 2),
                    DateCreation = demande.DateTime,
                    DateValidation = logValidation.DateAction
                });
            }

            return (dataset, sansAuditTrail);
        }
    }
}
