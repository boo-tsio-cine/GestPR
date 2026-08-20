using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;

namespace GestPR.Dtos
{
    public class ArticleCreateDto
    {
        public string CodeLot { get; set; } = "";
        public string Designation { get; set; } = "";
        public int DemandeId { get; set; }
        public decimal PrixDeRevient {get; set;}
    }


    public class DemandeAvecArticleCreateDto
    {
        public int DemandeurId { get; set; }
        public string? Motif { get; set; }
        public List<ArticleCreateDto> Articles { get; set; } = new();
    }

    public class ArticleResponseDto
    {
        public int Id { get; set; }
        public string CodeLot { get; set; } = "";
        public string Designation { get; set; } = "";
        public int DemandeId { get; set; }
        public decimal PrixDeRevient {get;set;}
    }

    public class DemandeAvecArticleResponseDto
    {
        public int Id { get; set; }
        public int DemandeurId { get; set; }
        public string Motif { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTime DateTime { get; set; }
        public string? PdfFileName { get; set; } // Enregistre bien ce fichier !
        public string? Commentaire { get; set; }
        public decimal PrixDeRevient { get; set; }

        public List<ArticleResponseDto> Articles { get; set; } = new();
    }

    public class SoumettreDemandeDto
    {
        public IFormFile? PdfFile { get; set; }
        public string Articles { get; set; } = string.Empty;
        public string? Commentaire { get; set; }

        public string? TypeDossier { get; set; }
        public string? Immo { get; set; }

        // Cours de change saisi manuellement par l'utilisateur pour ce traitement
        public string? Devise { get; set; }
        public decimal? Cours { get; set; }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = "";
        public string Motif { get; set; } = "";
    }

    public class ArticlePrixDto
    {
        public int ArticleId { get; set; }
        public decimal PrixDeRevient { get; set; }
        public string? Immo { get; set; }
    }

    // Nécessaire pour la sérialisation Redis : JsonSerializer.Deserialize
    // ne fonctionne pas avec des types anonymes (new { ... })
    public class HistoriqueArticleDto
    {
        public int DemandeId { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = "";
        public string CodeLot { get; set; } = "";
        public decimal PrixDeRevient { get; set; }
    }
}