using GestPR.Data;
using GestPR.Models;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Repository.Taux_Historic
{
    public class TauxRepository : ITauxRepository
    {
        private readonly AppDbContext _context;
        public TauxRepository(AppDbContext context)
        {
            _context = context;
        }
        public async Task<IEnumerable<Taux>> GetAllTauxAsync()
        {
            return await _context.Taux
                .OrderBy(t => t.Nom)
                .ToListAsync();
        }

        public async Task<Taux?> GetTauxByIdAsync(int id)
        {
            return await _context.Taux
                .Include(t => t.TauxHistoriques)
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        //Create
        public async Task<Taux?> CreateAsync(Taux taux)
        {
            _context.Taux.Add(taux);
            await _context.SaveChangesAsync();
            return taux;
        }

       

      

      

        public async Task<Taux> UpdateAvecHistoriqueAsync(Taux taux, TauxHistorique historique)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                //1 - Modifier la valeur dans taux
                _context.Taux.Update(taux);
                await _context.SaveChangesAsync();

                // 2. Insérer dans TauxHistorique
                _context.TauxHistorique.Add(historique);
                await _context.SaveChangesAsync();

                // 3. Valider la transaction
                await transaction.CommitAsync();

                return taux;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task DeleteAsync(int id)
        {
            var existingTaux = await _context.Taux.FindAsync(id);
            if (existingTaux == null) return;
            _context.Taux.Remove(existingTaux);
            await _context.SaveChangesAsync();
        }
    }
}
