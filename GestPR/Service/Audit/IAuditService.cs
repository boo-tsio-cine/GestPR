using GestPR.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GestPR.Service.Audit
{
    public interface IAuditService
    {
        Task LogActionAsync(AuditLog log);

        Task LogActionAsync(
            string entityName,
            int demandeId,
            int utilisateurId,
            string action,
            string nouveauStatut = "",
            string? ancienStatut = null,
            string? commentaire = null,
            object? details = null);

        Task<IEnumerable<AuditLog>> GetLogsByDemandeIdAsync(int demandeId);
        Task<IEnumerable<AuditLog>> GetLogsByEntityAsync(string entityName, int entityId);
    }
}