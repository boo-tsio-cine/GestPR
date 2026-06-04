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
        }
}
