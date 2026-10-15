// Services/OptimisationRepartitionService.cs
using Google.OrTools.Sat;
using System;

public class ArticleContrainte
{
    public int ArticleId { get; set; }
    public string Designation { get; set; }
    public long MontantMin { get; set; }   // en centimes/unité entière (OR-Tools CP-SAT travaille en entiers)
    public long MontantMax { get; set; }
}

public class ResultatOptimisation
{
    public bool Faisable { get; set; }
    public Dictionary<int, long> RepartitionParArticle { get; set; } = new();
    public long BudgetUtilise { get; set; }
}

public class OptimisationRepartitionService
{
    public ResultatOptimisation Optimiser(List<ArticleContrainte> articles, long budgetTotal)
    {
        if (articles == null || articles.Count == 0)
        {
            return new ResultatOptimisation { Faisable = false };
        }

        var model = new CpModel();

        // Une variable entière par article : montant alloué
        var variables = new Dictionary<int, IntVar>();
        foreach (var a in articles)
        {
            variables[a.ArticleId] = model.NewIntVar(a.MontantMin, a.MontantMax, $"montant_{a.ArticleId}");
        }

        // Contrainte : la somme des allocations ne dépasse pas le budget total
        model.Add(LinearExpr.Sum(variables.Values) <= budgetTotal);

        // Objectif : maximiser l'utilisation du budget (éviter le gaspillage)
        model.Maximize(LinearExpr.Sum(variables.Values));

        var solver = new CpSolver();
        var statut = solver.Solve(model);

        var resultat = new ResultatOptimisation
        {
            Faisable = statut == CpSolverStatus.Optimal || statut == CpSolverStatus.Feasible
        };

        if (resultat.Faisable)
        {
            foreach (var a in articles)
            {
                long valeur = solver.Value(variables[a.ArticleId]);
                resultat.RepartitionParArticle[a.ArticleId] = valeur;
                resultat.BudgetUtilise += valeur;
            }
        }

        return resultat;
    }
}