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
            var user = await _repository.GetByIdAsync(id);
            if (user == null)
            {
                return false;
            }
            // 2. GESTION DU CAS NULL : Si l'utilisateur n'a PAS ENCORE de mot de passe
            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                // On passe directement au hachage du nouveau mot de passe
                user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword); // Ou gérer ce cas selon ta logique métier (ex: forcer la réinitialisation du mot de passe)
            }
            else
            {
                // Sinon, s'il y a déjà un mot de passe, on exige et vérifie l'ancien
                if (string.IsNullOrEmpty(dto.OldPassword))
                {
                    // Si l'ancien mot de passe n'est pas fourni, on considère que la validation a échoué
                    return false;
                }

                var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.OldPassword);

                if (verificationResult == PasswordVerificationResult.Failed)
                    return false;

                // 3. Hachage du nouveau mot de passe
                user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
            }

            // Sécurité : On s'assure que PasswordHash en BDD n'est pas null pour éviter le warning CS8604
            string currentHash = user.PasswordHash ?? string.Empty;

            //bool isOldPasswordValid = _passwordHasher.VerifyHashedPassword(user.PasswordHash, dto.OldPassword);
           

            

            // 4. Mise à jour globale de l'entité utilisateur
            // REMARQUE : Utilise la méthode de mise à jour que ton IUserRepository possède déjà (ex: UpdateAsync ou Update)
            await _repository.UpdateAsync(user);
            return true;
        }
    }
}
