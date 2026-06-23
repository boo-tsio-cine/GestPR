using GestPR.Models;

namespace GestPR.Repository
{
    public interface IOrigineRepository
    {
        Task<IEnumerable<Origine>> GetAllAsync();
        Task<Origine?> GetByIdAsync(int id);
        Task<Origine> CreateAsync(Origine origine);
        Task DeleteAsync(int id);
        Task <int> GetTotalOrigineCountAsync();
    }
}