using GestPR.Data;
using GestPR.DTOs; // <--- INDISPENSABLE pour IConfiguration
using GestPR.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient; // <--- INDISPENSABLE pour SqlConnection
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Principal;
using System.Text;
using System.Text.Json;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly string _identityConnectionString;

        public AuthController(AppDbContext context, IConfiguration configuration, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _identityConnectionString = configuration.GetConnectionString("StarIdentityConnection") ?? "";
            _httpContextAccessor = httpContextAccessor;
        }

        [HttpGet("windows-login")]
      
        public async Task<IActionResult> GetLogin()
        {
            try
            {
                string? rawUser = null;

                // --- MANIÈRE 1 : Variables serveur IIS (La méthode reine en déploiement IIS d'entreprise) ---
                var serverVariables = HttpContext.Features.Get<Microsoft.AspNetCore.Http.Features.IServerVariablesFeature>();
                if (serverVariables != null)
                {
                    rawUser = serverVariables["LOGON_USER"] ?? serverVariables["AUTH_USER"];
                }

                // --- MANIÈRE 2 : Contexte utilisateur HTTP (S'appuie sur l'authentification Windows du protocole HTTP) ---
                if (string.IsNullOrEmpty(rawUser))
                {
                    rawUser = HttpContext.User?.Identity?.Name
                              ?? HttpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
                }

                // --- SÉCURITÉ DEPLOIEMENT : Suppression absolue d'Environment.UserName ---
                // Si on détecte un compte de service IIS à cause d'une mauvaise configuration système, on refuse
                if (!string.IsNullOrEmpty(rawUser) &&
                    (rawUser.Contains("IIS APPPOOL", StringComparison.OrdinalIgnoreCase) ||
                     rawUser.Contains("NETWORK SERVICE", StringComparison.OrdinalIgnoreCase) ||
                     rawUser.Contains("SYSTEM", StringComparison.OrdinalIgnoreCase)))
                {
                    rawUser = null; // On invalide pour forcer une erreur explicite d'authentification utilisateur
                }

                // --- VÉRIFICATION GLOBALE ---
                if (string.IsNullOrEmpty(rawUser))
                {
                    return Unauthorized(new
                    {
                        Connected = false,
                        Message = "Impossible d'identifier votre session Windows d'entreprise. Veuillez vérifier que l'authentification Windows est active sur votre navigateur et sur IIS."
                    });
                }

                // Nettoyage du domaine si présent (S_TANA_00\tsio700529 -> tsio700529)
                string cleanedUserName = rawUser.Contains("\\")
                    ? rawUser.Split('\\')[1]
                    : rawUser;

                // Recherche de l'utilisateur dans la base de données
                var dbUser = await _context.ApplicationUsers
                    .FirstOrDefaultAsync(u => u.AdUsername.ToLower() == cleanedUserName.ToLower()
                                           && u.ApplicationName == "GestPR");

                if (dbUser == null)
                {
                    return Unauthorized(new
                    {
                        Connected = false,
                        Message = $"L'utilisateur '{cleanedUserName}' n'est pas configuré pour accéder à l'application GestPR."
                    });
                }

                // Vérification du statut du compte
                if (dbUser.IsActive != 1)
                {
                    return StatusCode(403, new
                    {
                        Connected = false,
                        Message = "Votre compte utilisateur est désactivé."
                    });
                }

                // Succès : Envoi des données de l'utilisateur connecté vers le Frontend
                return Ok(new
                {
                    Connected = true,
                    Id = dbUser.Id,
                    Username = dbUser.AdUsername,
                    Nom = dbUser.Nom,
                    Prenom = dbUser.Prenom,
                    Mail = dbUser.Mail,
                    Role = dbUser.Role,
                    Site = dbUser.Site,
                    RawIdentityUsed = rawUser, // Permet de valider que c'est bien l'AD de l'utilisateur distant qui est reçu
                    Timestamp = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Connected = false,
                    Message = "Une erreur est survenue lors de la vérification de l'identité.",
                    Error = ex.Message
                });
            }
        }

        // ==========================================
        // 2. RECUPERER LES UTILISATEURS (Pour l'affichage)
        // ==========================================
        [HttpGet("utilisateurs")]
        public async Task<IActionResult> GetAllUtilisateurs()
        {
            var utilisateurs = await _context.ApplicationUsers
                .Where(u => u.ApplicationName == "GestPR")
                .Select(u => new
                {
                    id = u.Id,
                    matricule = u.AdUsername,
                    role = u.Role,
                    nom = u.Nom,
                    prenom = u.Prenom,
                    mail = u.Mail,
                    fixe = u.Fixe,
                    site = u.Site
                })
                .ToListAsync();

            return Ok(utilisateurs);
        }

        // ==========================================
        // 3. CREER UN NOUVEL UTILISATEUR (POST)
        // ==========================================
        [HttpPost("utilisateurs")]
        public async Task<IActionResult> CreateUtilisateur([FromBody] NewUserDto model)
        {
            if (string.IsNullOrEmpty(model.Matricule)) return BadRequest("Le matricule est obligatoire.");

            string emailComplet = "";
            if (!string.IsNullOrEmpty(model.MailPrefix))
            {
                emailComplet = $"{model.MailPrefix.Trim()}@castel-afrique.com";
            }

            var nouvelUtilisateur = new ApplicationUser // Modifie le nom de la classe si ton modèle EF s'appelle autrement
            {
                AdUsername = model.Matricule,
                ApplicationName = "GestPR",
                Role = string.IsNullOrEmpty(model.Role) ? "Demandeur" : model.Role,
                IsActive = 1,
                Nom = model.Nom ?? "",
                Prenom = model.Prenom ?? "",
                Mail = emailComplet,
                Fixe = model.Fixe ?? "",
                Site = string.IsNullOrEmpty(model.Site) ? "STAR" : model.Site
            };

            _context.ApplicationUsers.Add(nouvelUtilisateur);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Utilisateur créé avec succès !" });
        }

        // ==========================================
        // 4. MODIFIER UN UTILISATEUR (PUT)
        // ==========================================
        [HttpPut("utilisateurs/{id}")]
        public async Task<IActionResult> UpdateUtilisateur(int id, [FromBody] NewUserDto model)
        {
            if (string.IsNullOrEmpty(model.Matricule)) return BadRequest("Le matricule est obligatoire.");

            var dbUser = await _context.ApplicationUsers
                .FirstOrDefaultAsync(u => u.Id == id && u.ApplicationName == "GestPR");

            if (dbUser == null) return NotFound("Utilisateur non trouvé.");

            string emailComplet = "";
            if (!string.IsNullOrEmpty(model.MailPrefix))
            {
                emailComplet = model.MailPrefix.Contains("@")
                    ? model.MailPrefix.Trim()
                    : $"{model.MailPrefix.Trim()}@castel-afrique.com";
            }

            dbUser.AdUsername = model.Matricule;
            dbUser.Role = string.IsNullOrEmpty(model.Role) ? "Demandeur" : model.Role;
            dbUser.Nom = model.Nom ?? "";
            dbUser.Prenom = model.Prenom ?? "";
            dbUser.Mail = emailComplet;
            dbUser.Fixe = model.Fixe ?? "";
            dbUser.Site = string.IsNullOrEmpty(model.Site) ? "STAR" : model.Site;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ==========================================
        // 5. SUPPRIMER UN UTILISATEUR (DELETE)
        // ==========================================
        [HttpDelete("utilisateurs/{id}")]
        public async Task<IActionResult> DeleteUtilisateur(int id)
        {
            var dbUser = await _context.ApplicationUsers
                .FirstOrDefaultAsync(u => u.Id == id && u.ApplicationName == "GestPR");

            if (dbUser == null)
                return NotFound("Utilisateur non trouvé ou n'appartient pas à l'application GestPR.");

            _context.ApplicationUsers.Remove(dbUser);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // ==========================================
        // 6. RECUPERER LE NOMBRE TOTAL D'UTILISATEURS
        // ==========================================
        [HttpGet("utilisateurs/count")]
        public async Task<IActionResult> GetTotalUtilisateursCount()
        {
            try
            {
                int total = await _context.ApplicationUsers
                    .CountAsync(u => u.ApplicationName == "GestPR");

                return Ok(total);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError,
                    $"Erreur lors de la récupération du compte utilisateur : {ex.Message}");
            }
        }

        // ==========================================
        // 7. RECUPERER PAR MATRICULE (La route qui bloquait)
        // ==========================================
        [HttpGet("by-matricule/{matricule}")]
        public async Task<IActionResult> GetByMatricule(string matricule)
        {
            var user = await _context.ApplicationUsers
                .FirstOrDefaultAsync(u => u.AdUsername.ToLower() == matricule.ToLower()
                                       && u.ApplicationName == "GestPR");

            if (user == null)
            {
                return NotFound(new
                {
                    message = $"Utilisateur avec le matricule {matricule} introuvable en base."
                });
            }

            // Renvoie exactement l'Id attendu par ton demandeur.jsx !
            return Ok(new { Id = user.Id, Username = user.AdUsername });
        }
    }




    public class NewUserDto
    {
        public string Nom { get; set; } = string.Empty;
        public string Prenom { get; set; } = string.Empty;
        public string Matricule { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string MailPrefix { get; set; } = string.Empty; // Saisi par l'utilisateur (ex: tsiory.randria)
        public string Fixe { get; set; } = string.Empty;
        public string Site { get; set; } = string.Empty;
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}