namespace GestPR.Dtos
{
    // Ligne finale du dataset, enrichie de features utiles pour la détection d'anomalies.
    // Partagée entre DataExportController (export CSV) et AnomalyDetectionService (entraînement ML.NET)
    // pour ne jamais avoir deux logiques de nettoyage/feature-engineering qui divergent.
    public class AchatDatasetRow
    {
        public int ArticleId { get; set; }
        public string CodeLot { get; set; } = "";
        public string Designation { get; set; } = "";
        public decimal PrixDeRevient { get; set; }
        public double LogPrixDeRevient { get; set; }
        public DateTime DateTime { get; set; }
        public string Status { get; set; } = "";
        public int DemandeurId { get; set; }

        // Statistiques par désignation (calculées sur l'historique disponible)
        public int NbOccurrencesDesignation { get; set; }
        public double MoyenneDesignation { get; set; }
        public double EcartTypeDesignation { get; set; }
        public double ZScoreDesignation { get; set; } // (Prix - Moyenne) / EcartType

        // Transparence sur la qualité de la donnée : ne supprime rien silencieusement
        public bool IsLikelyTestData { get; set; }
    }
}