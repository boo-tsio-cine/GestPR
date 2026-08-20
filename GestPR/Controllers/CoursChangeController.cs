using GestPR.Dtos;
using GestPR.Service;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CoursChangeController : ControllerBase
    {
        private readonly CoursChangeService _coursChangeService;

        public CoursChangeController(CoursChangeService coursChangeService)
        {
            _coursChangeService = coursChangeService;
        }

        // GET api/coursChange/Dollar
        [HttpGet("{devise}")]
        public async Task<IActionResult> GetDernierCours(string devise)
        {
            var cours = await _coursChangeService.GetDernierCoursAsync(devise);

            if (cours == null)
            {
                return Ok(ApiResponse<object>.Ok(new { devise, cours = (decimal?)null },
                    "Aucun cours en cache pour cette devise, saisie manuelle requise."));
            }

            return Ok(ApiResponse<object>.Ok(new { devise, cours }));
        }
    }
}
