namespace GestPR.Dtos
{
    // Une ligne du dataset d'entrainement pour le delai de validation :
    // une demande deja tranchee (validee ou refusee), avec son montant,
    // qui l'a traitee, et combien de temps ca a pris.
    public class DelaiEntrainementDto
    {
        public decimal Montant { get; set; }
        public int ValidateurId { get; set; }
        public double DelaiJours { get; set; }
    }
}
