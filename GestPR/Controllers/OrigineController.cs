using GestPR.Dtos;
using GestPR.Service;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/origines")]
    public class OrigineController : ControllerBase
    {
        private readonly IOrigineService _service;

        public OrigineController(IOrigineService service)
        {
            _service = service;
        }

        // GET api/origines
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var origines = await _service.GetAllAsync();
            return Ok(origines);
        }

        //REécupérer nombre taux
        [HttpGet("count")]
        public async Task<ActionResult<int>> GetTotalOrigineCountAsync()
        {
            try
            {
                int total = await _service.GetTotalOrigineCountAsync();
                return Ok(total);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError,
                    $"Erreur lors de la récupération du compte : {ex.Message}");
            }

        }

        // GET api/origines/3
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var origine = await _service.GetByIdAsync(id);
                return Ok(origine);
            }
            catch (KeyNotFoundException)
            {
                // ✅ return manquait — causait CS0161
                return NotFound(new { message = $"Origine {id} introuvable" });
            }
        }

        // POST api/origines
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] OrigineCreateDto dto)
        {
            try
            {
                // ✅ utilise le Service + DTO — plus _context directement
                var created = await _service.CreateAsync(dto);
                return Ok(created);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE api/origines/3
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}