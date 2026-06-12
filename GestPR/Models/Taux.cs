using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestPR.Models
{
    public class Taux
    {


        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Nom { get; set; } = string.Empty;


        [Required]
        [MaxLength(100)]
        public string cle { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(18,4)")]
        public decimal valeur { get; set; }

        [Required]
        [MaxLength(100)]
        public string unite { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string description {  get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string produit { get; set; } = string.Empty ;


        public ICollection<TauxHistorique> TauxHistoriques { get; set; } = new List<TauxHistorique>();
    }

    public class TauxHistorique
    {
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
        public int TauxId { get; set; }

        [ForeignKey("TauxId")]

        public Taux? Taux { get; set; }
    }
}
