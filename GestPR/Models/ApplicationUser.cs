using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestPR.Models
{
    //[Table("ApplicationUsers", Schema = "dbo")]
    public class ApplicationUser
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string AdUsername { get; set; } = null!;

        [Required]
        [StringLength(150)]
        public string ApplicationName { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string Role { get; set; } = null!;

        public int IsActive { get; set; } // 1 pour Actif, 0 pour Inactif d'après ton screen

        [StringLength(100)]
        public string? Nom { get; set; }

        [StringLength(100)]
        public string? Prenom { get; set; }

        [StringLength(150)]
        public string? Mail { get; set; }

        [StringLength(50)]
        public string? Fixe { get; set; }

        [StringLength(100)]
        public string? Site { get; set; }
    }
}