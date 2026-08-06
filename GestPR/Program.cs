using GestPR.Data;
using GestPR.Repository;
using GestPR.Repository.Demandes;
using GestPR.Repository.Taux_Historic;
using GestPR.Service;
using GestPR.Service.Demandes;
using GestPR.Service.Email;
using GestPR.Service.Taux_Historic;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Server.IISIntegration;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Net.Security;
using System.Text;

namespace GestPR
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // =========================================================
            // 1. ENREGISTREMENT DES SERVICES (BUILDER)
            // =========================================================

            // 🔴 SUPPRIMÉ : builder.Services.AddStarLdapAuthentication (LDAP retiré)

            // Chaîne de connexion à la base de données
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(connectionString));

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(connectionString));

            builder.Services.AddDatabaseDeveloperPageExceptionFilter();

            builder.Services.AddDefaultIdentity<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = true)
                .AddEntityFrameworkStores<ApplicationDbContext>();

            builder.Services.AddRazorPages();

            builder.Services.AddControllers()
                .ConfigureApiBehaviorOptions(options =>
                {
                    options.SuppressModelStateInvalidFilter = true;
                });

            // Configuration CORS (indispensable pour lier le frontend React sur le port 5173)
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp", policy =>
                {
                    policy.WithOrigins("http://localhost:5173")
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials(); // Permet le transfert de l'identité de session Windows !
                });
            });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            // Formatter de logs pour les erreurs de validation
            builder.Services.Configure<ApiBehaviorOptions>(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var errors = context.ModelState
                        .Where(e => e.Value?.Errors.Count > 0)
                        .Select(e => new {
                            Field = e.Key,
                            // 🟢 CORRIGÉ : "[]" remplace "Array.Empty<string>()"
                            Errors = e.Value?.Errors.Select(x => x.ErrorMessage) ?? []
                        });
                    Console.WriteLine("=== VALIDATION ERRORS ===");
                    foreach (var err in errors)
                    {
                        Console.WriteLine($"{err.Field}: {string.Join(", ", err.Errors)}");
                    }
                    return new BadRequestObjectResult(context.ModelState);
                };
            });

            // Accesseur HttpContext nécessaire pour lire la session de l'utilisateur
            builder.Services.AddHttpContextAccessor();

            // Configuration de l'authentification Windows de la session locale
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultScheme = IISDefaults.AuthenticationScheme;
            });
            // =========================================================
            // CONFIGURATION DE L'AUTHENTIFICATION WINDOWS NATIVE (IIS)
            // =========================================================
            builder.Services.AddAuthentication(NegotiateDefaults.AuthenticationScheme)
               .AddNegotiate();


            builder.Services.AddAuthorization(options =>
            {
                options.FallbackPolicy = options.DefaultPolicy;
            });



            builder.Services.AddAuthorization();

            // Enregistrement de tes services applicatifs

            builder.Services.AddScoped<IOrigineRepository, OrigineRepository>();
            builder.Services.AddScoped<IOrigineService, OrigineService>();

            builder.Services.AddScoped<IDemandeRepository, DemandeRepository>();
            builder.Services.AddScoped<IDemandeService, DemandeService>();

            builder.Services.AddScoped<ITauxRepository, TauxRepository>();
            builder.Services.AddScoped<ITauxService, TauxService>();

            // Dans Program.cs
            builder.Services.AddTransient<IEmailService, EmailService>();
            builder.Services.AddHttpContextAccessor();


            // =========================================================
            // 2. MIDDLEWARES PIPELINE
            // =========================================================
            var app = builder.Build();

            // Middleware CORS personnalisé pour autoriser les cookies de session et Windows Auth (Credentials)
            app.Use(async (context, next) =>
            {
                context.Response.Headers.Append("Access-Control-Allow-Origin", "http://localhost:5173");
                context.Response.Headers.Append("Access-Control-Allow-Headers", "Content-Type, Authorization");
                context.Response.Headers.Append("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");

                if (context.Request.Method == "OPTIONS")
                {
                    context.Response.StatusCode = 200;
                    await context.Response.CompleteAsync();
                    return;
                }

                await next();
            });

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

            // Active le serveur de fichiers statiques pour le dossier wwwroot
            app.UseStaticFiles(new StaticFileOptions
            {
                OnPrepareResponse = ctx =>
                {
                    // Si le fichier demandé est un PDF, on force l'affichage "inline"
                    if (ctx.File.Name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                    {
                        ctx.Context.Response.Headers["Content-Disposition"] = "inline";
                        ctx.Context.Response.Headers["Content-Type"] = "application/pdf";
                    }
                }
            });
            app.UseCors(policy => policy
                .AllowAnyHeader()
                .AllowAnyMethod()
                .SetIsOriginAllowed(origin => true) // Autorise toutes les adresses locales/réseau
                .AllowCredentials());

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapFallbackToFile("index.html");

            app.Run();
        }
    }
}