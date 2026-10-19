using GestPR.Models.Agents;
using GestPR.Service.Agents;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/agents")]
    public class AgentsDecisionController : ControllerBase
    {
        private readonly AgentControleurRisqueService _controleur;
        private readonly AgentNegociateurService _negociateur;
        private readonly FournisseurFiabiliteService _fiabilite;

        public AgentsDecisionController(
          AgentControleurRisqueService controleur,
          AgentNegociateurService negociateur,
          FournisseurFiabiliteService fiabilite)
        {
            _controleur = controleur;
            _negociateur = negociateur;
            _fiabilite = fiabilite;
        }


        public record EvaluerRisqueRequest(OffreArticle Offre, decimal PrixMoyenHistorique);


        [HttpPost("evaluer-risque")]
        public IActionResult EvaluerRisque([FromBody] OffreArticle offre, [FromQuery] decimal prixMoyenHistorique)
        {
            var resultat = _controleur.EvaluerRisque(offre, prixMoyenHistorique);
            return Ok(resultat);
        }

        
        [HttpPost("comparer-offres")]
        public async Task<IActionResult> ComparerOffres([FromBody] List<OffreArticle> offres)
        {
            foreach (var o in offres) await EnrichirAsync(o);
            return Ok(_negociateur.ComparerOffres(offres));
        }

        private async Task EnrichirAsync(OffreArticle o)
        {
            var (nb, moy) = await _fiabilite.GetStatsAsync(o.Fournisseur);
            o.NbLivraisonsHistorique = nb;
            o.DelaiMoyenReelJours = moy;
            o.FournisseurConnu = o.FournisseurConnu || nb > 0;
        }
    }
}
