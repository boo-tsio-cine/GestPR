using GestPR.Dtos;
using GestPR.Models;

namespace GestPR.Service.Taux_Historic
{
    public interface ITauxService
    {
        Task<IEnumerable<tauxResponseDto>> GetAllTauxAsync();
        Task<tauxResponseDto> GetTauxByIdAsync(int id);
        Task<tauxResponseDto> CreateAsync(tauxCreateDto tauxCreateDto);
        Task<tauxResponseDto> UpdateAsync(int id, tauxUpdateDto tauxUpdateDto);
        Task<IEnumerable<tauxHistoriqueResponseDto>> GetHistoriqueAsync(int idTaux);
        Task<int> GetTotalTauxCountAsync();
        Task DeleteAsync(int id);
    }
}
