using GestPR.Repository.Demandes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GestPR.Service.MachineLearning
{
    public class EstimationDelaiService : IEstimationDelaiService
    {
        private readonly DelaiValidationService _delaiService;
        private readonly IDemandeRepository _demandeRepo;

        public EstimationDelaiService(DelaiValidationService delaiService, IDemandeRepository demandeRepo)
        {
            _delaiService = delaiService;
            _demandeRepo = demandeRepo;
        }

        public async Task<double?> EstimerDelaiPourMontantAsync(decimal montant)
        {
            // Aucun validateur n'est assigne a l'avance (file partagee, premier
            // arrive premier traite) : on moyenne la prediction sur tous les
            // validateurs actifs pour donner une estimation realiste.
            var validateurs = await _demandeRepo.GetUsersByRoleAsync("Validateur");
            if (validateurs == null || !validateurs.Any())
                return null;

            var predictions = new List<double>();

            foreach (var validateur in validateurs)
            {
                try
                {
                    var prediction = await _delaiService.PredireAsync((double)montant, validateur.Id);
                    predictions.Add(prediction);
                }
                catch (InvalidOperationException)
                {
                    // Modele pas encore entraine (pas assez de demandes tranchees) :
                    // aucune estimation fiable possible pour l'instant.
                    return null;
                }
            }

            return predictions.Count > 0 ? predictions.Average() : null;
        }
    }
}