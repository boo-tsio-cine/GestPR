using GestPR.Data;
using GestPR.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Controllers
{


    [ApiController]
    [Route("/api/taux")]
    public class TauxController : ControllerBase
    {

        private readonly AppDbContext _context;

        public TauxController(AppDbContext context) { _context = context; }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Taux>>> GetAll()
        {
            return await _context.Taux.ToListAsync();
        }
        
        // POST: api/taux
        [HttpPost]
        public async Task<ActionResult<Taux>> Create([FromBody] Taux taux) //[FromBody] est obligatoire pour lire le JSON envoyé par React 
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.Taux.Add(taux);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll), new { id = taux.Id }, taux);
        }

        //Put : api/taux/5
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, [FromBody] Taux taux)
        {



            if (id != taux.Id)
                return BadRequest("L'id ne correspond pas");

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            //récupérer l'ancien taux avant la modificatioo
            var ancienTaux = await _context.Taux
                .AsNoTracking() // important - ne pas tracker cet objet
                .FirstOrDefaultAsync(t => t.Id == id);

            if (ancienTaux == null)
                return NotFound();

            // ✅ 2. Modifier le taux

            _context.Entry(taux).State = EntityState.Modified;

            // ✅ 3. Créer l'entrée historique
            var historique = new TauxHistorique
            {
                NomTaux = ancienTaux.Nom,
                AncienValeur = ancienTaux.valeur,
                NouvelleValeur = taux.valeur,
                DateTime = DateTime.UtcNow
            };

            _context.TauxHistorique.Add(historique);

            try
            {
                // ✅ 4. Sauvegarder les deux en une seule transaction
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Taux.Any(t => t.Id == id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var taux = await _context.Taux.FindAsync(id);

            if(taux == null)    
                return NotFound();

            _context.Taux.Remove(taux);
            await _context.SaveChangesAsync();
            return NoContent(); //204 -- succès sans contenu

        }
    }
}
