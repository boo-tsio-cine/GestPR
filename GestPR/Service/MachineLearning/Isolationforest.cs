using System;
using System.Collections.Generic;
using System.Linq;

namespace GestPR.Service.MachineLearning
{
    // Un seul arbre de partition aleatoire (iTree)
    public class IsolationTree
    {
        private class Node
        {
            public Node? Gauche;
            public Node? Droite;
            public double SeuilCoupure;
            public int TailleGroupe; // rempli uniquement pour les noeuds externes (feuilles)
            public bool EstFeuille => Gauche == null && Droite == null;
        }

        private readonly Node _racine;
        private readonly int _profondeurMax;

        public IsolationTree(List<double> donnees, int profondeurMax, Random rnd)
        {
            _profondeurMax = profondeurMax;
            _racine = Construire(donnees, 0, rnd);
        }

        private Node Construire(List<double> donnees, int profondeurActuelle, Random rnd)
        {
            // Cas d'arret : profondeur max atteinte, ou plus qu'un seul point (deja isole)
            if (profondeurActuelle >= _profondeurMax || donnees.Count <= 1)
            {
                return new Node { TailleGroupe = donnees.Count };
            }

            double min = donnees.Min();
            double max = donnees.Max();

            // Tous les points identiques : impossible de couper davantage
            if (min == max)
            {
                return new Node { TailleGroupe = donnees.Count };
            }

            // Coupure aleatoire entre min et max (coeur de l'algorithme : pas de logique "intelligente",
            // juste du hasard - c'est ce qui permet a un point isole d'etre separe tres vite)
            double seuil = min + rnd.NextDouble() * (max - min);

            var gauche = donnees.Where(v => v < seuil).ToList();
            var droite = donnees.Where(v => v >= seuil).ToList();

            // Securite : coupure degeneree (tout d'un cote) -> on arrete ici
            if (gauche.Count == 0 || droite.Count == 0)
            {
                return new Node { TailleGroupe = donnees.Count };
            }

            return new Node
            {
                SeuilCoupure = seuil,
                Gauche = Construire(gauche, profondeurActuelle + 1, rnd),
                Droite = Construire(droite, profondeurActuelle + 1, rnd)
            };
        }

        // Longueur du chemin parcouru pour isoler x dans cet arbre
        public double LongueurChemin(double x)
        {
            return LongueurChemin(x, _racine, 0);
        }

        private double LongueurChemin(double x, Node noeud, int profondeurActuelle)
        {
            if (noeud.EstFeuille)
            {
                // Ajustement : si la feuille contient encore plusieurs points (limite de profondeur
                // atteinte avant isolation complete), on ajoute la longueur de chemin moyenne
                // "theorique" pour ce groupe, plutot que de s'arreter net.
                return profondeurActuelle + AjustementLongueurMoyenne(noeud.TailleGroupe);
            }

            return x < noeud.SeuilCoupure
                ? LongueurChemin(x, noeud.Gauche!, profondeurActuelle + 1)
                : LongueurChemin(x, noeud.Droite!, profondeurActuelle + 1);
        }

        // Longueur de chemin moyenne attendue pour isoler un point dans un arbre binaire
        // aleatoire construit sur "n" points (formule standard de l'algorithme Isolation Forest,
        // Liu et al. 2008 - basee sur la longueur moyenne d'une recherche infructueuse dans un
        // arbre binaire de recherche).
        public static double AjustementLongueurMoyenne(int n)
        {
            if (n <= 1) return 0;
            if (n == 2) return 1;

            const double constanteEulerMascheroni = 0.5772156649015328606;
            double harmonique = Math.Log(n - 1) + constanteEulerMascheroni;
            return 2 * harmonique - (2.0 * (n - 1) / n);
        }
    }

    // La foret : une collection d'arbres construits sur des echantillons differents
    public class IsolationForest
    {
        private readonly List<IsolationTree> _arbres = new();
        private readonly int _tailleEchantillon;

        public IsolationForest(List<double> donnees, int nbArbres = 100, int? tailleEchantillon = null, int? graine = null)
        {
            if (donnees == null || donnees.Count == 0)
                throw new ArgumentException("Le dataset ne peut pas etre vide.", nameof(donnees));

            _tailleEchantillon = tailleEchantillon ?? donnees.Count;

            // Profondeur max = log2(taille echantillon), comme dans le papier original
            int profondeurMax = (int)Math.Ceiling(Math.Log2(Math.Max(_tailleEchantillon, 2)));

            var rnd = graine.HasValue ? new Random(graine.Value) : new Random();

            for (int i = 0; i < nbArbres; i++)
            {
                var echantillon = EchantillonnerAvecRemise(donnees, _tailleEchantillon, rnd);
                _arbres.Add(new IsolationTree(echantillon, profondeurMax, rnd));
            }
        }

        private static List<double> EchantillonnerAvecRemise(List<double> donnees, int taille, Random rnd)
        {
            var result = new List<double>(taille);
            for (int i = 0; i < taille; i++)
                result.Add(donnees[rnd.Next(donnees.Count)]);
            return result;
        }

        // Score entre 0 et 1. Proche de 1 = tres probablement une anomalie.
        // Proche ou en dessous de 0.5 = comportement normal.
        public double ScoreAnomalie(double x)
        {
            double longueurMoyenne = _arbres.Average(a => a.LongueurChemin(x));
            double c = IsolationTree.AjustementLongueurMoyenne(_tailleEchantillon);

            if (c <= 0) return 0.5; // dataset trop petit pour etre discriminant : score neutre

            return Math.Pow(2, -longueurMoyenne / c);
        }
    }
}