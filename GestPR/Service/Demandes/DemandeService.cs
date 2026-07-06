// Service/DemandeService.cs
using GestPR.Dtos;
using GestPR.Models;
using GestPR.Repository;
using Microsoft.AspNetCore.Http;
using GestPR.Repository.Demandes;
using GestPR.Service.Demandes;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

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
        public async Task<IEnumerable<DemandeAvecArticleResponseDto>> GetByUserAsync(int DemandeurId)
        {
            var demandes = await _repo.GetByUserAsync(DemandeurId);
            return demandes.Select(MapToDto);
        }

        public async Task<IEnumerable<DemandeAvecArticleResponseDto>> GetAllAsync()
        {
            var returnDemande = await _repo.GetAllAsync();
            return returnDemande.Select(MapToDto);
        }

        // Récupère une demande par Id
        public async Task<DemandeAvecArticleResponseDto> GetByIdAsync(int id)
        {
            var demande = await _repo.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Demande {id} introuvable");
            return MapToDto(demande);
        }

        // Crée une demande avec ses articles
        public async Task<DemandeAvecArticleResponseDto> CreateAvecArticlesAsync(DemandeAvecArticleCreateDto dto)
        {
            if (!await _repo.UserExistsAsync(dto.DemandeurId))
                throw new ArgumentException($"Utilisateur {dto.DemandeurId} introuvable");

            // 1. Validation
            if (dto.Articles == null || dto.Articles.Count == 0)
                throw new ArgumentException("La demande doit contenir au moins un article");

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

        // 💡 UN SEUL BLOC : Reçoit le fichier, génère le GUID unique et l'enregistre sur le disque dur
        public async Task<bool> SoumettreDemandeAsync(int id, IFormFile pdfFile)
        {
            var demande = await _repo.GetByIdAsync(id);
            if (demande == null) return false;

            if (pdfFile != null && pdfFile.Length > 0)
            {
                var dossierStockage = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "pdfs");
                if (!Directory.Exists(dossierStockage))
                {
                    Directory.CreateDirectory(dossierStockage);
                }

                var extension = Path.GetExtension(pdfFile.FileName);
                var nomUniqueFichier = $"{Guid.NewGuid()}{extension}";
                var cheminComplet = Path.Combine(dossierStockage, nomUniqueFichier);

                using (var stream = new FileStream(cheminComplet, FileMode.Create))
                {
                    await pdfFile.CopyToAsync(stream);
                }

                demande.PdfFileName = nomUniqueFichier;
            }

            demande.Status = "En cours";
            await _repo.SaveChangesAsync();
            return true;
        }

        // 💡 Prise de décision finale + modification du motif
        public async Task<bool> UpdateStatusAsync(int id, string nouveauStatut, string motifDecision)
        {
            var demande = await _repo.GetByIdAsync(id);
            if (demande == null) return false;

            demande.Status = nouveauStatut;
            if (!string.IsNullOrWhiteSpace(motifDecision))
            {
                demande.Motif = motifDecision; // Met à jour le motif avec la raison du validateur
            }

            await _repo.SaveChangesAsync();
            return true;
        }

        // Conversion Model → DTO
        private static DemandeAvecArticleResponseDto MapToDto(Demande d) => new()
        {
            Id = d.Id,
            Status = d.Status ?? "",
            Motif = d.Motif ?? "",
            DateTime = d.DateTime,
            DemandeurId = d.DemandeurId,
            PdfFileName = d.PdfFileName,
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