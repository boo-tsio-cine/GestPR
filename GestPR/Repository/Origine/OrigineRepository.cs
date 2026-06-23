using GestPR.Data;
using GestPR.Models;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Repository
{
    public class OrigineRepository : IOrigineRepository
    {
        private readonly AppDbContext _db;

        public OrigineRepository(AppDbContext db)
        {
            _db = db;
        }
        // ✅ AJOUTÉ — manquait complètement
        public async Task<IEnumerable<Origine>> GetAllAsync()
        {
            return await _db.Origine
                .OrderBy(o => o.pays)
                .ToListAsync();
        }



        //Récupère un origine par son id
        public async Task<Origine?> GetByIdAsync(int id)
        {
            return await _db.Origine
                .FirstOrDefaultAsync(o  => o.Id == id);
        }

     
        public async Task<Origine> CreateAsync(Origine origine)
        {
            _db.Origine.Add(origine);
            await _db.SaveChangesAsync();
            return origine;
        }


        public async Task<int> GetTotalOrigineCountAsync()
        {
            return await _db.Origine.CountAsync();
        }


        // ✅ DeleteAsync — manquait
        public async Task DeleteAsync(int id)
        {
            var origine = await _db.Origine.FindAsync(id);
            if (origine != null)
            {
                _db.Origine.Remove(origine);
                await _db.SaveChangesAsync();
            }
        }

    }
}
