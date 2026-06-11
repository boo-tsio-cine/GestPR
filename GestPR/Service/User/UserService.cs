using BCrypt.Net;
using GestPR.Dtos;
using GestPR.Models;
using GestPR.Repository;
using Microsoft.AspNetCore.Identity;

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
            var user = await _repo.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Usilisateur {id} introuvalbe");
            return MapToDo(user);
        }

        //Création utilisateur avec validation
        public async Task<UserResponseDDto> CreateAsync(UserCreateDDto dto)
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

        public async Task<bool> UpdateUserAsync(int id, UserUpdateDDto dto)
        {
            var user = await _repo.GetByIdAsync(id);
            if (user == null)
                return false;
            user.Nom = dto.Nom.Trim();
            user.Prenom = dto.Prenom.Trim();
            user.Mail = dto.Mail.Trim();
            user.Matricule = dto.Matricule.Trim();
            user.Fixe = dto.Fixe;
            user.Role = dto.Role.Trim();
            user.Site = dto.Site.Trim();
            await _repo.UpdateAsync(user);
            return true;

        }


        private readonly IUserRepository _repository;
        private readonly IPasswordHasher<User> _passwordHasher;

        public UserService(IUserRepository repository, IPasswordHasher<User> passwordHasher)
        {
            _repository = repository;
            _passwordHasher = passwordHasher;
        }

        public async Task<bool> UpdateUserPasswordAsync(int id, UserUpdatePasswordDDto dto)
        {
            var user = await _repo.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Utilisateur {id} introuvable");

            //Cas 1 : si le mot de passe est null, on le crée
            if (user.PasswordHash == null)
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword( dto.NewPassword);
            }
            else
            {
                //Cas 2 : si le mot de passe existe déjà, on vérifie l'ancien mot de passe
                if (string.IsNullOrWhiteSpace(dto.OldPassword))
                    throw new ArgumentException("L'ancien mot de passe est obligatoire");

                if (!BCrypt.Net.BCrypt.Verify(dto.OldPassword, user.PasswordHash))
                    throw new ArgumentException("L'ancien mot de passe est incorrect");

                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            }


            //Valider le nouveau mot de passe
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                throw new ArgumentException("Le nouveau mot de passe doit contenir au moins 6 caractères");
            //bool isOldPasswordValid = _passwordHasher.VerifyHashedPassword(user.PasswordHash, dto.OldPassword);
            await _repo.UpdateAsync(user);
            return true;
        }
    }
}
