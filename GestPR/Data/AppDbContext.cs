using GestPR.Models;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

       

        public DbSet<User> Users { get; set; }
        public DbSet<Taux> Taux { get; set; }
        public DbSet<Fournisseur> Fournisseur { get; set; }
        public DbSet<Origine> Origine { get; set; }
        public DbSet<TauxHistorique> TauxHistorique { get; set; }
        public DbSet<Demande> Demande { get; set; }
        public DbSet<Article> Article { get; set; }

        // ✅ Forcer explicitement la clé primaire
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<TauxHistorique>()
                .HasKey(t => t.Id);
        }

    }
}
