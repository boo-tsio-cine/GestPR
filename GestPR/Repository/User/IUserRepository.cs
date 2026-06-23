using GestPR.Models;

namespace GestPR.Repository
{
    public interface IUserRepository
    {
        Task<IEnumerable<User>> GetAllAsync();
        Task<User?> GetByIdAsync(int id);
        Task<User> CreateAsync(User user);
        Task DeleteAsync(int id);
        Task UpdateAsync(User user);
        Task UpdatePasswordAsync(User user);
        Task<int> GetTotalUserCountAsync();
    }
}
