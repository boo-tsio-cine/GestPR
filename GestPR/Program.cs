using GestPR.Data;
using GestPR.Repository;
using GestPR.Repository.Demandes;
using GestPR.Service;
using GestPR.Service.Demandes;
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

            // Add services to the container.
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
           
            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(connectionString));

            // ✅ AppDbContext — pour vos données métier (Users, etc.)
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(connectionString));

            builder.Services.AddDatabaseDeveloperPageExceptionFilter();

            builder.Services.AddDefaultIdentity<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = true)
                .AddEntityFrameworkStores<ApplicationDbContext>();
            
            builder.Services.AddRazorPages();


            builder.Services.AddControllers()
                 .ConfigureApiBehaviorOptions(options =>
                 {
                     options.SuppressModelStateInvalidFilter = true; // ← désactive validation auto
                 });


            //Autoriser react à appeller le backend
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.WithOrigins("http://localhost:5173")
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
            });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            // Program.cs — ajoute ApiBehaviorOptions pour voir l'erreur exacte
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


            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>  {
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

            builder.Services.AddScoped<IOrigineRepository, OrigineRepository>();
            builder.Services.AddScoped<IOrigineService, OrigineService>();

            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IUserService, UserService>();

            builder.Services.AddScoped<IDemandeRepository, DemandeRepository>();
            builder.Services.AddScoped<IDemandeService, DemandeService>();




            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseMigrationsEndPoint();
            }
            else
            {
                app.UseExceptionHandler("/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }
            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseCors("AllowFrontend");

            //
            //app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.UseRouting();

            app.UseAuthorization();

            app.MapControllers();
            app.MapRazorPages();


            app.UseAuthentication();
            app.UseAuthorization();
            app.Run();
        }
    }
}
