using System.ComponentModel.DataAnnotations;

namespace GestPR.Models
{
    public class Demande
    {
        public int Id { get; set; }


        [MaxLength(100)]
        public string Status { get; set; } = "Nouvelle";

        [MaxLength(100)]
        public string Motif { get; set; } = "En attente";

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

        // =====================================================================
        // Ajouts pour l'estimation ML du delai de validation + mail de relance
        // =====================================================================

        // Date a laquelle la demande entre en attente de validation
        // (remplie dans SoumettreDemandeAsync, au moment ou Status passe a "En cours")
        public DateTime? DateTransmissionValidation { get; set; }

        // Date de la decision finale du validateur (remplie dans UpdateStatusAsync)
        public DateTime? DateValidation { get; set; }

        // Qui a pris la decision finale (null tant que la demande n'est pas tranchee)
        public int? ValidateurId { get; set; }
        public ApplicationUser? Validateur { get; set; }

        // Derniere fois qu'un mail de relance a ete envoye pour cette demande
        // (evite de spammer les validateurs a chaque execution du job planifie).
        public DateTime? DateDerniereRelance { get; set; }
    }
}