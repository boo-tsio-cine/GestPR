using GestPR.Dtos;
using GestPR.Models;

namespace GestPR.Service
{
    public interface IUserService
    {
        Task<IEnumerable<UserResponseDDto>> GetAllAsync();
        Task<UserResponseDDto> GetByIdAsync(int id);
        Task<UserResponseDDto> CreateAsync(UserCreateDDto user);
        Task DeleteAsync(int id);
        Task<bool> UpdateUserAsync(int id, UserUpdateDDto user);
        Task<bool> UpdateUserPasswordAsync(int id, UserUpdatePasswordDDto dto);
    }
}
