using System.ComponentModel.DataAnnotations;

namespace GestPR.Models
{
    public class Demande
    {
        public int Id { get; set; }

        [Required]
        public int IdDemandeur { get; set; }

        public string? NumDossier { get; set; }  

        
        [MaxLength(100)]
        public string Status { get; set; } = "Nouvelle";

        [MaxLength(100)]
        public string Motif { get; set; } = "En attente" ;

        [Required]
        public DateTime DateTime { get; set; } = DateTime.UtcNow;

        //Navigation -ef Core
        public User? Demandeur { get; set; }

        public ICollection<Article> Articles { get; set; } = new List<Article>();


    }
}
