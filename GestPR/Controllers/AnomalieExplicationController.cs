using System.IO;
using System.Threading.Tasks;
using GestPR.Dtos;
using GestPR.Models;
using GestPR.Service.Demandes;
using GestPR.Service.MachineLearning;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{
    public class ExpliquerAnomalieRequestDto
    {
        // La demande historique choisie comme reference (celle dont on a deja le PDF)
        public int DemandeIdReference { get; set; }

        // Les valeurs du traitement EN COURS, pas encore soumises - meme format que
        // construireResumeMachine() cote React, envoye directement sans passer par un PDF
        public DonneesPdfDossier NouveauTraitement { get; set; } = new();
    }

    public class ExpliquerAnomalieResponseDto
    {
        public ResultatComparaisonDossier Comparaison { get; set; } = new();
        public string Explication { get; set; } = "";
    }

    [ApiController]
    [Route("api/Anomalie")]
    public class AnomalieExplicationController : ControllerBase
    {
        private readonly IDemandeService _demandeService;
        private readonly IDossierPdfParserService _parser;
        private readonly IComparateurDossierService _comparateur;
        private readonly ILlmExplicateurService _llmExplicateur;
        private readonly IWebHostEnvironment _env;

        public AnomalieExplicationController(
            IDemandeService demandeService,
            IDossierPdfParserService parser,
            IComparateurDossierService comparateur,
            ILlmExplicateurService llmExplicateur,
            IWebHostEnvironment env)
        {
            _demandeService = demandeService;
            _parser = parser;
            _comparateur = comparateur;
            _llmExplicateur = llmExplicateur;
            _env = env;
        }

        [HttpPost("expliquer")]
        public async Task<IActionResult> Expliquer([FromBody] ExpliquerAnomalieRequestDto dto)
        {
            var demandeReference = await _demandeService.GetByIdAsync(dto.DemandeIdReference);
            if (demandeReference == null || string.IsNullOrEmpty(demandeReference.PdfFileName))
                return NotFound(ApiResponse<object>.Fail("Dossier de référence introuvable ou sans PDF."));

            var cheminPdf = Path.Combine(_env.WebRootPath, "uploads", "pdfs", demandeReference.PdfFileName);
            var ancien = _parser.Extraire(cheminPdf);

            if (!ancien.ExtractionReussie)
            {
                // PDF genere avant l'ajout de la couche de texte invisible : rien a comparer
                return Ok(ApiResponse<ExpliquerAnomalieResponseDto>.Ok(new ExpliquerAnomalieResponseDto
                {
                    Explication = "Le document de référence a été généré avant la mise à jour du système et ne peut pas être analysé automatiquement."
                }));
            }

            var comparaison = _comparateur.Comparer(ancien, dto.NouveauTraitement);
            var explication = await _llmExplicateur.ExpliquerAsync(comparaison);

            return Ok(ApiResponse<ExpliquerAnomalieResponseDto>.Ok(new ExpliquerAnomalieResponseDto
            {
                Comparaison = comparaison,
                Explication = explication
            }));
        }
    }
}
