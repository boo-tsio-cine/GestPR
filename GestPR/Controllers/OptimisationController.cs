using Microsoft.AspNetCore.Mvc;
using GestPR.Service;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/optimisation")]
    public class OptimisationController : ControllerBase
    {
        private readonly OptimisationRepartitionService _optimisationService;

        public OptimisationController(OptimisationRepartitionService optimisationService)
        {
            _optimisationService = optimisationService;
        }

        [HttpPost("optimiser-repartition")]
        public IActionResult OptimiserRepartition([FromBody] List<ArticleContrainte> articles, [FromQuery] long budgetTotal)
        {
            var resultat = _optimisationService.Optimiser(articles, budgetTotal);
            return Ok(resultat);
        }
    }
}