namespace GestPR.Models.Agents
{
    // Models/Agents/EvaluationRisque.cs
    public class OffreArticle
    {
        public string Fournisseur { get; set; }
        public decimal PrixUnitaire { get; set; }
        public int DelaiLivraisonJours { get; set; }
        public bool FournisseurConnu { get; set; } // a déjà un historique dans le système
        public int NbLivraisonsHistorique { get; set; }
        public decimal? DelaiMoyenReelJours { get; set; }
        // l'historique n'est jugé fiable qu'à partir de 3 livraisons
        public bool HistoriqueDelaiFiable => NbLivraisonsHistorique >= 3 && DelaiMoyenReelJours.HasValue;

    }

    public class ResultatRisque
    {
        public string NiveauRisque { get; set; } // "Faible", "Moyen", "Élevé"
        public List<string> Motifs { get; set; } = new();
    }
}
