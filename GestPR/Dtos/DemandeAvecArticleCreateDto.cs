namespace GestPR.Dtos
{
    //Article dans le formulaire
    public class ArticleCreateDto
    {
        public string CodeLot { get; set; } = "";
        public string Designation { get; set; } = "";
        public int DemandeId { get; set; }
    }

    // Demande + articles envoyés depuis React en une seule fois
    public class DemandeAvecArticleCreateDto
    {
        public int DemandeurId { get; set; }
        public string? Motif { get; set; }
        public List<ArticleCreateDto> Articles { get; set; } = new ();
    }

    // Ce que React reçoit en retour
    public class ArticleResponseDto
    {
        public int Id { get; set; }
        public string CodeLot { get; set; } = "";
        public string Designation { get; set; } = "";
        public int DemandeId { get; set; }
    }

    public class DemandeAvecArticleResponseDto
    {
        public int Id { get; set; }
        public int DemandeurId { get; set; }
        public string Motif { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTime DateTime { get; set; }
        public List<ArticleResponseDto> Articles { get; set; } = new();
    }
}
