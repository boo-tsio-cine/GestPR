
using GestPR.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GestPR.Models;


namespace GestPR.Controllers
{

    [ApiController]
    [Route("api/auth")]

    public class AuthController : ControllerBase
    {


        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

       public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // ─────────────────────────────────────────────────────
        // POST: api/auth/inscription
        // L'utilisateur définit son mot de passe pour la 1ère fois
        // ─────────────────────────────────────────────────────

        [HttpPost("inscription")]
        public async Task<IActionResult> Inscription([FromBody] InscriptionDto dto)
        {
            // 1. Vérifier que le matricule existe (enregistré par l'admin)
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Matricule == dto.Matricule);

            if (user == null)
                return BadRequest("Ce matricule n'est pas enregistré. Contactez l'administrateur.");

            // 2. Vérifier que l'utilisateur n'a pas déjà un mot de passe
            if (!string.IsNullOrEmpty(user.PasswordHash))
                return BadRequest("Ce compte a déjà un mot de passe. Utilisez la page de connexion.");

            // 3. Hasher et enregistrer le mot de passe
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            await _context.SaveChangesAsync();

            return Ok("Mot de passe créé avec succès. Vous pouvez maintenant vous connecter.");
        
        
        }


        // ─────────────────────────────────────────────────────
        // POST: api/auth/connexion
        // L'utilisateur se connecte avec matricule + mot de passe
        // ─────────────────────────────────────────────────────

        [HttpPost("connexion")]
        public async Task<IActionResult> Connexion([FromBody] ConnectionDto dto)
        {
            //1 - chercher l'utilisateur par matricule
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Matricule == dto.Matricule);


            if (user == null)
                return Unauthorized("Matricule ou mot de passe incorrect.");

            //2- Vérifier que le compte a un mot de passe
            if (string.IsNullOrEmpty(user.PasswordHash))
                return BadRequest("Vous n'avez pas encore de mot de passe. Veuillez vous inscrire d'abord.");

            //3- Vérifier le mot de passe
            bool motDePasseValide = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);

            if (!motDePasseValide)
                return Unauthorized("Matricule ou mot de passe incorrect.");

            //4- Générer le JWT Token
            var token = GenererToken(user);

            return Ok(new
            {
                token = token,
                role = user.Role,
                nom = user.Nom,
                prenom = user.Prenom,
                matricule = user.Matricule
            });

            // ─────────────────────────────────────────────────────
            // Méthode privée — Générer le JWT Token
            // ─────────────────────────────────────────────────────

            

        }

        private string GenererToken(User user)
        {
            var claims = new[]

            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name,           user.Matricule),
                new Claim(ClaimTypes.Role,           user.Role ?? ""),
                new Claim("nom",                     user.Nom),
                new Claim("prenom",                  user.Prenom),
            };

            var key = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(

                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
             );

            return new JwtSecurityTokenHandler().WriteToken(token);

        }

        // ─────────────────────────────────────────────────────────
        // DTOs — Objets de transfert de données
        // ─────────────────────────────────────────────────────────

        public class InscriptionDto
        {
            public string Matricule { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        public class ConnectionDto
        {
            public string Matricule { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }


    }
}
