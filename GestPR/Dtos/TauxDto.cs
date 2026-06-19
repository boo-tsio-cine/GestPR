namespace GestPR.Dtos
{
    public class tauxCreateDto
    {
        public string Nom { get; set; } = "";
        public string cle { get; set; } = "";
        public decimal valeur { get; set; } 
        public string unite { get; set; } = "";
        public string description { get; set; } = "";
        public string produit { get; set; } = "";

    }

    public class tauxResponseDto
    {
        public int Id { get; set; }
        public string Nom { get; set; } = "";
        public string cle { get; set; } = "";
        public string unite { get; set; } = "";
        public string description { get; set; } = "";
        public string produit { get; set; } = "";
        public decimal valeur { get; set; }

    }

    public class tauxUpdateDto
    {
        public string Nom { get; set; } = "";
        public decimal valeur { get; set; }
        public string unite { get; set; } = "";
        public string produit { get; set; } = "";
    }

    public class tauxHistoriqueCreateDto
    {
        public string NomTaux { get; set; } = "";
        public decimal AncienValeur { get; set; }
        public decimal NouvelleValeur { get; set; }
        public int TauxId { get; set; }
    }

    public class tauxHistoriqueResponseDto
    {
        public int Id { get; set; }
        public string NomTaux { get; set; } = "";
        public decimal AncienValeur { get; set; }
        public decimal NouvelleValeur { get; set; }
        public DateTime DateTime { get; set; }
        public int TauxId { get; set; }
    }
}
