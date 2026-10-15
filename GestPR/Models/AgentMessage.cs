namespace GestPR.Models
{
    public class AgentMessage
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string CheminDocument { get; set; }
        public string TexteExtrait { get; set; }
        public decimal MontantDetecte { get; set; }
        public bool AnomalieDetectee { get; set; }
        public string Statut { get; set; } = "Reçu";
        public string Destination { get; set; }
        public List<string> Journal { get; set; } = new();
    }
}
