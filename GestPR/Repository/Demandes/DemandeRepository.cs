using GestPR.Data;
using GestPR.Models;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Repository.Demandes
{
    public class DemandeRepository : IDemandeRepository
    {
        private readonly AppDbContext _context;

        public DemandeRepository(AppDbContext context)
        {
            _context = context;
        }

        // Récupère toutes les demandes d'un utilisateur
        public async Task<IEnumerable<Demande>> GetByUserAsync(int DemandeurId)
        {
            return await _context.Demande
                .Where(d => d.DemandeurId == DemandeurId)
                .Include(d => d.Articles) // Inclure les articles liés
                .Include(d => d.Demandeur)// Optionnel : si tu veux les infos de l'utilisateur
                .OrderByDescending(d => d.DateTime)
                .ToListAsync();
        }

        // Récupère une demande par Id
        public async Task<Demande?> GetByIdAsync(int id)
        {
            return await _context.Demande
                .Include(d => d.Articles) // Inclure les articles liés
                .FirstOrDefaultAsync(d => d.Id == id);
        }

        // Crée une demande + ses articles en une seule transaction
        public async Task<Demande> CreateAvecArticleAsync(Demande demande, List<Article> articles)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Ajouter la demande
                _context.Demande.Add(demande);
                await _context.SaveChangesAsync();
                // 2. Ajouter les articles liés à la demande
                foreach (var article in articles)
                {
                    article.DemandeId= demande.Id; // Lier l'article à la demande
                    _context.Article.Add(article);
                }
                await _context.SaveChangesAsync();
                // 3. Commit la transaction
                await transaction.CommitAsync();
                return demande; 
            }
            catch
            {
                // En cas d'erreur, rollback la transaction
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> UserExistsAsync(int userId)
        {
            return await _context.Users.AnyAsync(u => u.Id == userId);


        }
    }
}
