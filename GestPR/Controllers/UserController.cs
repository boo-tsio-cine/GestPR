using GestPR.Data;
using GestPR.Dtos;
using GestPR.Models;
using GestPR.Service;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Controllers
{
    [ApiController]  // ← URL de base : http://localhost:5000/api/users 
    [Route("api/utilisateurs")]
    public class UserController : ControllerBase  // ← ControllerBase, pas Controller
    {
        private readonly IUserService _service;

        public UserController(IUserService service)
        {
            _service = service;
        }

        // GET: api/users
        [HttpGet]   
        public async Task<IActionResult> GetAll()
        {
            var user = await _service.GetAllAsync();
            return Ok(user);
        }

        //récupérer par Id
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var user = await _service.GetByIdAsync(id);
                return Ok(user);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Utilisateur {id} introuvable" });
            }
        }

        // POST: api/users
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] UserCreateDDto dto) //[FromBody] est obligatoire pour lire le JSON envoyé par React 
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return Ok(created);

            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        //Put : api/user/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UserUpdateDDto dto)
        {
            if (id != dto.Id)
            {
                return BadRequest(
                     "L'ID de l'URL doit correspondre à l'ID du corps de la requête"
                );
            }

            var isUpdated = await _service.UpdateUserAsync(id, dto);

            if (!isUpdated)
            {
                return NotFound($"Utilisateur {id} introuvable" );
            }
            return NoContent();
        }


        [HttpPatch("{id}/change-password")]
        public async Task<IActionResult> UpdatePassword(int id, [FromBody] UserUpdatePasswordDDto dto)
        {
            if (id != dto.Id)
            {
                return BadRequest(
                     "L'ID de l'URL doit correspondre à l'ID du corps de la requête"
                );
            }
            var isUpdated = await _service.UpdateUserPasswordAsync(id, dto);
            if (!isUpdated)
            {
                return NotFound($"Utilisateur {id} introuvable");
            }
            return NoContent();
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }


    }
}