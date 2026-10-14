using GestPR.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection; 
namespace GestPR.Tests.Helpers
{
    public class CustomWebApplicationFactory<TProgram> : WebApplicationFactory<Program> where TProgram : class
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                // 1. Supprimer la configuration BDD existante
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));

                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                // 2. Ajouter la BDD de test (InMemory ou base SQL de test dédiée)
                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInMemoryDatabase("GestPR_TestDb");
                });

                // 3. Initialiser les données de test (Seed Data)
                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var scopedServices = scope.ServiceProvider;
                var db = scopedServices.GetRequiredService<ApplicationDbContext>();

                db.Database.EnsureCreated();
                SeedTestData(db);
            });
        }

        private void SeedTestData(ApplicationDbContext db)
        {
            // Insérer ici les utilisateurs de test (Demandeur, Comptable, Valideur) et articles initiaux
            if (!db.Users.Any())
            {
                // exemple de seeding si nécessaire
            }
        }
    }
}
