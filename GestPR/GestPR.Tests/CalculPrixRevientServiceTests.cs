using System;
using System.Collections.Generic;
using Xunit;             // <-- Résout CS0246 (Theory, Fact, InlineData)
using FluentAssertions;
using GestPR.DTOs;
using GestPR.Services;


namespace GestPR.GestPR.Tests
{
    public class CalculPrixRevientServiceTests
    {
        private readonly CalculMetierService _service;

        public CalculPrixRevientServiceTests()
        {
            // Initialisation du service à tester
            _service = new CalculMetierService();
        }

        #region 1. Tests sur les Cours de Change
        [Theory]
        [InlineData(100, 4800, 480000)]     // 100 EUR à 4800 Ar = 480 000 Ar
        [InlineData(1000.50, 4500, 4502250)] // Conversion avec décimales
        [InlineData(0, 4800, 0)]           // Montant nul
        public void ConvertirEnAriary_MontantEtTauxValides_RetourneMontantExact(
            decimal montantDevise,
            decimal tauxChange,
            decimal resultatAttendu)
        {
            // Act
            decimal resultat = _service.ConvertirEnAriary(montantDevise, tauxChange);

            // Assert
            resultat.Should().Be(resultatAttendu);
        }

        [Fact]
        public void ConvertirEnAriary_TauxInvalide_DoitLancerArgumentException()
        {
            // Arrange & Act
            Action action = () => _service.ConvertirEnAriary(100, 0);

            // Assert
            action.Should().Throw<ArgumentException>()
                  .WithMessage("*taux de change*");
        }
        #endregion

        #region 2. Tests sur la Répartition Proratisée au FOB
        [Fact]
        public void RepartirFraisProrataFob_TroisArticles_DoitDistribuerExactementSelonRatio()
        {
            // Arrange : 3 articles avec un FOB total de 10 000 EUR
            var articles = new List<ArticleCalculDto>
            {
                new ArticleCalculDto { Designation = "Câble Réseau", MontantFobDevise = 2000m }, // 20%
                new ArticleCalculDto { Designation = "Switch Cisco", MontantFobDevise = 3000m },  // 30%
                new ArticleCalculDto { Designation = "Serveur Dell", MontantFobDevise = 5000m }   // 50%
            };
            decimal totalFraisADistribuer = 1_000_000m; // 1 000 000 Ariary de transport/douane

            // Act
            var resultats = _service.CalculerRepartitionProrata(articles, totalFraisADistribuer);

            // Assert
            resultats[0].FraisProratises.Should().Be(200_000m); // 20% de 1M
            resultats[1].FraisProratises.Should().Be(300_000m); // 30% de 1M
            resultats[2].FraisProratises.Should().Be(500_000m); // 50% de 1M

            // Vérification que la somme réparties équivaut exactement au total des frais
            decimal sommeRepartition = resultats[0].FraisProratises + resultats[1].FraisProratises + resultats[2].FraisProratises;
            sommeRepartition.Should().Be(totalFraisADistribuer);
        }

        [Fact]
        public void RepartirFraisProrataFob_ListeVide_DoitRetournerListeVide()
        {
            // Arrange
            var articles = new List<ArticleCalculDto>();

            // Act
            var resultats = _service.CalculerRepartitionProrata(articles, 500000m);

            // Assert
            resultats.Should().BeEmpty();
        }
        #endregion

        #region 3. Tests sur le Calcul de Prix de Revient Total
        [Fact]
        public void CalculerPrixRevientUnitaire_CalculComplet_RetourneCoûtExact()
        {
            // Arrange
            decimal fobAriary = 1_000_000m;
            decimal fraisProratises = 200_000m;
            decimal droitsDouane = 150_000m;
            int quantite = 10;

            // Act
            decimal puRevient = _service.CalculerPrixRevientUnitaire(fobAriary, fraisProratises, droitsDouane, quantite);

            // Assert : (1 000 000 + 200 000 + 150 000) / 10 = 135 000 Ar par unité
            puRevient.Should().Be(135_000m);
        }
        #endregion
    }
}
