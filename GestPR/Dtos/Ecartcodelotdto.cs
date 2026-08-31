namespace GestPR.Dtos
{

    public class ArticleEcartDto
    {
        public int Id { get; set; }
        public string Designation { get; set; } = "";
        public decimal PrixDeRevient { get; set; }
        public double EcartParRapportMoyennePourcent {  get; set; }
    }
    public class Ecartcodelotdto
    {
        public string CodeLot { get; set; } = "";
        public int NbOccurrences { get; set; }
        public decimal PrixMin { get; set; }
        public decimal PrixMax { get; set; }
        public double PrixMoyen { get; set; }
        public double EcartPourcent { get; set; } // (Max - Min) / Moyenne * 100
        public bool AlerteEcart { get; set; }
        public List<ArticleEcartDto> Articles { get; set; } = new();
    }
}
