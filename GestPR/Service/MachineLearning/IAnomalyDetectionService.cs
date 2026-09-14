using GestPR.Dtos;

namespace GestPR.Service.MachineLearning
{
    public interface IAnomalyDetectionService
    {
        Task<AnomalyResultDto> AnalyserPrixAsync(string designation, string? codeLot, decimal prixDeRevient);
    }
}
