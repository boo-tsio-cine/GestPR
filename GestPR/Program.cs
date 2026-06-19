using Star.Security.Ldap;
using GestPR.Data;
using GestPR.Repository;
using GestPR.Repository.Demandes;
using GestPR.Repository.Taux_Historic;
using GestPR.Service;
using GestPR.Service.Demandes;
using GestPR.Service.Taux_Historic;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace GestPR
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // ==========================================
            // 1. ENREGISTREMENT DES SERVICES (BUILDER)
            // ==========================================

            // Configuration LDAP
            builder.Services.AddStarLdapAuthentication(builder.Configuration);

            // Chaîne de connexion à la base de données
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(connectionString));

            // AppDbContext — pour vos données métier (Users, etc.)
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(connectionString));

            builder.Services.AddDatabaseDeveloperPageExceptionFilter();

            builder.Services.AddDefaultIdentity<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = true)
                .AddEntityFrameworkStores<ApplicationDbContext>();

            builder.Services.AddRazorPages();

            builder.Services.AddControllers()
                .ConfigureApiBehaviorOptions(options =>
                {
                    options.SuppressModelStateInvalidFilter = true; // Désactive la validation automatique pour utiliser le logger personnalisé ci-dessous
                });

            // Configuration CORS (React Frontend)
            // Configuration CORS unifiée pour React Frontend
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.WithOrigins("http://localhost:5173") // Pas de "/" à la fin !
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials(); // 🟢 Activé ici de manière officielle
                });
            });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            // Formatter de logs personnalisé pour les erreurs de validation
            builder.Services.Configure<ApiBehaviorOptions>(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var errors = context.ModelState
                        .Where(e => e.Value?.Errors.Count > 0)
                        .Select(e => new {
                            Field = e.Key,
                            Errors = e.Value?.Errors.Select(x => x.ErrorMessage)
                        });
                    Console.WriteLine("=== VALIDATION ERRORS ===");
                    foreach (var err in errors)
                        Console.WriteLine($"{err.Field}: {string.Join(", ", err.Errors)}");
                    return new BadRequestObjectResult(context.ModelState);
                };
            });

            // Authentification JWT
            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options => {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = builder.Configuration["Jwt:Issuer"],
                        ValidAudience = builder.Configuration["Jwt:Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)
                        )
                    };
                });

            builder.Services.AddAuthorization();

            // Injection des Repositories & Services métier
            builder.Services.AddScoped<IOrigineRepository, OrigineRepository>();
            builder.Services.AddScoped<IOrigineService, OrigineService>();

           
            builder.Services.AddScoped<IDemandeRepository, DemandeRepository>();
            builder.Services.AddScoped<IDemandeService, DemandeService>();

            builder.Services.AddScoped<ITauxRepository, TauxRepository>();
            builder.Services.AddScoped<ITauxService, TauxService>();

            builder.Services.AddScoped<StarIdentityService>();
            // ==========================================
            // 2. CONTEXTE DE L'APPLICATION (LA FRONTIÈRE)
            // ==========================================
            var app = builder.Build();

            // 🟢 AJOUTER CE BLOC ICI (Tout en haut du pipeline de requêtes) :
            app.Use(async (context, next) =>
            {
                // On cible l'origine exacte de votre React
                context.Response.Headers.Append("Access-Control-Allow-Origin", "http://localhost:5173");
                context.Response.Headers.Append("Access-Control-Allow-Headers", "Content-Type, Authorization");
                context.Response.Headers.Append("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

                // C'est ce header crucial qui manquait pour l'authentification Windows !
                context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");

                // Si c'est une requête de pré-vérification (Preflight OPTIONS), on répond 200 OK immédiatement
                if (context.Request.Method == "OPTIONS")
                {
                    context.Response.StatusCode = 200;
                    await context.Response.CompleteAsync();
                    return;
                }

                await next();
            });

            // Supprimez ensuite l'ancien app.UseCors("AllowFrontend") ou app.UseCors(options => ...) 
            // car ce bloc gère tout proprement pour toutes les routes.

            // ==========================================
            // 3. PIPELINE DE REQUÊTES HTTP (MIDDLEWARES)
            // ==========================================
            if (app.Environment.IsDevelopment())
            {
                app.UseMigrationsEndPoint();
                app.UseSwagger();
                app.UseSwaggerUI();
            }
            else
            {
                app.UseExceptionHandler("/Error");
                app.UseHsts();
            }

            app.UseCors("AllowFrontend");
            app.UseStaticFiles();
            app.UseRouting();

            // L'authentification doit TOUJOURS être placée AVANT l'autorisation
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapRazorPages();

            app.Run();
        }
    }
}