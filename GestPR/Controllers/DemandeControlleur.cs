// Controllers/DemandeController.cs
using GestPR.Dtos;

using GestPR.Service.Demandes;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/demandes")]
    public class DemandeController : ControllerBase
    {
        private readonly IDemandeService _service;

        public DemandeController(IDemandeService service)
        {
            _service = service;
        }

        // GET api/demandes?idDemandeur=1
        [HttpGet]
        public async Task<IActionResult> GetByUser([FromQuery] int idDemandeur)
        {
            var demandes = await _service.GetByUserAsync(idDemandeur);
            return Ok(demandes);
        }

        // GET api/demandes/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var demande = await _service.GetByIdAsync(id);
                return Ok(demande);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Demande {id} introuvable" });
            }
        }

        //Get all demande
        [HttpGet("all")]
        public async Task<IActionResult> GetAllAsync()
        {
            var returndemandes = await _service.GetAllAsync();
            return Ok(returndemandes);
        }

        // POST api/demandes
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] DemandeAvecArticleCreateDto dto)
        {
            try
            {
                var created = await _service.CreateAvecArticlesAsync(dto);
                return Ok(created);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}