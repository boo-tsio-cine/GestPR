using GestPR.Models.Agents;

namespace GestPR.Service.Agents
{
    public class AgentControleurRisqueService
    {
        public ResultatRisque EvaluerRisque(OffreArticle offre, decimal prixMoyenHistorique)
        {
            var motifs = new List<string>();
            int score = 0;

            // Écart de prix important par rapport à l'historique
            if (prixMoyenHistorique > 0)
            {
                var ecart = Math.Abs(offre.PrixUnitaire - prixMoyenHistorique) / prixMoyenHistorique;
                if (ecart > 0.5m)
                {
                    score += 2;
                    motifs.Add($"Écart de prix de {ecart:P0} par rapport à la moyenne historique");
                }
                else if (ecart > 0.2m)
                {
                    score += 1;
                    motifs.Add($"Écart de prix modéré de {ecart:P0}");
                }
            }

            // Fournisseur inconnu
            if (!offre.FournisseurConnu)
            {
                score += 2;
                motifs.Add("Fournisseur sans historique dans le système");
            }

            // Délai de livraison anormalement court ou long
            if (offre.HistoriqueDelaiFiable)
            {
                var reel = offre.DelaiMoyenReelJours!.Value;
                if (reel > offre.DelaiLivraisonJours * 1.5m)
                {
                    score += 1;
                    motifs.Add($"Délai annoncé ({offre.DelaiLivraisonJours} j) très inférieur au délai réel habituel " +
                               $"({reel:0} j sur {offre.NbLivraisonsHistorique} livraisons)");
                }
            }
            else if (offre.DelaiLivraisonJours < 2 || offre.DelaiLivraisonJours > 90)
            {
                score += 1;
                motifs.Add($"Délai de livraison inhabituel ({offre.DelaiLivraisonJours} jours)");
            }

            var niveau = score >= 4 ? "Élevé" : score >= 2 ? "Moyen" : "Faible";

            return new ResultatRisque { NiveauRisque = niveau, Motifs = motifs };
        }
    }
}
