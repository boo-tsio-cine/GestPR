using System.ComponentModel.DataAnnotations;

namespace GestPR.Models
{
    public class Article
    {
        public int Id { get; set; }

        [Required]
        public int IdDemande { get; set; }

        [Required]
        [MaxLength(100)]
        public string CodeLot { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Designation { get; set; } = string.Empty;

        //Navigation
        public Demande? Demande { get; set; }
    }
}
