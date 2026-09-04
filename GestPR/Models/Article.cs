using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // 👈 Cette ligne manquante règle les 2 erreurs d'un coup !

namespace GestPR.Models
{
    public class Article
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string CodeLot { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string CodeArticle { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string DescArticle { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Designation { get; set; } = string.Empty;

        [Required]
        public int DemandeId { get; set; }

        // 💰 Nouvelle colonne pour stocker le prix de revient (PU en Ariary)
        [Column(TypeName = "decimal(18,4)")]
        public decimal PrixDeRevient { get; set; }
    }
}