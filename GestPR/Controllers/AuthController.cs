using GestPR.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GestPR.Models;
using Star.Security.Ldap.Services;
using Microsoft.AspNetCore.Identity.Data;
using System.Security.Principal;
using Star.Security.Ldap;
using Microsoft.Data.SqlClient; // <--- INDISPENSABLE pour SqlConnection
using Microsoft.Extensions.Configuration; // <--- INDISPENSABLE pour IConfiguration

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        private readonly string _identityConnectionString;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _identityConnectionString = configuration.GetConnectionString("StarIdentityConnection") ?? "";
        }

        [HttpGet("windows-login")]
        public IActionResult WindowsLogin([FromServices] StarIdentityService identityService)
        {
            // On demande au package de vérifier l'utilisateur actuel pour l'application "GestPR"
            var user = identityService.GetUserFromSession(HttpContext, "GestPR");

            if (!user.IsAuthenticated)
            {
                return Unauthorized($"Accès refusé. Le matricule {user.Username} n'est pas autorisé sur la gestion des prix de revient");
            }
            return Ok(new
            {
                Message = "Connecté via StarLdapSolution",
                Username = user.Username,
                Nom = user.Nom,
                Prenom = user.Prenom,
                Role = user.Role,
            });
        }



        //R2CUP2RER LES UTILISATEUR pour l(affichage
        [HttpGet("utilisateurs")]
        public IActionResult GetAllUtilisateurs()
        {
            var liste = new List<object>();

            using (var connection = new SqlConnection(_identityConnectionString))
            {
                // On récupère uniquement les utilisateurs liés à l'application "GestPR"
                string query = "SELECT Id, AdUsername, Role, Nom, Prenom, Mail, Fixe, Site FROM ApplicationUsers WHERE ApplicationName = 'GestPR'";
                using (var command = new SqlCommand(query, connection))
                {
                    connection.Open();
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            liste.Add(new
                            {
                                id = Convert.ToInt32(reader["Id"]),
                                matricule = reader["AdUsername"].ToString(),
                                role = reader["Role"].ToString(),
                                nom = reader["Nom"].ToString(),
                                prenom = reader["Prenom"].ToString(),
                                mail = reader["Mail"].ToString(),  // Récupère le vrai mail
                                fixe = reader["Fixe"].ToString(),  // Récupère le vrai fixe
                                site = reader["Site"].ToString()   // Récupère le vrai site
                            });
                        }
                    }
                }
            }
            return Ok(liste);
        }
        // ==========================================
        // 3. CREER UN NOUVEL UTILISATEUR (POST)
        // ==========================================

        [HttpPost("utilisateurs")]
        public IActionResult CreateUtilisateur([FromBody] NewUserDto model)
        {
            if (string.IsNullOrEmpty(model.Matricule)) return BadRequest("Le matricule est obligatoire.");

            // Automatisation du suffixe de l'adresse mail
            string emailComplet = "";
            if (!string.IsNullOrEmpty(model.MailPrefix))
            {
                emailComplet = $"{model.MailPrefix.Trim()}@castel-afrique.com";
            }

            using (var connection = new SqlConnection(_identityConnectionString))
            {
                string query = @"INSERT INTO ApplicationUsers (AdUsername, ApplicationName, Role, IsActive, Nom, Prenom, Mail, Fixe, Site) 
                        VALUES (@username, 'GestPR', @role, 1, @nom, @prenom, @mail, @fixe, @site)";

                using (var command = new SqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@username", model.Matricule);
                    command.Parameters.AddWithValue("@role", string.IsNullOrEmpty(model.Role) ? "Demandeur" : model.Role);
                    command.Parameters.AddWithValue("@nom", model.Nom ?? "");
                    command.Parameters.AddWithValue("@prenom", model.Prenom ?? "");
                    command.Parameters.AddWithValue("@mail", emailComplet);
                    command.Parameters.AddWithValue("@fixe", model.Fixe ?? "");
                    command.Parameters.AddWithValue("@site", string.IsNullOrEmpty(model.Site) ? "STAR" : model.Site);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            return Ok(new { Message = "Utilisateur créé avec succès !" });
        }

        // ==========================================
        // 4. MODIFIER UN UTILISATEUR (PUT pour l'édition inline)
        // ==========================================
        [HttpPut("utilisateurs/{id}")]
        public IActionResult UpdateUtilisateur(int id, [FromBody] NewUserDto model)
        {
            if (string.IsNullOrEmpty(model.Matricule)) return BadRequest("Le matricule est obligatoire.");

            // Automatisation du suffixe si un préfixe est fourni, sinon on garde une chaîne vide
            string emailComplet = "";
            if (!string.IsNullOrEmpty(model.MailPrefix))
            {
                // Si l'utilisateur tape déjà le mail complet par erreur, on évite le doublon
                emailComplet = model.MailPrefix.Contains("@")
                    ? model.MailPrefix.Trim()
                    : $"{model.MailPrefix.Trim()}@castel-afrique.com";
            }

            using (var connection = new SqlConnection(_identityConnectionString))
            {
                string query = @"UPDATE ApplicationUsers 
                        SET AdUsername = @username, 
                            Role = @role, 
                            Nom = @nom, 
                            Prenom = @prenom,
                            Mail = @mail,
                            Fixe = @fixe,
                            Site = @site
                        WHERE Id = @id AND ApplicationName = 'GestPR'";

                using (var command = new SqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@id", id);
                    command.Parameters.AddWithValue("@username", model.Matricule);
                    command.Parameters.AddWithValue("@role", string.IsNullOrEmpty(model.Role) ? "Demandeur" : model.Role);
                    command.Parameters.AddWithValue("@nom", model.Nom ?? "");
                    command.Parameters.AddWithValue("@prenom", model.Prenom ?? "");
                    command.Parameters.AddWithValue("@mail", emailComplet);
                    command.Parameters.AddWithValue("@fixe", model.Fixe ?? "");
                    command.Parameters.AddWithValue("@site", string.IsNullOrEmpty(model.Site) ? "STAR" : model.Site);
                    connection.Open();
                    int rows = command.ExecuteNonQuery();
                    if (rows == 0) return NotFound("Utilisateur non trouvé.");
                }
            }
            return NoContent();
        }

        // ==========================================
        // 5. SUPPRIMER UN UTILISATEUR (DELETE)
        // ==========================================
        [HttpDelete("utilisateurs/{id}")]
        public IActionResult DeleteUtilisateur(int id)
        {
            using (var connection = new SqlConnection(_identityConnectionString))
            {
                // On sécurise la suppression en s'assurant qu'il s'agit bien d'un utilisateur de GestPR
                string query = "DELETE FROM ApplicationUsers WHERE Id = @id AND ApplicationName = 'GestPR'";

                using (var command = new SqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@id", id);

                    connection.Open();
                    int rowsAffected = command.ExecuteNonQuery();

                    if (rowsAffected == 0)
                        return NotFound("Utilisateur non trouvé ou n'appartient pas à l'application GestPR.");
                }
            }
            return NoContent(); // Code 204 : Suppression réussie sans contenu en retour
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