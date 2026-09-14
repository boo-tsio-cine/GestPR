namespace GestPR.Service.MachineLearning
{
    public interface IEvaluationService
    {
        Task<ResultatEvaluationDto> EvaluerAsync(double[]? facteursDeviation = null);
    }
}
