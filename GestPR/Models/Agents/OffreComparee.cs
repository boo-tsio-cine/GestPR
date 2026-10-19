namespace GestPR.Models.Agents
{
    public class OffreComparee
    {
        public string Fournisseur { get; set; }
        public decimal PrixUnitaire { get; set; }
        public int DelaiLivraisonJours { get; set; }
        public decimal ScoreGlobal { get; set; }
        public bool EstRecommandee { get; set; }
        public decimal DelaiEffectifJours { get; set; }
    }
}
