using System;

namespace GestPR.Dtos
{
    // Corps de la requête POST /api/AnomalyDetection/analyser
    // (correspond à { designation, codeLot, prixDeRevient } envoyé par anomalyService.analyserPrix)
    public class AnalyserPrixRequestDto
    {
        public string Designation { get; set; } = "";
        public string? CodeLot { get; set; }
        public decimal PrixDeRevient { get; set; }
    }

    // Réponse consommée directement par traitementDemande.jsx (alertesAnomalies[rowKey])
    public class AnomalyResultDto
    {
        // Nombre d'occurrences historiques trouvées pour cette désignation
        public int NbOccurrencesHistorique { get; set; }

        // true si l'écart dépasse le seuil d'alerte défini (ex: 20%)
        public bool AlerteEcartRecent { get; set; }

        // Écart en % entre le prix saisi et le dernier prix connu (peut être négatif)
        public decimal EcartVsDernierPrixPourcent { get; set; }

        // Infos complémentaires, utiles pour un futur tooltip / détail
        public decimal? DernierPrixConnu { get; set; }
        public DateTime? DateDernierPrix { get; set; }
        public decimal? PrixMoyenHistorique { get; set; }

        // --- Résultat du modèle Isolation Forest (ML) ---
        // null si le dataset pour cette désignation est trop petit (< seuil minimum)
        public double? ScoreAnomalieMl { get; set; }

        // true si ScoreAnomalieMl dépasse le seuil d'alerte ML (calibré séparément du seuil heuristique)
        public bool AlerteAnomalieMl { get; set; }

        // Message lisible affiché en tooltip du badge (title=...)
        public string Message { get; set; } = "";
    }
}