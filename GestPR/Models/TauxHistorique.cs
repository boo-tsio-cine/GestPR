using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestPR.Models
{
    public class TauxHistorique
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string NomTaux { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(18,4)")]
        public decimal AncienValeur { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,4)")]
        public decimal NouvelleValeur { get; set; }

        //[Required]
        public DateTime DateTime { get; set; } = DateTime.UtcNow;

    }
}
