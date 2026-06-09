using GestPR.Dtos;

namespace GestPR.Service
{
    public interface IOrigineService
    {
        Task<IEnumerable<OrigineResponseDto>> GetAllAsync();
        Task<OrigineResponseDto> GetByIdAsync(int id);
        Task<OrigineResponseDto> CreateAsync(OrigineCreateDto dto);
        Task DeleteAsync(int id);
    }
}
