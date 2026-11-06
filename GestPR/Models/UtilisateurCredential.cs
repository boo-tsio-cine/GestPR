using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestPR.Models
{
    [Table("UtilisateurCredentials")]
    public class UtilisateurCredential
    {
        [Key] public int Id { get; set; }
        public int ApplicationUserId { get; set; }
        [Required, MaxLength(100)] public string PasswordHash { get; set; } = "";
        public DateTime DateCreation { get; set; } = DateTime.UtcNow;
    }
}
