namespace GestPR.Dtos
{
    public class ValidationDatasetRow
    {
        public int DemandeId { get; set; }
        public double Montant { get; set; }
        public int ValidateurId { get; set; }
        public double NbJours { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime DateValidation { get; set; }
    }
}