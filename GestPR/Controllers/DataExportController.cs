using GestPR.Data;
using GestPR.Service.MachineLearning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace GestPR.Controllers
{

    [ApiController]
    [Route("api/[controller]")]
    public class DataExportController : ControllerBase
    {
        private readonly AchatDatasetService _datasetService;

        public DataExportController(AchatDatasetService datasetService)
        {
            _datasetService = datasetService;
        }

        // GET api/dataexport/achats-csv
        // Extrait, nettoie et enrichit l'historique des achats en dataset CSV prêt pour ML.NET
        [HttpGet("achats-csv")]
        public async Task<IActionResult> ExportAchatsCsv()
        {
            var dataset = await _datasetService.GetDatasetAsync();

            var csv = new StringBuilder();
            csv.AppendLine("ArticleId,CodeLot,Designation,PrixDeRevient,LogPrixDeRevient,DateTime,Status,DemandeurId,NbOccurrencesDesignation,MoyenneDesignation,EcartTypeDesignation,ZScoreDesignation,IsLikelyTestData");

            foreach (var row in dataset)
            {
                csv.AppendLine(string.Join(",",
                    row.ArticleId,
                    EscapeCsv(row.CodeLot),
                    EscapeCsv(row.Designation),
                    row.PrixDeRevient.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    row.LogPrixDeRevient.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    row.DateTime.ToString("yyyy-MM-dd HH:mm:ss"),
                    EscapeCsv(row.Status),
                    row.DemandeurId,
                    row.NbOccurrencesDesignation,
                    row.MoyenneDesignation.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    row.EcartTypeDesignation.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    row.ZScoreDesignation.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    row.IsLikelyTestData
                ));
            }

            var bytes = Encoding.UTF8.GetBytes(csv.ToString());
            return File(bytes, "text/csv", $"dataset_achats_{DateTime.Now:yyyyMMdd_HHmmss}.csv");
        }

        private static string EscapeCsv(string value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            {
                return $"\"{value.Replace("\"", "\"\"")}\"";
            }
            return value;
        }
    }
}
