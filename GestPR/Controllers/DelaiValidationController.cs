using GestPR.Dtos;
using GestPR.Service.MachineLearning;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{
    public class PredireDelaiRequestDto
    {
        public double Montant { get; set; }
        public int ValidateurId { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class DelaiValidationController : ControllerBase
    {
        private readonly DelaiValidationService _delaiService;

        public DelaiValidationController(DelaiValidationService delaiService)
        {
            _delaiService = delaiService;
        }

        // POST api/delaivalidation/train
        [HttpPost("train")]
        public async Task<IActionResult> Train()
        {
            try
            {
                var (nbLignes, nbSansAudit, modelPath) = await _delaiService.TrainAndSaveAsync();

                return Ok(ApiResponse<object>.Ok(new
                {
                    nbLignesUtilisees = nbLignes,
                    nbDemandesSansAuditTrail = nbSansAudit,
                    modelPath
                }, "Modèle de délai de validation entraîné et sauvegardé avec succès."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // POST api/delaivalidation/predire
        [HttpPost("predire")]
        public async Task<IActionResult> Predire([FromBody] PredireDelaiRequestDto dto)
        {
            try
            {
                var nbJours = await _delaiService.PredireAsync(dto.Montant, dto.ValidateurId);

                return Ok(ApiResponse<object>.Ok(new
                {
                    montant = dto.Montant,
                    validateurId = dto.ValidateurId,
                    delaiEstimeJours = Math.Round(nbJours, 1)
                }));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
