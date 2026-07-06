// Controllers/DemandeController.cs
using GestPR.Dtos;
using GestPR.Service.Demandes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/demandes")]
    public class DemandeController : ControllerBase
    {
        private readonly IDemandeService _service;

        public DemandeController(IDemandeService service)
        {
            _service = service;
        }

        // GET api/demandes?idDemandeur=1
        [HttpGet]
        public async Task<IActionResult> GetByUser([FromQuery] int idDemandeur)
        {
            var demandes = await _service.GetByUserAsync(idDemandeur);
            return Ok(demandes);
        }

        // GET api/demandes/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var demande = await _service.GetByIdAsync(id);
                return Ok(demande);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Demande {id} introuvable" });
            }
        }

        // GET api/demandes/all
        [HttpGet("all")]
        public async Task<IActionResult> GetAllAsync()
        {
            var returndemandes = await _service.GetAllAsync();
            return Ok(returndemandes);
        }

        // POST api/demandes
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] DemandeAvecArticleCreateDto dto)
        {
            try
            {
                var created = await _service.CreateAvecArticlesAsync(dto);
                return Ok(created);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // 💡 SOUSETTRE PDF (La seule et unique méthode valide pour cette route)
        [HttpPost("{id}/soumettre")]
        [Consumes("multipart/form-data")] // Indique explicitement le type à Swagger
        public async Task<IActionResult> SoumettreTraitement([FromRoute] int id, [FromForm] SoumettreDemandeDto dto)
        {
            if (dto.PdfFile == null || dto.PdfFile.Length == 0)
            {
                return BadRequest("Fichier PDF manquant ou invalide.");
            }

            // Dans ton code de service, tu passeras : dto.PdfFile
            var resultat = await _service.SoumettreDemandeAsync(id, dto.PdfFile);

            if (!resultat) return NotFound("Demande introuvable.");

            return Ok(new { message = "Demande soumise avec succès." });
        }

        // PUT api/demandes/{id}/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var success = await _service.UpdateStatusAsync(id, dto.Status, dto.Motif);
            if (!success) return NotFound(new { message = "Demande introuvable." });

            return Ok(new { message = $"Statut mis à jour à {dto.Status}." });
        }

        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> GetPdf(int id)
        {
            var demande = await _service.GetByIdAsync(id);
            if (string.IsNullOrEmpty(demande.PdfFileName)) return NotFound("Fichier non trouvé");

            return Redirect($"/uploads/pdfs/{demande.PdfFileName}");
        }
    }
}