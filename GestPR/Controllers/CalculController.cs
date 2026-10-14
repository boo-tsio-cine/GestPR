using Microsoft.AspNetCore.Mvc;
using GestPR.Services;
using GestPR.DTOs;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CalculController : ControllerBase
    {
        private readonly CalculMetierService _calculService;

        public CalculController()
        {
            _calculService = new CalculMetierService();
        }

        [HttpPost("simulateur")]
        public IActionResult SimulerCalcul([FromBody] SimulationRequestDto request)
        {
            // 1. Conversion en Ariary
            decimal fobAriary = _calculService.ConvertirEnAriary(request.MontantFobDevise, request.TauxChange);

            // 2. Calcul des articles avec répartition au prorata
            var articlesCalcules = _calculService.CalculerRepartitionProrata(request.Articles, request.TotalFrais);

            // 3. Calcul du prix de revient unitaire pour chaque article
            foreach (var article in articlesCalcules)
            {
                decimal articleFobAriary = _calculService.ConvertirEnAriary(article.MontantFobDevise, request.TauxChange);
                article.PrixDeRevientUnitaire = _calculService.CalculerPrixRevientUnitaire(
                    articleFobAriary,
                    article.FraisProratises,
                    request.DroitsDouane,
                    article.Quantite
                );
            }

            return Ok(new
            {
                FobAriaryTotal = fobAriary,
                Articles = articlesCalcules
            });
        }
    }

    public class SimulationRequestDto
    {
        public decimal MontantFobDevise { get; set; }
        public decimal TauxChange { get; set; }
        public decimal TotalFrais { get; set; }
        public decimal DroitsDouane { get; set; }
        public List<ArticleCalculDto> Articles { get; set; } = new();
    }
}