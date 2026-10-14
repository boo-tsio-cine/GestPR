using System.Threading.Tasks;

namespace GestPR.Service.MachineLearning
{
    public interface IEstimationDelaiService
    {
        // Delai attendu (en jours) pour une demande de ce montant, moyenne sur
        // tous les validateurs actifs (aucun n'est assigne a l'avance - file partagee).
        // Retourne null si le modele n'est pas encore entraine ou s'il n'y a aucun validateur.
        Task<double?> EstimerDelaiPourMontantAsync(decimal montant);
    }
}