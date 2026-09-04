using System.ComponentModel.DataAnnotations;

namespace GestPR.Models
{
    public class Demande
    {
        public int Id { get; set; }

        
        [MaxLength(100)]
        public string Status { get; set; } = "Nouvelle";

        [MaxLength(100)]
        public string Motif { get; set; } = "En attente" ;

        [MaxLength(255)]
        public string? PdfFileName { get; set; }

        [MaxLength(1000)]
        public string? Commentaire { get; set; }

        [MaxLength(100)]
        public string CodeSociete { get; set; } = "";

        [MaxLength(100)]
        public string CodeMagasin { get; set; } = "";



        [Required]
        public DateTime DateTime { get; set; } = DateTime.UtcNow;



        // === Clé étrangère (IMPORTANT) ===
        public int DemandeurId { get; set; }

        // === Propriété de navigation ===
        public ApplicationUser? Demandeur { get; set; }

        public ICollection<Article> Articles { get; set; } = new List<Article>();


    }
}
