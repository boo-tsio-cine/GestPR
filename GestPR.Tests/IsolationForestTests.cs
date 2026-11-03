using System.Collections.Generic;
using Xunit;
using GestPR.Service.MachineLearning;

namespace GestPR.Tests.MachineLearning
{
    public class IsolationForestTests
    {
        [Fact]
        public void UnPrixNettementEloigne_DoitAvoirUnScorePlusEleveQuUnPrixNormal()
        {
            // Historique "normal" : prix qui tournent tous autour de 100
            var historique = new List<double> { 98, 101, 99, 100, 102, 97, 103, 100, 99, 101 };
            var forest = new IsolationForest(historique, nbArbres: 100, graine: 42);

            double scorePrixNormal = forest.ScoreAnomalie(100);   // dans la norme
            double scorePrixAnormal = forest.ScoreAnomalie(500);  // 5x le prix habituel

            Assert.True(scorePrixAnormal > scorePrixNormal,
                $"Le prix anormal (score={scorePrixAnormal}) devrait avoir un score plus eleve que le prix normal (score={scorePrixNormal}).");
        }

        [Fact]
        public void ScoreAnomalie_DoitToujoursEtreEntreZeroEtUn()
        {
            var historique = new List<double> { 10, 12, 11, 13, 9, 10, 11 };
            var forest = new IsolationForest(historique, nbArbres: 50, graine: 1);

            foreach (var valeurTestee in new[] { 0.0, 5.0, 11.0, 100.0, 1000.0 })
            {
                double score = forest.ScoreAnomalie(valeurTestee);
                Assert.InRange(score, 0.0, 1.0);
            }
        }

        [Fact]
        public void DonneesToutesIdentiques_NeDoitPasPlanter()
        {
            // Cas limite : tous les prix historiques sont identiques (min == max)
            var historique = new List<double> { 50, 50, 50, 50, 50 };
            var forest = new IsolationForest(historique, nbArbres: 20, graine: 7);

            double score = forest.ScoreAnomalie(50);
            double scoreDifferent = forest.ScoreAnomalie(200);

            Assert.InRange(score, 0.0, 1.0);
            Assert.InRange(scoreDifferent, 0.0, 1.0);
        }

        [Theory]
        [InlineData(1, 0.0)]   // un seul point : rien a isoler
        [InlineData(2, 1.0)]   // valeur connue de la formule standard
        public void AjustementLongueurMoyenne_CorrespondALaFormuleStandard(int n, double attendu)
        {
            double resultat = IsolationTree.AjustementLongueurMoyenne(n);
            Assert.Equal(attendu, resultat, precision: 5);
        }

        [Fact]
        public void MemeGraine_DoitDonnerDesResultatsReproductibles()
        {
            var historique = new List<double> { 20, 22, 21, 19, 23, 20, 21 };

            var forest1 = new IsolationForest(historique, nbArbres: 30, graine: 123);
            var forest2 = new IsolationForest(historique, nbArbres: 30, graine: 123);

            Assert.Equal(forest1.ScoreAnomalie(50), forest2.ScoreAnomalie(50), precision: 10);
        }
    }
}
