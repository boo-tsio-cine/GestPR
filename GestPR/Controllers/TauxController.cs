using GestPR.Data;
using GestPR.Dtos;
using GestPR.Models;
using GestPR.Service.Taux_Historic;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Controllers
{


    [ApiController]
    [Route("/api/taux")]
    public class TauxController : ControllerBase
    {

        private readonly ITauxService _service;

        public TauxController(ITauxService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var taux = await _service.GetAllTauxAsync();
            return Ok(taux);
        }



        //création taux
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] tauxCreateDto dto)//[FromBody] est obligatoire pour lire le JSON envoyé par React 
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return Ok(created); // 200 OK avec le taux créé en réponse
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        //// GET api/taux/3/historique
        ///
        [HttpGet("{id}/historique")]
        public async Task<IActionResult> GetHistoriqueAsync(int idTaux)
        {
            try
            {
                var historique = await _service.GetHistoriqueAsync(idTaux);
                return Ok(historique);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }


        }

        // PUT api/taux/3
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] tauxUpdateDto dto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, dto);
                return Ok(updated);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }

        }

        // DELETE api/taux/3
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
           
                await _service.DeleteAsync(id);
                return NoContent(); // 204 No Content
          
        }

    }
}
