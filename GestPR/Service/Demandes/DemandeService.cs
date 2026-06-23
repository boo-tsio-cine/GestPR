// Service/DemandeService.cs
using GestPR.Dtos;
using GestPR.Models;
using GestPR.Repository;

using GestPR.Repository.Demandes;

using GestPR.Service.Demandes;

namespace GestPR.Service
{
    public class DemandeService : IDemandeService
    {
        private readonly IDemandeRepository _repo;

        public DemandeService(IDemandeRepository repo)
        {
            _repo = repo;
        }

        // Récupère les demandes d'un utilisateur
        public async Task<IEnumerable<DemandeAvecArticleResponseDto>> GetByUserAsync(
            int DemandeurId)
        {
            var demandes = await _repo.GetByUserAsync(DemandeurId);
            return demandes.Select(MapToDto);
        }

        // Récupère une demande par Id
        public async Task<DemandeAvecArticleResponseDto> GetByIdAsync(int id)
        {
            var demande = await _repo.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Demande {id} introuvable");
            return MapToDto(demande);
        }

        // Crée une demande avec ses articles
        public async Task<DemandeAvecArticleResponseDto> CreateAvecArticlesAsync(
            DemandeAvecArticleCreateDto dto)
        {

            if (!await _repo.UserExistsAsync(dto.DemandeurId))
                throw new ArgumentException($"Utilisateur {dto.DemandeurId} introuvable");


            // 1. Validation
            if (dto.Articles == null || dto.Articles.Count == 0)
                throw new ArgumentException(
                    "La demande doit contenir au moins un article");

            foreach (var a in dto.Articles)
            {
                if (string.IsNullOrWhiteSpace(a.CodeLot))
                    throw new ArgumentException("Le Code Lot est obligatoire");
                if (string.IsNullOrWhiteSpace(a.Designation))
                    throw new ArgumentException("La Désignation est obligatoire");
            }

            // 2. Construire la demande
            var demande = new Demande
            {
                DemandeurId = dto.DemandeurId,
                Motif = dto.Motif ?? "En attente",
                Status = "Nouvelle",
                DateTime = DateTime.UtcNow
            };

            // 3. Construire les articles
            var articles = dto.Articles.Select(a => new Article
            {
                CodeLot = a.CodeLot.Trim().ToUpper(),
                Designation = a.Designation.Trim(),
            }).ToList();

            // 4. Sauvegarder en transaction
            var created = await _repo.CreateAvecArticleAsync(demande, articles);

            return MapToDto(created);
        }

        // Conversion Model → DTO
        private static DemandeAvecArticleResponseDto MapToDto(Demande d) => new()
        {
            Id = d.Id,
            Status = d.Status ?? "",
            Motif = d.Motif ?? "",
            DateTime = d.DateTime,
            DemandeurId = d.DemandeurId,
            Articles = d.Articles.Select(a => new ArticleResponseDto
            {
                Id = a.Id,
                CodeLot = a.CodeLot,
                Designation = a.Designation,
                DemandeId = d.Id,
            }).ToList()
        };
    }
}