using GestPR.Data;
using GestPR.Dtos;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Service.MachineLearning
{
    public class ValidationDatasetService : IValidationDatasetService
    {
        private readonly AppDbContext _context;

        public ValidationDatasetService(AppDbContext context)
        {
            _context = context;
        }

        // Retourne le dataset exploitable, et le nombre de demandes ecartees
        // (montant calculable mais pas encore completement tranchees :
        // ValidateurId / DateTransmissionValidation / DateValidation manquants).
        //
        // Avant : ce service interrogeait MongoDB (une requete par demande) et
        // mesurait le delai depuis la creation de la demande par le demandeur,
        // ce qui incluait aussi le temps de traitement du comptable.
        // Desormais : tout vient de SQL (ValidateurId/DateTransmissionValidation/
        // DateValidation ajoutes sur Demande), et on mesure uniquement le temps
        // reellement passe en attente de decision du validateur.
        public async Task<(List<ValidationDatasetRow> Dataset, int NbDemandesSansAuditTrail)> GetDatasetAsync()
        {
            // 1. Demandes ayant un montant calculable (au moins un article avec un prix valide)
            var demandes = await _context.Demande
                .Include(d => d.Articles)
                .Where(d => d.Articles.Any(a => a.PrixDeRevient > 0))
                .ToListAsync();

            var dataset = new List<ValidationDatasetRow>();
            int sansHistoriqueExploitable = 0;

            foreach (var demande in demandes)
            {
                if (demande.ValidateurId == null
                    || demande.DateTransmissionValidation == null
                    || demande.DateValidation == null)
                {
                    sansHistoriqueExploitable++;
                    continue; // pas encore tranchee, ou donnee incomplete
                }

                double montant = (double)demande.Articles.Sum(a => a.PrixDeRevient);
                double nbJours = (demande.DateValidation.Value - demande.DateTransmissionValidation.Value).TotalDays;

                if (nbJours < 0) continue; // donnee incoherente (horloge, fuseau...), ecartee par securite

                dataset.Add(new ValidationDatasetRow
                {
                    DemandeId = demande.Id,
                    Montant = montant,
                    ValidateurId = demande.ValidateurId.Value,
                    NbJours = Math.Round(nbJours, 2),
                    DateCreation = demande.DateTime,
                    DateValidation = demande.DateValidation.Value
                });
            }

            return (dataset, sansHistoriqueExploitable);
        }
    }
}