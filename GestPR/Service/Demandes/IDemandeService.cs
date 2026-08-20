using GestPR.Dtos;
using GestPR.Models;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GestPR.Service.Demandes
{
    public interface IDemandeService
    {
        Task<IEnumerable<DemandeAvecArticleResponseDto>> GetByUserAsync(int DemandeurId);
        Task<DemandeAvecArticleResponseDto> GetByIdAsync(int id);
        Task<IEnumerable<DemandeAvecArticleResponseDto>> GetAllAsync();
        Task<DemandeAvecArticleResponseDto> CreateAvecArticlesAsync(DemandeAvecArticleCreateDto dto);
        Task<bool> SoumettreDemandeAsync(int id, IFormFile? pdfFile, string articlesJson, string? commentaire, string? typeDossier, string? immo, string? devise, decimal? cours);
        Task<bool> UpdateStatusAsync(int id, string nouveauStatut, string motifDecision);

        // 🕒 Déclaration manquante pour le contrôleur :
        Task<IEnumerable<object>> GetHistoriqueByDesignationAsync(string designation);
        Task<IEnumerable<AuditLog>> GetAuditLogsAsync(int demandeId);
    }
}