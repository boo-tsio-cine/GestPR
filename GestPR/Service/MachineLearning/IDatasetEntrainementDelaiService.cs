using GestPR.Dtos;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GestPR.Service.MachineLearning
{
    public interface IDatasetEntrainementDelaiService
    {
        // Extrait {Montant, ValidateurId, DelaiJours} pour toutes les demandes
        // deja tranchees (ValidateurId + les deux dates renseignees).
        Task<List<DelaiEntrainementDto>> ExtraireDatasetAsync();
    }
}
