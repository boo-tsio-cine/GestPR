using GestPR.Data;
using GestPR.Models;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Repository
{
    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _db;

        public UserRepository(AppDbContext db)
        {
            _db = db;
        }

        //Ajouter
        public async Task<IEnumerable<User>> GetAllAsync()
        {
            return await _db.Users
                .OrderBy(x => x.Nom)
                .ToListAsync();
        }

        //récupération par Id
        public async Task<User?> GetByIdAsync(int id)
        {
            return await _db.Users
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<User> CreateAsync(User user)
        {
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return user;
        }

        //DeleteAsync - manquait
        public async Task DeleteAsync(int id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user != null)
            {
                _db.Users.Remove(user);
                await _db.SaveChangesAsync();
            }
        }

        //UpdateAsync
        public async Task UpdateAsync(User user)
        {
            _db.Users.Update(user);
            await _db.SaveChangesAsync();


        }

        public async Task UpdatePasswordAsync(User user)
        {
            _db.Users.Update(user);
            await _db.SaveChangesAsync();
        }
    }
}
