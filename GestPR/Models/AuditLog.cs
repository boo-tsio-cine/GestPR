using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace GestPR.Models
{
    public class AuditLog
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }
        public int DemandeId { get; set; } // ID de la demande associée à l'action
        public string Action { get; set; } = string.Empty;// ex: "TRAITEMENT_DEMANDE"
        public int UtilisateurId { get; set; } // ID de l'utilisateur qui a effectué l'action

        public string NomUtilisateur { get; set; } = string.Empty;
        public string PrenomUtilisateur { get; set; } = string.Empty;
        public string Matricule {  get; set; } = string.Empty;
        
        public DateTime DateAction { get; set; } = DateTime.UtcNow; // Date et heure de l'action
        public string? AncienStatut { get; set; } // Ancien statut de la demande (si applicable)
        public string NouveauStatut { get; set; } = string.Empty; // Nouveau statut de la demande (si applicable)
        public string? Commentaire { get; set; } // Commentaire facultatif sur l'action effectuée

        // Métadonnées libres sous forme de dictionnaire clé/valeur pour plus de flexibilité
        public object? Details { get; set; } // Détails supplémentaires sur l'action (peut être un objet JSON)
    }
}
