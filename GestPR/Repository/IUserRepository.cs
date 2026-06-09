using GestPR.Models;

namespace GestPR.Repository
{
    public interface IUserRepository
    {
        Task<IEnumerable<User>> GetAllAsync();
        Task<User?> getByIdAsync(int id);
        Task<User> CreateAsync(User user);
        Task DeleteAsync(int id);
    }
}
