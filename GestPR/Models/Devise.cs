namespace GestPR.Models
{
    public class Devise
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Libelle { get; set; } = string.Empty;
        public decimal TauxParDefaut { get; set; }
    }
}
