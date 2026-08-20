using GestPR.Dtos;
using GestPR.Models;
using GestPR.Service;
using GestPR.Service.Audit;
using GestPR.Service.Demandes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/demandes")]
    public class DemandeController : ControllerBase
    {
        private readonly IDemandeService _service;
        private readonly IAuditService _auditService;

        public DemandeController(IDemandeService service, IAuditService auditService)
        {
            _service = service;
            _auditService = auditService;
        }

        [HttpGet]
        public async Task<IActionResult> GetByUser([FromQuery] int idDemandeur)
        {
            var demandes = await _service.GetByUserAsync(idDemandeur);
            return Ok(demandes);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var demande = await _service.GetByIdAsync(id);

                if(demande == null)
                {
                    return NotFound(ApiResponse<object>.Fail($"La demande avec l'ID {id} n'existe pas."));
                }

                return Ok(ApiResponse<object>.Ok(demande));
            }
            catch (KeyNotFoundException)
            {
                // 🟢 Harmonisation avec le format ApiResponse pour éviter de casser la structure JSON côté React
                return NotFound(ApiResponse<object>.Fail($"Demande {id} introuvable."));
            }
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllAsync()
        {
            var returndemandes = await _service.GetAllAsync();
            return Ok(returndemandes);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] DemandeAvecArticleCreateDto dto)
        {
            //try
            //{
            //    var created = await _service.CreateAvecArticlesAsync(dto);

            //    // AUDIT MONGODB (Sécurisé)
            //    try
            //    {
            //        await _auditService.LogActionAsync(
            //            entityName: "Demande",
            //            demandeId: created.Id,
            //            utilisateurId: dto.DemandeurId,
            //            action: "Création",
            //            nouveauStatut: "Nouvelle"
            //        );
            //    }
            //    catch (Exception auditEx)
            //    {
            //        Console.WriteLine($"[AUDIT MONGODB WARNING] {auditEx.Message}");
            //    }

            //    return Ok(created);
            //}
            //catch (ArgumentException ex)
            //{
            //    return BadRequest(new { message = ex.Message });
            //}

            var result = await _service.CreateAvecArticlesAsync(dto);
            return Ok(ApiResponse<DemandeAvecArticleResponseDto>.Ok(result, "Demande créée avec succès"));
        }

        [HttpPost("{id}/soumettre")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SoumettreTraitement([FromRoute] int id, [FromForm] SoumettreDemandeDto dto)
        {
            try
            {
                var reussite = await _service.SoumettreDemandeAsync(id, dto.PdfFile, dto.Articles, dto.Commentaire, dto.TypeDossier, dto.Immo, dto.Devise, dto.Cours);
                if (!reussite) return NotFound(new { message = "Demande introuvable" });

                string matriculeClaim = User.FindFirst("matricule")?.Value
                    ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? "0";
                int.TryParse(matriculeClaim, out int userId);

                // AUDIT MONGODB : Conversion de 'details' en String JSON pour éviter le BsonSerializationException
                try
                {
                    var detailsPayload = JsonSerializer.Serialize(new
                    {
                        dto.TypeDossier,
                        dto.Immo,
                        Fichier = dto.PdfFile?.FileName
                    });

                    await _auditService.LogActionAsync(
                        entityName: "Demande",
                        demandeId: id,
                        utilisateurId: userId,
                        action: "SoumettreDemande",
                        nouveauStatut: "En attente",
                        commentaire: dto.Commentaire,
                        details: detailsPayload
                    );
                }
                catch (Exception auditEx)
                {
                    Console.WriteLine($"[AUDIT MONGODB WARNING] {auditEx.Message}");
                }

                return Ok(new { message = "Traitement et commentaires enregistrés avec succès." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Erreur lors du traitement : {ex.Message}" });
            }
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var success = await _service.UpdateStatusAsync(id, dto.Status, dto.Motif);
            if (!success) return NotFound(new { message = "Demande introuvable." });

            string matriculeClaim = User.FindFirst("matricule")?.Value
                ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? "0";
            int.TryParse(matriculeClaim, out int userId);

            // AUDIT MONGODB : Utilisation de la même signature de méthode
            try
            {
                string actionName = dto.Status.Equals("Validé", StringComparison.OrdinalIgnoreCase) ? "Validation" : "ChangementStatut";

                await _auditService.LogActionAsync(
                    entityName: "Demande",
                    demandeId: id,
                    utilisateurId: userId,
                    action: actionName,
                    nouveauStatut: dto.Status,
                    commentaire: dto.Motif
                );
            }
            catch (Exception auditEx)
            {
                Console.WriteLine($"[AUDIT MONGODB WARNING] {auditEx.Message}");
            }

            return Ok(new { message = $"Statut mis à jour à {dto.Status}." });
        }

        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> GetPdf(int id)
        {
            var demande = await _service.GetByIdAsync(id);
            if (demande == null || string.IsNullOrEmpty(demande.PdfFileName))
                return NotFound("Fichier non trouvé");

            return Redirect($"/uploads/pdfs/{demande.PdfFileName}");
        }

        [HttpGet("historique/{designation}")]
        public async Task<IActionResult> GetHistorique(string designation)
        {
            var result = await _service.GetHistoriqueByDesignationAsync(designation);
            return Ok(result);
        }

        [HttpGet("{id}/audit")]
        public async Task<IActionResult> GetAuditLogs(int id)
        {
            var logs = await _service.GetAuditLogsAsync(id);
            return Ok(ApiResponse<IEnumerable<AuditLog>>.Ok(logs));
        }
    }
}