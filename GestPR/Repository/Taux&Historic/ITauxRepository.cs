using GestPR.Models;

namespace GestPR.Repository.Taux_Historic
{
    public interface ITauxRepository
    {
        Task<IEnumerable<Taux>> GetAllTauxAsync();
        Task<Taux?> GetTauxByIdAsync(int id);
        Task<Taux?> CreateAsync(Taux taux);
        Task<Taux> UpdateAvecHistoriqueAsync(Taux taux, TauxHistorique historique);
        Task<int> GetTotalTauxCountAsync();

        Task DeleteAsync(int id);
        
    
    }
}
