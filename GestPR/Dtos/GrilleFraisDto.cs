namespace GestPR.DTOs;

public class GrilleFraisDto
{
    public string TypeMatiere { get; set; } = string.Empty; // ex: "Malt", "Sucre", "Canette"
    public List<RubriqueFraisDto> Rubriques { get; set; } = new();
}

public class RubriqueFraisDto
{
    public string CodeFrais { get; set; } = string.Empty; // ex: "FRET", "DOUANE", "MANUTENTION"
    public string Libelle { get; set; } = string.Empty;   // ex: "Droits de douane"
    public decimal ValeurParDefaut { get; set; }          // ex: 5.0 (pour 5%)
    public bool EstPourcentage { get; set; }              // true si %, false si montant fixe
}