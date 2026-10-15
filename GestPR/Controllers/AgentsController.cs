using GestPR.Models;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{
    // Controllers/AgentsController.cs
    [ApiController]
    [Route("api/agents")]
    public class AgentsController : ControllerBase
    {
        private readonly AgentCommunicationChannel _bus;
        public AgentsController(AgentCommunicationChannel bus) => _bus = bus;

        [HttpPost("traiter-document")]
        public async Task<IActionResult> TraiterDocument(IFormFile fichier)
        {
            var dossierUploads = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
            Directory.CreateDirectory(dossierUploads); // crée le dossier s'il n'existe pas, ne fait rien sinon

            var chemin = Path.Combine("Uploads", fichier.FileName);
            using (var stream = new FileStream(chemin, FileMode.Create))
                await fichier.CopyToAsync(stream);

            var message = new AgentMessage { CheminDocument = chemin };
            await _bus.CanalOcr.Writer.WriteAsync(message);

            return Ok(new { message.Id, Statut = "Document envoyé au pipeline d'agents" });
        }

        [HttpGet("historique")]
        public IActionResult Historique() => Ok(_bus.Historique);
    }
}
