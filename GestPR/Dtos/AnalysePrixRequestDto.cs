namespace GestPR.Dtos
{
    public class AnalysePrixRequestDto
    {
        public string Designation { get; set; } = "";
        public string CodeLot { get; set; } = "";
        public decimal PrixDeRevient { get; set; }
    }

    public class AnalysePrixResponseDto
    {
        public string Designation { get; set; } = "";
        public string CodeLot { get; set; } = "";
        public decimal PrixDeRevient { get; set; }
        public int NbOccurrencesHistorique { get; set; }
        public double MoyenneHistorique { get; set; }
        public double ZScoreDesignation { get; set; }
        public float ScoreAnomalie { get; set; }
        public bool EstAnomalie { get; set; }


        // Comparaison directe et transparente au dernier prix connu — plus facile à comprendre
        // pour le service comptable qu'un score statistique abstrait.
        public decimal? DernierPrixConnu { get; set; }
        public DateTime? DateDernierPrix { get; set; }
        public double? EcartVsDernierPrixPourcent { get; set; }
        public bool AlerteEcartRecent { get; set; }
        public string Message { get; set; } = "";
    }
}
