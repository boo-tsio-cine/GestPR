using System;
using System.Collections.Generic;

namespace GestPR.Dtos
{
    public class ArticleCreateDto
    {
        public string CodeLot { get; set; } = "";
        public string Designation { get; set; } = "";
        public int DemandeId { get; set; }
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
    }

    public class DemandeAvecArticleResponseDto
    {
        public int Id { get; set; }
        public int DemandeurId { get; set; }
        public string Motif { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTime DateTime { get; set; }
        public string? PdfFileName { get; set; } // Enregistre bien ce fichier !
        public List<ArticleResponseDto> Articles { get; set; } = new();
    }

    public class SoumettreDemandeDto
    {
        public IFormFile PdfFile { get; set; }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = "";
        public string Motif { get; set; } = "";
    }
}