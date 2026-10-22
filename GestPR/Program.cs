using GestPR.Data;
using GestPR.Dtos;
using GestPR.Middleware;
using GestPR.Models;
using GestPR.Repository;
using GestPR.Repository.Demandes;
using GestPR.Repository.Taux_Historic;
using GestPR.Service;
using GestPR.Service.Agents;
using GestPR.Service.Anomalies;
using GestPR.Service.Audit;
using GestPR.Service.Demandes;
using GestPR.Service.Email;
using GestPR.Service.MachineLearning;
using GestPR.Service.Ocr;
using GestPR.Service.Receptions;
using GestPR.Service.Renaissance;
using GestPR.Service.Taux_Historic;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Server.IISIntegration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
// ─── MongoDB désactivé (plus de base MongoDB requise) ───────────────
//using MongoDB.Bson.Serialization;
//using MongoDB.Bson.Serialization.Serializers;
//using MongoDB.Driver;

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

            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

            // Configuration uniforme du schéma d'authentification par défaut
            //builder.Services.AddAuthentication(options =>
            //{
            //    options.DefaultAuthenticateScheme = IISDefaults.AuthenticationScheme;
            //    options.DefaultChallengeScheme = IISDefaults.AuthenticationScheme;
            //});
            // Remplacez la configuration IISDefaults par ceci :
            builder.Services.AddAuthentication(NegotiateDefaults.AuthenticationScheme)
                .AddNegotiate();

            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(connectionString));

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(connectionString));

            //builder.Services.AddDbContext<AppDbContext>(options =>
            //    options.UseSqlServer(connectionString, sqlOptions =>
            //        sqlOptions.TranslateParameterizedCollectionsToConstants()));

            builder.Services.AddDatabaseDeveloperPageExceptionFilter();

            builder.Services.AddDefaultIdentity<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = true)
                .AddEntityFrameworkStores<ApplicationDbContext>();

            builder.Services.AddRazorPages();

            builder.Services.AddControllers()
                .ConfigureApiBehaviorOptions(options =>
                {
                    options.SuppressModelStateInvalidFilter = true;
                });
            builder.Services.AddControllers();
            // Configuration CORS pour le frontend React
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp", policy =>
                {
                    policy.WithOrigins("http://localhost:5173")
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials();
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

            builder.Services.AddHttpContextAccessor();

            // Autorisations
            builder.Services.AddAuthorization();

            // Services applicatifs
            builder.Services.AddScoped<IOrigineRepository, OrigineRepository>();
            builder.Services.AddScoped<IOrigineService, OrigineService>();

            builder.Services.AddScoped<IDemandeRepository, DemandeRepository>();
            builder.Services.AddScoped<IDemandeService, DemandeService>();

            builder.Services.AddScoped<ITauxRepository, TauxRepository>();
            builder.Services.AddScoped<ITauxService, TauxService>();

            builder.Services.AddScoped<GrilleFraisService>();

            builder.Services.AddTransient<IEmailService, EmailService>();

            // Cache en mémoire (processus) : remplace Redis, aucune instance Redis requise.
            builder.Services.AddDistributedMemoryCache();

            // ─── MongoDB désactivé (plus de base MongoDB requise) ───────────────
            //builder.Services.Configure<MongoDbSetting>(builder.Configuration.GetSection("MongoDbSetting"));
            //
            //builder.Services.AddSingleton<IMongoClient>(sp =>
            //{
            //    var settings = sp.GetRequiredService<IOptions<MongoDbSetting>>().Value;
            //    return new MongoClient(settings.ConnectionString);
            //});
            //
            //builder.Services.AddScoped(sp =>
            //{
            //    var settings = sp.GetRequiredService<IOptions<MongoDbSetting>>().Value;
            //    var client = sp.GetRequiredService<IMongoClient>();
            //    return client.GetDatabase(settings.DatabaseName);
            //});

            // Service d'audit : version en mémoire (journalisation locale, sans MongoDB).
            builder.Services.AddScoped<IAuditService, AuditService>();

            // ─── Sérialiseur BSON MongoDB désactivé ─────────────────────────────
            //var objectSerializer = new ObjectSerializer(ObjectSerializer.AllAllowedTypes);
            //BsonSerializer.RegisterSerializer(objectSerializer);

            // Validation du ModelState
            builder.Services.Configure<ApiBehaviorOptions>(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var errors = context.ModelState
                        .Where(e => e.Value?.Errors.Count > 0)
                        .SelectMany(e => e.Value!.Errors.Select(x => $"{e.Key}: {x.ErrorMessage}"))
                        .ToList();

                    var response = ApiResponse<object>.Fail("Erreur de validation des données.", errors);
                    return new BadRequestObjectResult(response);
                };
            });

            // ─── Redis désactivé (le cache en mémoire AddDistributedMemoryCache
            //     enregistré plus haut prend le relais sur IDistributedCache) ───
            //builder.Services.AddStackExchangeRedisCache(options =>
            //{
            //    options.Configuration = builder.Configuration.GetConnectionString("Redis");
            //    options.InstanceName = "GestPR_";
            //});

            builder.Services.AddScoped<DeviseService>();
            builder.Services.AddScoped<CoursChangeService>();
            builder.Services.AddScoped<AnomalyDetectionService>();
            builder.Services.AddScoped<AchatDatasetService>();
            builder.Services.AddScoped<IAchatDatasetService>(sp =>
                sp.GetRequiredService<AchatDatasetService>());
            builder.Services.AddScoped<ValidationDatasetService>();
            builder.Services.AddScoped<IValidationDatasetService>(sp =>
                sp.GetRequiredService<ValidationDatasetService>());
            builder.Services.AddScoped<DelaiValidationService>();
            builder.Services.AddScoped<OcrService>();
            builder.Services.AddMemoryCache();
            builder.Services.AddScoped<IDatasetEntrainementService, DatasetEntrainementService>();
            builder.Services.AddScoped<IAnomalyDetectionService, AnomalyDetectionService>();
            builder.Services.AddScoped<IEvaluationService, EvaluationService>();

            builder.Services.AddScoped<ReceptionService>();
            builder.Services.AddScoped<FournisseurFiabiliteService>();

            // ⬇️ Ligne manquante : sans elle, RenaissanceDto reste un objet vide (BaseUrl="")
            //    même si appsettings.json contient bien la section "RenaissanceApi".
            // Program.cs
            //builder.Services.AddScoped<DatasetExtractionService>();
            builder.Services.AddScoped<IDossierPdfParserService, DossierPdfParserService>();
            builder.Services.AddScoped<IComparateurDossierService, ComparateurDossierService>();
            builder.Services.AddScoped<DatasetExtractionService>();
            builder.Services.AddHttpClient<ILlmExplicateurService, LlmExplicateurService>();
            builder.Services.Configure<RenaissanceDto>(
                builder.Configuration.GetSection("RenaissanceApi"));


            builder.Services.AddHttpClient<RenaissanceService>();


            //builder.Services.AddHttpClient<GestPR.Service.Renaissance.RenaissanceService>();
            // Program.cs
            builder.Services.AddScoped<OptimisationRepartitionService>();

            // Health Checks
            builder.Services.AddHealthChecks()
                .AddSqlServer(
                    connectionString: builder.Configuration.GetConnectionString("DefaultConnection")!,
                    name: "SQL Server",
                    tags: new[] { "db", "sql" });
                // ─── Redis et MongoDB désactivés dans les health checks ─────────
                //.AddRedis(
                //    redisConnectionString: builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379",
                //    name: "Redis Cache",
                //    tags: new[] { "cache", "redis" })
                //.AddMongoDb(
                //    sp => sp.GetRequiredService<IMongoClient>(),
                //    name: "MongoDB Audit",
                //    tags: new[] { "db", "nosql" });

            builder.Services.AddSingleton<AgentCommunicationChannel>();
            builder.Services.AddHostedService<AgentOcrService>();
            builder.Services.AddHostedService<AgentControleFinancierService>();
            builder.Services.AddHostedService<AgentRoutageService>();
            builder.Services.AddScoped<AgentControleurRisqueService>();
            builder.Services.AddScoped<AgentNegociateurService>();
            builder.Services.AddScoped<IEstimationDelaiService, EstimationDelaiService>();
            builder.Services.AddScoped<ReceptionService>();
            builder.Services.AddScoped<FournisseurFiabiliteService>();

            // =========================================================
            // 2. MIDDLEWARES PIPELINE
            // =========================================================
            var app = builder.Build();

            app.UseMiddleware<ExceptionMiddleware>();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
                app.UseMigrationsEndPoint();
            }
            else
            {
                app.UseExceptionHandler("/Error");
                app.UseHsts();
            }

            // Middleware CORS personnalisé
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

            app.UseStaticFiles(new StaticFileOptions
            {
                OnPrepareResponse = ctx =>
                {
                    if (ctx.File.Name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                    {
                        ctx.Context.Response.Headers["Content-Disposition"] = "inline";
                        ctx.Context.Response.Headers["Content-Type"] = "application/pdf";
                    }
                }
            });

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapFallbackToFile("index.html");

            app.MapHealthChecks("/health", new HealthCheckOptions
            {
                ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
            }).AllowAnonymous();

            app.Run();
        }
    }
}

public partial class Program { }