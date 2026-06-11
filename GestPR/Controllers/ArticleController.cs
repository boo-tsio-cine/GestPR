using GestPR.Data;
using GestPR.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/articles")]
    public class ArticleController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ArticleController(AppDbContext context) {  _context = context; }

        // POST: api/articles — enregistrer un article
        [HttpPost]
        public async Task<ActionResult<Article>> Create([FromBody] Article article)
        {
            //Vérifier que le demande existe
            var demande = await _context.Demande.FindAsync(article.DemandeId);
            if (demande == null)
                return BadRequest("La demande n'existe pas");

            _context.Article.Add(article);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(Create), new {id = article.Id},  article);
        }

        // POST: api/articles/bulk — enregistrer plusieurs articles en une fois
        [HttpPost("bulk")]
        public async Task<IActionResult> CreateBulk([FromBody] List<Article> articles)
        {
            if (articles == null || articles.Count == 0) return BadRequest("Aucun article fourni.");

            _context.Article.AddRange(articles);
            await _context.SaveChangesAsync();

            return Ok($"{articles.Count} article(s) enregistré(s).");
        }


        // GET: api/articles?idDemande=5
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Article>>> GetByDemande([FromQuery] int idDemande)
        {
            var articles = await _context.Article
                .Where(a => a.DemandeId == idDemande)
                .ToListAsync();

            return Ok(articles);
        }
    }
}
