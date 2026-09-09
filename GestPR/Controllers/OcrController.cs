using GestPR.Dtos;
using GestPR.Service.Ocr;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OcrController : ControllerBase
    {
        private readonly OcrService _ocrService;

        public OcrController(OcrService ocrService)
        {
            _ocrService = ocrService;
        }

        // POST api/ocr/extraire-texte
        // Reçoit un fichier (PDF ou image) et retourne le texte brut extrait
        [HttpPost("extraire-texte")]
        public async Task<IActionResult> ExtraireTexte(IFormFile fichier)
        {
            if (fichier == null || fichier.Length == 0)
            {
                return BadRequest(ApiResponse<object>.Fail("Aucun fichier fourni."));
            }

            var extensionsAcceptees = new[] { ".pdf", ".png", ".jpg", ".jpeg" };
            var extension = Path.GetExtension(fichier.FileName).ToLowerInvariant();

            if (!extensionsAcceptees.Contains(extension))
            {
                return BadRequest(ApiResponse<object>.Fail(
                    $"Format non supporté ({extension}). Formats acceptés : {string.Join(", ", extensionsAcceptees)}"));
            }

            try
            {
                using var stream = fichier.OpenReadStream();
                var texte = await _ocrService.ExtraireTexteAsync(stream, fichier.FileName);

                return Ok(ApiResponse<object>.Ok(new
                {
                    nomFichier = fichier.FileName,
                    texteExtrait = texte,
                    nbCaracteres = texte.Length
                }));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.Fail($"Erreur lors de l'extraction OCR : {ex.Message}"));
            }
        }
    }
}
