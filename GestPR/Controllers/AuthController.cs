using GestPR.Data;
using GestPR.DTOs; // <--- INDISPENSABLE pour IConfiguration
using GestPR.Models;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Authorization;
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
        [Authorize(AuthenticationSchemes = NegotiateDefaults.AuthenticationScheme)]
        public async Task<IActionResult> GetLogin()
        {
            try
            {
                string? rawUser = null;

                // --- 1. Tentative d'obtention s�curis�e des variables IIS (Si ex�cut� sous IIS) ---
                try
                {
                    var serverVariables = HttpContext.Features.Get<Microsoft.AspNetCore.Http.Features.IServerVariablesFeature>();
                    if (serverVariables != null)
                    {
                        rawUser = serverVariables["LOGON_USER"] ?? serverVariables["AUTH_USER"];
                    }
                }
                catch
                {
                    // Ignore l'erreur si IServerVariablesFeature n'est pas support� (ex: Kestrel Linux Docker)
                }

                // --- 2. Identity Claims standard ---
                if (string.IsNullOrEmpty(rawUser))
                {
                    rawUser = HttpContext.User?.Identity?.Name
                              ?? HttpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
                }

                // --- 3. MODE MOCK / D�VELOPPEMENT DOCKER ---
                // En conteneur Docker Linux, la session Windows distante n'est pas transmise nativement.
                // Vous pouvez utiliser le header 'X-Forwarded-User' ou basculer sur un utilisateur de test.
                if (string.IsNullOrEmpty(rawUser) && Request.Headers.TryGetValue("X-Forwarded-User", out var mockUser))
                {
                    rawUser = mockUser.ToString();
                }

                // Nettoyage des comptes syst�me IIS
                if (!string.IsNullOrEmpty(rawUser) &&
                    (rawUser.Contains("IIS APPPOOL", StringComparison.OrdinalIgnoreCase) ||
                     rawUser.Contains("NETWORK SERVICE", StringComparison.OrdinalIgnoreCase) ||
                     rawUser.Contains("SYSTEM", StringComparison.OrdinalIgnoreCase)))
                {
                    rawUser = null;
                }

                // Si aucun utilisateur n'est identifi� (cas standard sur Docker sans IIS Proxy)
                if (string.IsNullOrEmpty(rawUser))
                {
                    return Unauthorized(new
                    {
                        Connected = false,
                        Message = "Session Windows d'entreprise non d�tect�e."
                    });
                }

                // Nettoyage du domaine
                string cleanedUserName = rawUser.Contains("\\") ? rawUser.Split('\\')[1] : rawUser;

                // Recherche en BDD
                var dbUser = await _context.ApplicationUsers
                    .FirstOrDefaultAsync(u => u.AdUsername.ToLower() == cleanedUserName.ToLower()
                                           && u.ApplicationName == "GestPR");

                if (dbUser == null)
                {
                    return Unauthorized(new
                    {
                        Connected = false,
                        Message = $"L'utilisateur '{cleanedUserName}' n'est pas configur� dans GestPR."
                    });
                }

                if (dbUser.IsActive != 1)
                {
                    return StatusCode(403, new { Connected = false, Message = "Votre compte est d�sactiv�." });
                }

                return Ok(new
                {
                    Connected = true,
                    Id = dbUser.Id,
                    Username = dbUser.AdUsername,
                    Nom = dbUser.Nom,
                    Prenom = dbUser.Prenom,
                    Mail = dbUser.Mail,
                    Role = dbUser.Role,
                    Site = dbUser.Site
                });
            }
            catch (Exception ex)
            {
                // Renvoie l'erreur explicite dans la r�ponse au lieu d'un 500 opaque
                return StatusCode(500, new
                {
                    Connected = false,
                    Message = "Erreur lors de la v�rification de l'identit� en base de donn�es.",
                    Details = ex.InnerException?.Message ?? ex.Message
                });
            }
        }


        //[HttpGet("windows-login")]

        //public async Task<IActionResult> GetLogin()
        //{
        //    try
        //    {
        //        string? rawUser = null;

        //        // --- MANI�RE 1 : Variables serveur IIS (La m�thode reine en d�ploiement IIS d'entreprise) ---
        //        var serverVariables = HttpContext.Features.Get<Microsoft.AspNetCore.Http.Features.IServerVariablesFeature>();
        //        if (serverVariables != null)
        //        {
        //            rawUser = serverVariables["LOGON_USER"] ?? serverVariables["AUTH_USER"];
        //        }

        //        // --- MANI�RE 2 : Contexte utilisateur HTTP (S'appuie sur l'authentification Windows du protocole HTTP) ---
        //        if (string.IsNullOrEmpty(rawUser))
        //        {
        //            rawUser = HttpContext.User?.Identity?.Name
        //                      ?? HttpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
        //        }

        //        // --- S�CURIT� DEPLOIEMENT : Suppression absolue d'Environment.UserName ---
        //        // Si on d�tecte un compte de service IIS � cause d'une mauvaise configuration syst�me, on refuse
        //        if (!string.IsNullOrEmpty(rawUser) &&
        //            (rawUser.Contains("IIS APPPOOL", StringComparison.OrdinalIgnoreCase) ||
        //             rawUser.Contains("NETWORK SERVICE", StringComparison.OrdinalIgnoreCase) ||
        //             rawUser.Contains("SYSTEM", StringComparison.OrdinalIgnoreCase)))
        //        {
        //            rawUser = null; // On invalide pour forcer une erreur explicite d'authentification utilisateur
        //        }

        //        // --- V�RIFICATION GLOBALE ---
        //        if (string.IsNullOrEmpty(rawUser))
        //        {
        //            return Unauthorized(new
        //            {
        //                Connected = false,
        //                Message = "Impossible d'identifier votre session Windows d'entreprise. Veuillez v�rifier que l'authentification Windows est active sur votre navigateur et sur IIS."
        //            });
        //        }

        //        // Nettoyage du domaine si pr�sent (S_TANA_00\tsio700529 -> tsio700529)
        //        string cleanedUserName = rawUser.Contains("\\")
        //            ? rawUser.Split('\\')[1]
        //            : rawUser;

        //        // Recherche de l'utilisateur dans la base de donn�es
        //        var dbUser = await _context.ApplicationUsers
        //            .FirstOrDefaultAsync(u => u.AdUsername.ToLower() == cleanedUserName.ToLower()
        //                                   && u.ApplicationName == "GestPR");

        //        if (dbUser == null)
        //        {
        //            return Unauthorized(new
        //            {
        //                Connected = false,
        //                Message = $"L'utilisateur '{cleanedUserName}' n'est pas configur� pour acc�der � l'application GestPR."
        //            });
        //        }

        //        // V�rification du statut du compte
        //        if (dbUser.IsActive != 1)
        //        {
        //            return StatusCode(403, new
        //            {
        //                Connected = false,
        //                Message = "Votre compte utilisateur est d�sactiv�."
        //            });
        //        }

        //        // Succ�s : Envoi des donn�es de l'utilisateur connect� vers le Frontend
        //        return Ok(new
        //        {
        //            Connected = true,
        //            Id = dbUser.Id,
        //            Username = dbUser.AdUsername,
        //            Nom = dbUser.Nom,
        //            Prenom = dbUser.Prenom,
        //            Mail = dbUser.Mail,
        //            Role = dbUser.Role,
        //            Site = dbUser.Site,
        //            RawIdentityUsed = rawUser, // Permet de valider que c'est bien l'AD de l'utilisateur distant qui est re�u
        //            Timestamp = DateTime.Now
        //        });
        //    }
        //    catch (Exception ex)
        //    {
        //        return StatusCode(500, new
        //        {
        //            Connected = false,
        //            Message = "Une erreur est survenue lors de la v�rification de l'identit�.",
        //            Error = ex.Message
        //        });
        //    }
        //}

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

            var nouvelUtilisateur = new ApplicationUser // Modifie le nom de la classe si ton mod�le EF s'appelle autrement
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

            return Ok(new { Message = "Utilisateur cr�� avec succ�s !" });
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

            if (dbUser == null) return NotFound("Utilisateur non trouv�.");

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
                return NotFound("Utilisateur non trouv� ou n'appartient pas � l'application GestPR.");

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
                    $"Erreur lors de la r�cup�ration du compte utilisateur : {ex.Message}");
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


        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginPasswordRequest model)
        {
            var matricule = model.Matricule?.Trim() ?? "";
            if (matricule.Length == 0 || string.IsNullOrEmpty(model.Pass))
                return BadRequest(new { message = "Matricule et mot de passe obligatoires." });

            var user = await _context.ApplicationUsers
                .FirstOrDefaultAsync(u => u.AdUsername.ToLower() == matricule.ToLower()
                                       && u.ApplicationName == "GestPR");

            var cred = user == null ? null
                : await _context.UtilisateurCredentials.FirstOrDefaultAsync(c => c.ApplicationUserId == user.Id);

            // M�me message dans tous les cas d'�chec : on ne r�v�le pas si le matricule existe
            if (user == null || cred == null || !BCrypt.Net.BCrypt.Verify(model.Pass, cred.PasswordHash))
                return BadRequest(new { message = "Matricule ou mot de passe incorrect." });

            if (user.IsActive != 1)
                return StatusCode(403, new { message = "Votre compte est d�sactiv�." });

            return Ok(new
            {
                Connected = true,
                Id = user.Id,
                Username = user.AdUsername,
                Nom = user.Nom,
                Prenom = user.Prenom,
                Mail = user.Mail,
                Role = user.Role,
                Site = user.Site
            });
        }

        [HttpPost("inscription")]
        public async Task<IActionResult> Inscription([FromBody] InscriptionRequest model)
        {
            var matricule = model.Matricule?.Trim() ?? "";
            if (matricule.Length == 0)
                return BadRequest(new { message = "Le matricule est obligatoire." });
            if (string.IsNullOrEmpty(model.Password) || model.Password.Length < 8)
                return BadRequest(new { message = "Le mot de passe doit contenir au moins 8 caract�res." });

            var user = await _context.ApplicationUsers
                .FirstOrDefaultAsync(u => u.AdUsername.ToLower() == matricule.ToLower()
                                       && u.ApplicationName == "GestPR");
            if (user == null)
                return BadRequest(new { message = "Ce matricule n'est pas enregistr�. Contactez votre administrateur." });
            if (user.IsActive != 1)
                return BadRequest(new { message = "Votre compte est d�sactiv�." });

            if (await _context.UtilisateurCredentials.AnyAsync(c => c.ApplicationUserId == user.Id))
                return BadRequest(new { message = "Ce compte a d�j� un mot de passe. Veuillez vous connecter." });

            _context.UtilisateurCredentials.Add(new UtilisateurCredential
            {
                ApplicationUserId = user.Id,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password, 11)
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = "Compte activ�. Vous pouvez vous connecter." });
        }

    }


    public class LoginPasswordRequest
    {
        public string Matricule { get; set; } = string.Empty;
        public string Pass { get; set; } = string.Empty;
    }

    public class InscriptionRequest
    {
        public string Matricule { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
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