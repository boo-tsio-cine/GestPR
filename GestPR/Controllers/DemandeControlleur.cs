using GestPR.Data;
using GestPR.Dtos;
using GestPR.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/demandes")]

    public class DemandeControlleur : ControllerBase
    {
        private readonly AppDbContext _context;

        public DemandeControlleur(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/demandes — liste des demandes du demandeur connecté
        [HttpGet]
        public async Task<ActionResult> GetAll([FromQuery] int idDemandeur)
        {
           var demandes = await _context.Demande
                .Where(d => d.IdDemandeur == idDemandeur)
                .Include(d => d.Articles)
                .OrderByDescending(d => d.DateTime)
                .Select(d => new
                {
                    id = d.Id,
                    numDossier = d.NumDossier,
                    motif = d.Motif,
                    status = d.Status,
                    dateTime = d.DateTime,
                    articles = d.Articles.Select(a => new
                    {
                        id = a.Id,
                        codeLot = a.CodeLot,
                        designation = a.Designation,

                    })
                })
                .ToArrayAsync();

            return Ok(demandes);
        }

        // POST: api/demandes — créer l'entête

        [HttpPost]
        public async Task<ActionResult<Demande>> Create([FromBody] DemandeCreateDto dto)
        {
            var demande = new Demande()
            {
                IdDemandeur = dto.IdDemandeur,
                Motif = dto.Motif ?? "En attente",
                NumDossier = $"DEM-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}",
                Status = "Nouvelle",
                DateTime = DateTime.UtcNow

            };

            _context.Demande.Add(demande);
            await _context.SaveChangesAsync();

            return Ok(new { id = demande.Id, numDossier = demande.NumDossier });
            
                           
        }

    }
}
