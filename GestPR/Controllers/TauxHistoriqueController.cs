using GestPR.Data;
using GestPR.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Controllers
{



    [ApiController]
    [Route("/api/tauxHistorique")]

    public class TauxHistoriqueController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TauxHistoriqueController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/tauxhistorique
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TauxHistorique>>> GetAll()
        {
            return await _context.TauxHistorique
                .OrderByDescending(h => h.DateTime)  // plus récent en premier
                .ToListAsync();
        }

        //// GET: api/tauxhistorique/par-taux/Gasy Net
        //[HttpGet("par-taux/{nomTaux}")]
        //public async Task<ActionResult<IEnumerable<TauxHistorique>>> GetByNom(string nomTaux)
        //{
        //    return await _context.TauxHistorique
        //        .Where(h => h.NomTaux == nomTaux)
        //        .OrderByDescending(h => h.DateTime)
        //        .ToListAsync();
        //}

        //[HttpGet]
        //public async Task<ActionResult<IEnumerable<TauxHistorique>>> GetAll()
        //{
        //    return await _context.TauxHistorique.ToListAsync();
        //}
    }
}
