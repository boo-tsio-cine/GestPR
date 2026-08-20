using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestPR.Models; // Adaptez à votre namespace

public class ParametreFrais
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(50)]
    public string TypeMatiere { get; set; } = string.Empty; // ex: "Malt", "Sucre", "Canette"

    [Required]
    [StringLength(20)]
    public string CodeFrais { get; set; } = string.Empty;   // ex: "FRET", "DOUANE"

    [Required]
    [StringLength(100)]
    public string Libelle { get; set; } = string.Empty;     // ex: "Droits de Douane"

    [Column(TypeName = "decimal(18,2)")]
    public decimal ValeurParDefaut { get; set; }            // ex: 5.0

    public bool EstPourcentage { get; set; }                // true = %, false = Fixe
}