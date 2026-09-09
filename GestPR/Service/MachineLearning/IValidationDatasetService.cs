using GestPR.Dtos;

namespace GestPR.Service.MachineLearning
{
    public interface IValidationDatasetService
    {
        Task<(List<ValidationDatasetRow> Dataset, int NbDemandesSansAuditTrail)> GetDatasetAsync();
    }
}
