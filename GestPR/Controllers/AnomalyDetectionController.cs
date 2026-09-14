using GestPR.Dtos;
using GestPR.Models;
using GestPR.Service.Anomalies;
using GestPR.Service.MachineLearning;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/AnomalyDetection")]
    public class AnomalyDetectionController : ControllerBase
    {
        private readonly IAnomalyDetectionService _anomalyService;
        private readonly IEvaluationService _evaluationService;

        public AnomalyDetectionController(IAnomalyDetectionService anomalyService, IEvaluationService evaluationService)
        {
            _anomalyService = anomalyService;
            _evaluationService = evaluationService;
        }

        // Appelé par anomalyService.analyserPrix(designation, codeLot, prixDeRevient) côté React,
        // avec debounce de 1s pendant la saisie du prix (traitementDemande.jsx)
        [HttpPost("analyser")]
        public async Task<IActionResult> Analyser([FromBody] AnalyserPrixRequestDto? dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Designation) || dto.PrixDeRevient <= 0)
            {
                return BadRequest(ApiResponse<object>.Fail("Désignation et prix de revient requis pour l'analyse."));
            }

            var result = await _anomalyService.AnalyserPrixAsync(dto.Designation, dto.CodeLot, dto.PrixDeRevient);

            return Ok(ApiResponse<AnomalyResultDto>.Ok(result));
        }

        // A usage ponctuel (memoire / demo) : compare heuristique et ML sur les vraies donnees validees.
        // Pas appele par le front - a lancer manuellement une fois le dataset disponible.
        [HttpGet("evaluation")]
        public async Task<IActionResult> Evaluer()
        {
            var resultat = await _evaluationService.EvaluerAsync();
            return Ok(ApiResponse<ResultatEvaluationDto>.Ok(resultat));
        }
    }
}