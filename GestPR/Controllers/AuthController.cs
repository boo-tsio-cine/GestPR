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

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ILdapAuthenticationService _ldapService;

        // CORRECTION : Utilisation du bon nom d'interface ILdapAuthenticationService
        public AuthController(ILdapAuthenticationService ldapService)
        {
            _ldapService = ldapService;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { message = "Les identifiants sont requis." });
            }

            // 1. Nettoyer le login si l'utilisateur a tapé "domaine\login"
            string cleanUserName = _ldapService.GetIdentityLogin(request.Username);

            // 2. CORRECTION : Appel de AuthenticateUser (au lieu de Authenticated)
            bool isAuthenticated = _ldapService.AuthenticateUser(cleanUserName, request.Password);

            if (!isAuthenticated)
            {
                return Unauthorized(new
                {
                    message = "Identifiant ou mot de passe incorrect."
                });
            }

            // 3. Récupérer les informations de profil depuis l'AD
            var adUser = _ldapService.GetUserByUsername(cleanUserName);

            return Ok(new
            {
                message = "Connexion réussie",
                user = adUser
            });
        }
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}