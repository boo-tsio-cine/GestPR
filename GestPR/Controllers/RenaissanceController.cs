using GestPR.Dtos;
using GestPR.Service.Renaissance;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("ApiRenaissance")]
    public class RenaissanceController : ControllerBase
    {
        private readonly RenaissanceService _renaissanceService;

        public RenaissanceController(RenaissanceService renaissanceService)
        {
            _renaissanceService = renaissanceService;
        }

        // GET api/renaissance/articles?codeArticle=PREFORME
        [HttpGet("Articles")]
        public async Task<IActionResult> RechercherArticles([FromQuery] string codeArticle)
        {
            if (string.IsNullOrWhiteSpace(codeArticle))
            {
                return BadRequest(ApiResponse<object>.Fail("Le paramètre codeArticle est requis."));
            }

            try
            {
                var partCodes = await _renaissanceService.RechercherPartCodesAsync(codeArticle);
                return Ok(ApiResponse<object>.Ok(partCodes));
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(502, ApiResponse<object>.Fail($"Erreur HTTP Renaissance : {ex.Message}"));
            }
            catch (Exception ex)
            {
                // Retourne le vrai message d'erreur au lieu de l'erreur 500 brute
                return StatusCode(500, ApiResponse<object>.Fail($"Erreur interne backend : {ex.Message}"));
            }
        }
    }
}