using GestPR.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{


    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly DatasetExtractionService _datasetService;

        public AdminController(DatasetExtractionService datasetService)
        {
            _datasetService = datasetService;
        }

        [HttpPost("dataset/regenerer")]
        [AllowAnonymous]   // temporaire, pour tester
        public async Task<IActionResult> RegenererDataset()
        {
            var resultat = await _datasetService.ExtraireEtNettoyerAsync();
            return Ok(resultat);
        }

        [HttpGet("ping")]
        [AllowAnonymous]   // pour éliminer l'authentification de l'équation
        public IActionResult Ping() => Ok("pong");
    }

}
