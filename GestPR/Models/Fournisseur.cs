using System.ComponentModel.DataAnnotations;

namespace GestPR.Models
{
    public class Fournisseur
    {
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string nom_frs { get; set; } = string.Empty;
    }
}
