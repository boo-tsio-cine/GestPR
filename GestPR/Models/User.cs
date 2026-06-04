using System.ComponentModel.DataAnnotations;

namespace GestPR.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Nom { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Prenom { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Matricule { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Mail { get; set; } = string.Empty;

        public string? Fixe { get; set; }

        [Required]
        [MaxLength(100)]
        public string Role { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Site { get; set; } = string.Empty;

        public DateTime DateTime   { get; set; } = DateTime.UtcNow;

        public string? PasswordHash {  get; set; }
    }
}
