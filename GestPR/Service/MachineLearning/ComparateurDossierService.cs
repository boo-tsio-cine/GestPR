using System;
using System.Collections.Generic;
using System.Linq;

namespace GestPR.Service.MachineLearning
{
    public class EcartChamp
    {
        public string Libelle { get; set; } = "";
        public decimal ValeurAncienne { get; set; }
        public decimal ValeurNouvelle { get; set; }
        public double? EcartPourcent { get; set; }
    }

    public class TexteEcartChamp
    {
        public string Libelle { get; set; } = "";
        public string? ValeurAncienne { get; set; }
        public string? ValeurNouvelle { get; set; }
    }

    public class ResultatComparaisonDossier
    {
        public List<EcartChamp> EcartsChiffres { get; set; } = new();
        public List<TexteEcartChamp> DifferencesTexte { get; set; } = new();
    }

    public interface IComparateurDossierService
    {
        ResultatComparaisonDossier Comparer(DonneesPdfDossier ancien, DonneesPdfDossier nouveau);
    }

    // Comparaison purement deterministe entre deux dossiers - AUCUNE IA ici.
    // Sert de matiere premiere fiable au LLM (ou au repli template), qui n'ajoute
    // qu'une phrase d'interpretation par-dessus des chiffres deja exacts.
    public class ComparateurDossierService : IComparateurDossierService
    {
        private const double SEUIL_ECART_SIGNIFICATIF_POURCENT = 5.0;

        // Traduit les cles techniques (cote du dictionnaire PostesFrais) en libelles lisibles
        private static readonly Dictionary<string, string> LibellesLisibles = new(StringComparer.OrdinalIgnoreCase)
        {
            ["montantFob"] = "Montant FOB",
            ["coutMiseFob"] = "Coût de mise FOB",
            ["fret"] = "Fret",
            ["assurance"] = "Assurance",
            ["montantCfr"] = "Montant CFR",
            ["douanes"] = "Douanes",
            ["prestationGasyNet"] = "Prestation GasyNet",
            ["apmf"] = "APMF",
            ["ddp"] = "DDP",
            ["droitTaxes"] = "Droits & Taxes",
            ["debarquement"] = "Débarquement",
            ["deboursMagasinage"] = "Débours Magasinage",
            ["commissionRemun"] = "Commission Rémun",
            ["commissionBancaires"] = "Commissions Bancaires",
            ["commission"] = "Commission",
            ["transportLocal"] = "Transport Local",
            ["fraisApproche"] = "Frais d'approche",
            ["coutTotal"] = "Coût Total",
        };

        public ResultatComparaisonDossier Comparer(DonneesPdfDossier ancien, DonneesPdfDossier nouveau)
        {
            var resultat = new ResultatComparaisonDossier();

            // Comparaison generique de TOUS les postes presents d'un cote ou de l'autre
            // (couvre automatiquement tout poste ajoute plus tard, sans modifier ce code)
            var tousLesPostes = ancien.PostesFrais.Keys.Union(nouveau.PostesFrais.Keys, StringComparer.OrdinalIgnoreCase);

            foreach (var poste in tousLesPostes)
            {
                ancien.PostesFrais.TryGetValue(poste, out var valeurAncienne);
                nouveau.PostesFrais.TryGetValue(poste, out var valeurNouvelle);

                var libelle = LibellesLisibles.TryGetValue(poste, out var l) ? l : poste;
                AjouterEcartSiSignificatif(resultat, libelle, valeurAncienne, valeurNouvelle);
            }

            AjouterDifferenceTexte(resultat, "Fournisseur", ancien.Fournisseur, nouveau.Fournisseur);
            AjouterDifferenceTexte(resultat, "Origine", ancien.Origine, nouveau.Origine);
            AjouterDifferenceTexte(resultat, "Port", ancien.Port, nouveau.Port);
            AjouterDifferenceTexte(resultat, "Devise", ancien.Devise, nouveau.Devise);
            AjouterDifferenceTexte(resultat, "Usine", ancien.Usine, nouveau.Usine);
            AjouterDifferenceTexte(resultat, "Type de dossier", ancien.TypeDossier, nouveau.TypeDossier);

            return resultat;
        }

        private static void AjouterEcartSiSignificatif(
            ResultatComparaisonDossier resultat, string libelle, decimal valeurAncienne, decimal valeurNouvelle)
        {
            // Les deux valent 0 (poste absent des deux cotes) : rien a signaler
            if (valeurAncienne == 0 && valeurNouvelle == 0) return;

            double? ecartPourcent = valeurAncienne == 0
                ? null // poste nouvellement apparu : pas de "%" calculable, mais on le signale quand meme
                : (double)((valeurNouvelle - valeurAncienne) / valeurAncienne) * 100;

            if (ecartPourcent.HasValue && Math.Abs(ecartPourcent.Value) < SEUIL_ECART_SIGNIFICATIF_POURCENT)
                return;

            resultat.EcartsChiffres.Add(new EcartChamp
            {
                Libelle = libelle,
                ValeurAncienne = valeurAncienne,
                ValeurNouvelle = valeurNouvelle,
                EcartPourcent = ecartPourcent.HasValue ? Math.Round(ecartPourcent.Value, 1) : null
            });
        }

        private static void AjouterDifferenceTexte(
            ResultatComparaisonDossier resultat, string libelle, string? ancienneValeur, string? nouvelleValeur)
        {
            if (string.IsNullOrWhiteSpace(ancienneValeur) || string.IsNullOrWhiteSpace(nouvelleValeur)) return;
            if (string.Equals(ancienneValeur.Trim(), nouvelleValeur.Trim(), StringComparison.OrdinalIgnoreCase)) return;

            resultat.DifferencesTexte.Add(new TexteEcartChamp
            {
                Libelle = libelle,
                ValeurAncienne = ancienneValeur,
                ValeurNouvelle = nouvelleValeur
            });
        }
    }
}
