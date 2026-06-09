using GestPR.Dtos;
using GestPR.Models;
using GestPR.Repository;

namespace GestPR.Service
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _repo;

        public UserService(IUserRepository repo)
        {
            _repo = repo;
        }

        public async Task<IEnumerable<UserResponseDDto>> GetAllAsync()
        {
            var user = await _repo.GetAllAsync();
            return user.Select(MapToDo);
        }


        private static UserResponseDDto MapToDo(User u) => new()
        {
            Id = u.Id,
            Nom = u.Nom,
            Prenom = u.Prenom,
            Matricule = u.Matricule,
            Mail = u.Mail,
            Fixe = u.Fixe,
            Role = u.Role,
            Site = u.Site,
        };


        public async Task<UserResponseDDto> GetByIdAsync(int id)
        {
            var user = await _repo.getByIdAsync(id)
                ?? throw new KeyNotFoundException($"Usilisateur {id} introuvalbe");
            return MapToDo(user);
        }

        //Création utilisateur avec validation
        public async Task<UserResponseDDto> CreateAsyncUser(UserCreateDDto dto)
        {
            Valider(dto);

            var user = new User
            {
                Nom = dto.Nom.Trim(),
                Prenom = dto.Prenom.Trim(),
                Mail = dto.Mail.Trim(),
                Matricule = dto.Matricule.Trim(),
                Fixe = dto.Fixe.Trim(),
                Role = dto.Role.Trim(),
                Site = dto.Site.Trim(),
            };

            var created = await _repo.CreateAsync(user);
            return MapToDo(created);
        }

        private static void Valider(UserCreateDDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nom))
                throw new ArgumentException("Le Nom est obligatoire");
        }

        public async Task DeleteAsync(int id)
        {
            await _repo.DeleteAsync(id);
        }

    }
}
