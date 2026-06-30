using GestPR.Data;
using GestPR.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Controllers
{


    [Route("/api/frs")]
    [ApiController]
        
    public class FournisseurController : ControllerBase
    {

        private readonly AppDbContext _context;

        public FournisseurController(AppDbContext context) { _context = context; }

        [NonAction]
        public AppDbContext Get_context()
        {
            return _context;
        }

        // GET: FournisseurController
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Fournisseur>>> GetAll()
        {
            return await _context.Fournisseur.ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Fournisseur>> Create([FromBody] Fournisseur frs)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);  

            _context.Fournisseur.Add(frs);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll),
                new
                {
                    id = frs.Id,
                }, frs);
        }

        //Put : api/FRS/5
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, [FromBody] Fournisseur frs)
        {
            if (id != frs.Id)
                return BadRequest("L'id ne correspond pas");

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.Entry(frs).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Fournisseur.Any(t => t.Id == id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }

        // 🛠️ AJOUT : RECUPERER LE NOMBRE TOTAL DE FOURNISSEURS
        // GET: /api/frs/count
        [HttpGet("count")]
        public async Task<ActionResult<int>> GetTotalFournisseurCount()
        {
            try
            { 
                // Compte directement en base de données de manière asynchrone
                int total = await _context.Fournisseur.CountAsync();
                return Ok(total);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError,
                    $"Erreur lors de la récupération du compte fournisseur : {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var frs = await _context.Fournisseur.FindAsync(id);

            if (frs == null)
                return NotFound();

            _context.Fournisseur.Remove(frs);
            await _context.SaveChangesAsync();

            return NoContent();
        }

     

    }
}
