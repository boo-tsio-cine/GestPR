using GestPR.Models;

namespace GestPR.Repository.Demandes
{
    public interface IDemandeRepository
    {
        Task<IEnumerable<Demande>> GetByUserAsync(int DemandeurId);
        Task<Demande?> GetByIdAsync(int id);
        Task<Demande> CreateAvecArticleAsync(
                Demande demande, List<Article> articles
            );

        Task<bool> UserExistsAsync(int userId);
    }
}
