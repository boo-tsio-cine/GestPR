using GestPR.Dtos;

namespace GestPR.Service.Demandes
{
    public interface IDemandeService
    {
        Task <IEnumerable<DemandeAvecArticleResponseDto>> GetByUserAsync(int DemandeurId);
        Task <DemandeAvecArticleResponseDto> GetByIdAsync(int id);
        Task<DemandeAvecArticleResponseDto> CreateAvecArticlesAsync(DemandeAvecArticleCreateDto dto);
    }
}
