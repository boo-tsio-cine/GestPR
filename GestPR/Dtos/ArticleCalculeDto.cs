namespace GestPR.DTOs
{
    public class ArticleCalculDto
    {
        public string Designation { get; set; } = string.Empty;
        public decimal MontantFobDevise { get; set; }
        public int Quantite { get; set; } = 1;

        // Propriétés calculées lors de la répartition
        public decimal FraisProratises { get; set; }
        public decimal PrixDeRevientUnitaire { get; set; }
    }
}