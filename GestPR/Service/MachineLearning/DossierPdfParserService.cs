using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;

namespace GestPR.Service.MachineLearning
{
    public class ArticleResumePdf
    {
        public string Designation { get; set; } = "";
        public string CodeLot { get; set; } = "";
        public decimal Quantite { get; set; }
        public decimal PuAriary { get; set; }
    }

    // Correspond exactement a l'objet construit par construireResumeMachine() cote React.
    // PostesFrais est un dictionnaire generique (cle = nom du poste, ex: "fret", "douanes")
    // pour couvrir tous les postes du PDF sans dupliquer une propriete par champ.
    public class DonneesPdfDossier
    {
        public int IdDemande { get; set; }
        public string? TypeDossier { get; set; }
        public string? Origine { get; set; }
        public string? Port { get; set; }
        public string? Fournisseur { get; set; }
        public string? Usine { get; set; }
        public string? Devise { get; set; }
        public string? Cours { get; set; }
        public Dictionary<string, decimal> PostesFrais { get; set; } = new();
        public ArticleResumePdf[] Articles { get; set; } = Array.Empty<ArticleResumePdf>();

        public bool ExtractionReussie { get; set; }
    }

    public interface IDossierPdfParserService
    {
        DonneesPdfDossier Extraire(string cheminFichierPdf);
        DonneesPdfDossier ExtraireDepuisTexte(string texteBrut);
    }

    public class DossierPdfParserService : IDossierPdfParserService
    {
        private static readonly Regex MarqueurRegex = new(
            @"__GESTPR_DATA__(.*?)__FIN_GESTPR_DATA__",
            RegexOptions.Singleline);

        public DonneesPdfDossier Extraire(string cheminFichierPdf)
        {
            try
            {
                using var document = PdfDocument.Open(cheminFichierPdf);
                var texte = string.Join("\n", document.GetPages().Select(p => p.Text));
                return ExtraireDepuisTexte(texte);
            }
            catch (Exception)
            {
                return new DonneesPdfDossier { ExtractionReussie = false };
            }
        }

        public DonneesPdfDossier ExtraireDepuisTexte(string texteBrut)
        {
            var match = MarqueurRegex.Match(texteBrut ?? "");
            if (!match.Success)
                return new DonneesPdfDossier { ExtractionReussie = false };

            try
            {
                var donnees = JsonSerializer.Deserialize<DonneesPdfDossier>(
                    match.Groups[1].Value,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (donnees == null)
                    return new DonneesPdfDossier { ExtractionReussie = false };

                donnees.ExtractionReussie = true;
                return donnees;
            }
            catch (JsonException)
            {
                return new DonneesPdfDossier { ExtractionReussie = false };
            }
        }
    }
}
