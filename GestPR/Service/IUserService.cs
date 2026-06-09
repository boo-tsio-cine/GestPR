using GestPR.Dtos;
using GestPR.Models;

namespace GestPR.Service
{
    public interface IUserService
    {
        Task<IEnumerable<UserResponseDDto>> GetAllAsync();
        Task<UserResponseDDto> getByIdAsync(int id);
        Task<UserResponseDDto> CreateAsync(UserCreateDDto user);
        Task DeleteAsync(int id);
    }
}
