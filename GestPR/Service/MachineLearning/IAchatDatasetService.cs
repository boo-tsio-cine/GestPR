using GestPR.Dtos;

namespace GestPR.Service.MachineLearning
{
    public interface IAchatDatasetService
    {
        Task<List<AchatDatasetRow>> GetDatasetAsync();
        Task<(int Count, double Moyenne, double EcartType)> GetStatsDesignationAsync(string designation);
        Task<(DateTime? Date, decimal? Prix)> GetDernierPrixDesignationAsync(string designation);
        Task<List<Ecartcodelotdto>> GetEcartsCodeLotAsync(double seuilPourcentAlerte = 20);
    }
}
