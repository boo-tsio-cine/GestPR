
using GestPR.Dtos;
using GestPR.Service.MachineLearning;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnomalyDetectionController : ControllerBase
    {
        private readonly AnomalyDetectionService _anomalyService;

        private readonly AchatDatasetService _datasetService;

        public AnomalyDetectionController(AnomalyDetectionService anomalyService, AchatDatasetService datasetService)
        {
            _anomalyService = anomalyService;
            _datasetService = datasetService;
        }

        // POST api/anomalydetection/train
        // Entraîne le modèle sur l'historique actuel des achats et le sauvegarde sur disque
        [HttpPost("train")]
        public async Task<IActionResult> Train([FromQuery] bool excludeTestData = true)
        {
            try
            {
                var (nbLignes, aExclu, modelPath) = await _anomalyService.TrainAndSaveAsync(excludeTestData);

                return Ok(ApiResponse<object>.Ok(new
                {
                    nbLignesUtilisees = nbLignes,
                    donneesDeTestExclues = aExclu,
                    modelPath
                }, "Modèle entraîné et sauvegardé avec succès."));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }

        // GET api/anomalydetection/detect
        // Score l'historique actuel des achats avec le dernier modèle entraîné
        [HttpGet("detect")]
        public async Task<IActionResult> Detect()
        {
            try
            {
                var resultats = await _anomalyService.DetectAsync();
                return Ok(ApiResponse<object>.Ok(resultats));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }



        // GET api/anomalydetection/ecarts-codelot
        // Alerte simple (sans ML.NET) : repère les CodeLot ayant plusieurs lignes avec des prix
        // très différents entre elles (ex: même lot saisi deux fois avec des écarts suspects)
        [HttpGet("ecarts-codelot")]
        public async Task<IActionResult> EcartsCodeLot([FromQuery] double seuilPourcent = 20)
        {
            var resultats = await _datasetService.GetEcartsCodeLotAsync(seuilPourcent);
            return Ok(ApiResponse<object>.Ok(resultats));
        }
        // POST api/anomalydetection/analyser
        // Analyse une ligne d'achat à l'essai (pas encore enregistrée) et retourne un score d'anomalie immédiat
        [HttpPost("analyser")]
        public async Task<IActionResult> AnalyserPrix([FromBody] AnalysePrixRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Designation))
            {
                return BadRequest(ApiResponse<object>.Fail("La désignation est requise."));
            }

            try
            {
                var resultat = await _anomalyService.AnalyserPrixAsync(dto.Designation, dto.CodeLot, dto.PrixDeRevient);
                return Ok(ApiResponse<object>.Ok(resultat));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
