using GestPR.Data;
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
        private readonly AppDbContext _context;

        public UserController(IUserService context)
        {
            _context = context;
        }

        // GET: api/users
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var user = await _context.GetAllAsync();
            return Ok(user);
        }

        // POST: api/users
        [HttpPost]
        public async Task<ActionResult<User>> Create([FromBody] User user) //[FromBody] est obligatoire pour lire le JSON envoyé par React 
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll), new { id = user.Id }, user);
        }

        //Put : api/user/5
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, [FromBody] User user)
        {
            if (id != user.Id)
                return BadRequest("L'id ne correspond pas");

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Users.Any(t => t.Id == id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
                return NotFound();

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }


    }
}