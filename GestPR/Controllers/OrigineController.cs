using GestPR.Data;
using GestPR.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Controllers
{

    [Route("/api/origine")]
    [ApiController]
    public class OrigineController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrigineController(AppDbContext context) { _context = context; }

        //public AppDbContext Get_context()
        //{
        //    return _context;
        //}


        // GET: OrigineController
         [HttpGet]
    public async Task<ActionResult<IEnumerable<Origine>>> GetAll()
    {
        return await _context.Origine.ToListAsync();
    }


        [HttpPost]
        public async Task<ActionResult<Origine>> Create([FromBody] Origine origine)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.Origine.Add(origine);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll),
                new
                {
                    id = origine.Id,
                }, origine);
        }


        //PUT : api/taux/5
        //[HttpPut("{id}")]
        //public async Task<IActionResult> Update(int id, [FromBody] Origine origine))
        //Put : api/origine/5
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, [FromBody] Origine origine)
        {
            if (id != origine.Id)
                return BadRequest("L'id ne correspond pas");

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.Entry(origine).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Origine.Any(t => t.Id == id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var origine = await _context.Origine.FindAsync(id);

            if (origine == null)
                return NotFound();

            _context.Origine.Remove(origine);
            await _context.SaveChangesAsync();

            return NoContent();
        }



    }
}
