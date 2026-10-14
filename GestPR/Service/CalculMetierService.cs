using System;
using System.Collections.Generic;
using System.Linq;
using GestPR.DTOs;

namespace GestPR.Services
{
    public class CalculMetierService
    {
        /// <summary>
        /// Convertit un montant en devise étrangère (EUR, USD) vers l'Ariary selon le cours de change.
        /// </summary>
        public decimal ConvertirEnAriary(decimal montantDevise, decimal tauxChange)
        {
            if (tauxChange <= 0)
            {
                throw new ArgumentException("Le taux de change doit être supérieur à zéro.");
            }

            return montantDevise * tauxChange;
        }

        /// <summary>
        /// Répartit un montant total de frais (debours, transit) au prorata de la valeur FOB de chaque article.
        /// </summary>
        public List<ArticleCalculDto> CalculerRepartitionProrata(List<ArticleCalculDto> articles, decimal totalFrais)
        {
            if (articles == null || !articles.Any())
            {
                return new List<ArticleCalculDto>();
            }

            decimal totalFob = articles.Sum(a => a.MontantFobDevise);

            if (totalFob <= 0)
            {
                throw new InvalidOperationException("Le montant total FOB doit être supérieur à zéro pour effectuer la répartition.");
            }

            foreach (var article in articles)
            {
                // Ratio du FOB de l'article par rapport au FOB total
                decimal ratio = article.MontantFobDevise / totalFob;
                article.FraisProratises = ratio * totalFrais;
            }

            return articles;
        }

        /// <summary>
        /// Calcule le prix de revient unitaire d'un article.
        /// </summary>
        public decimal CalculerPrixRevientUnitaire(decimal fobAriary, decimal fraisProratises, decimal droitsDouane, int quantite)
        {
            if (quantite <= 0)
            {
                throw new ArgumentException("La quantité doit être supérieure à zéro.");
            }

            decimal coûtTotal = fobAriary + fraisProratises + droitsDouane;
            return coûtTotal / quantite;
        }
    }
}