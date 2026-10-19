using GestPR.Models.Agents;

namespace GestPR.Service.Agents
{
    public class AgentNegociateurService
    {
        public List<OffreComparee> ComparerOffres(List<OffreArticle> offres)
        {
            if (offres == null || offres.Count == 0)
                return new List<OffreComparee>();

            var prixMin = offres.Min(o => o.PrixUnitaire);
            var delaiMin = offres.Min(o => o.DelaiLivraisonJours);

            var resultats = offres.Select(o =>
            {
                // Score composite : 70% prix, 30% délai, ramenés sur 100 (plus bas = meilleur)
                var scorePrix = prixMin / o.PrixUnitaire * 100;
                var scoreDelai = o.DelaiLivraisonJours > 0 ? (decimal)delaiMin / o.DelaiLivraisonJours * 100 : 100;
                var scoreGlobal = scorePrix * 0.7m + scoreDelai * 0.3m;

                return new OffreComparee
                {
                    Fournisseur = o.Fournisseur,
                    PrixUnitaire = o.PrixUnitaire,
                    DelaiLivraisonJours = o.DelaiLivraisonJours,
                    ScoreGlobal = Math.Round(scoreGlobal, 2)
                };
            }).OrderByDescending(r => r.ScoreGlobal).ToList();

            if (resultats.Any())
                resultats[0].EstRecommandee = true;

            return resultats;
        }



        private static decimal DelaiEffectif(OffreArticle o) =>
            o.HistoriqueDelaiFiable ? o.DelaiMoyenReelJours!.Value : o.DelaiLivraisonJours;
    }
}
