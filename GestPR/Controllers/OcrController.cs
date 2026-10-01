using ClosedXML.Excel;
using GestPR.Dtos;
using GestPR.Service.Ocr;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OcrController : ControllerBase
    {
        private readonly OcrService _ocrService;

        public OcrController(OcrService ocrService)
        {
            _ocrService = ocrService;
        }

        // POST api/ocr/extraire-texte
        // Reçoit un fichier (PDF ou image) et retourne le texte brut extrait
        [HttpPost("extraire-texte")]
        public async Task<IActionResult> ExtraireTexte(IFormFile fichier)
        {
            if (fichier == null || fichier.Length == 0)
            {
                return BadRequest(ApiResponse<object>.Fail("Aucun fichier fourni."));
            }

            var extensionsAcceptees = new[] { ".pdf", ".png", ".jpg", ".jpeg" };
            var extension = Path.GetExtension(fichier.FileName).ToLowerInvariant();

            if (!extensionsAcceptees.Contains(extension))
            {
                return BadRequest(ApiResponse<object>.Fail(
                    $"Format non supporté ({extension}). Formats acceptés : {string.Join(", ", extensionsAcceptees)}"));
            }

            try
            {
                using var stream = fichier.OpenReadStream();
                var texte = await _ocrService.ExtraireTexteAsync (stream, fichier.FileName);

                return Ok(ApiResponse<object>.Ok(new
                {
                    nomFichier = fichier.FileName,
                    texteExtrait = texte,
                    nbCaracteres = texte.Length
                }));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.Fail($"Erreur lors de l'extraction OCR : {ex.Message}"));
            }
        }

     
        [HttpPost("analyser-excel")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> AnalyserExcel([FromForm] ExcelUploadDto dto)
        {
            var fichier = dto.Fichier;

            if (fichier == null || fichier.Length == 0)
            {
                return BadRequest(ApiResponse<object>.Fail("Aucun fichier fourni."));
            }

            try
            {
                using var stream = fichier.OpenReadStream();
                using var workbook = new XLWorkbook(stream);
                var worksheet = workbook.Worksheet(1);

                var result = new ExcelImportDto();

                decimal deboursTransitVal = 0;
                decimal remunTransitVal = 0;

                for (int row = 1; row <= 35; row++)
                {
                    var keyCell = worksheet.Cell(row, 1).GetString().Trim().ToUpper();

                    if (keyCell == "COURS")
                    {
                        result.Cours = GetDecimalVal(worksheet.Cell(row, 2));
                    }
                    else if (keyCell == "TC")
                    {
                        result.Tc = GetDecimalVal(worksheet.Cell(row, 2));
                    }
                    // Montant FOB = Ligne "Coût" (ex: Coût 9855.46)
                    else if (keyCell == "COÛT" || keyCell == "COUT")
                    {
                        result.FobTotal = GetDecimalVal(worksheet.Cell(row, 2));
                    }
                    else if (keyCell == "MFOB")
                    {
                        result.MfobTotal = GetDecimalVal(worksheet.Cell(row, 2));
                    }
                    else if (keyCell.StartsWith("FRÊT") || keyCell.StartsWith("FRET"))
                    {
                        result.FretTotal = GetDecimalVal(worksheet.Cell(row, 2));
                    }
                    // Cumul Débours Transit + Rémunération Transit
                    else if (keyCell.Contains("DEBOURS S/TRANSIT"))
                    {
                        deboursTransitVal = GetDecimalVal(worksheet.Cell(row, 2)) ?? 0;
                    }
                    else if (keyCell.Contains("REMUNERATION S/TRANSIT"))
                    {
                        remunTransitVal = GetDecimalVal(worksheet.Cell(row, 2)) ?? 0;
                    }
                    else if (keyCell.Contains("DEBOURS S/MAGASINAGE"))
                    {
                        result.DeboursMagasinage = GetDecimalVal(worksheet.Cell(row, 2)) ?? 0;
                    }
                    else if (keyCell.Contains("TRANSPORT LOCAL"))
                    {
                        result.TransportLocal = GetDecimalVal(worksheet.Cell(row, 3));
                    }
                    else if (keyCell.Contains("COMMISSION REMUN"))
                    {
                        var val = GetDecimalVal(worksheet.Cell(row, 4));
                        result.CommissionRemun = val.HasValue ? val.Value * 100 : null;
                    }
                    else if (keyCell.Contains("COMMISSION REMUN"))
                    {
                        var val = GetDecimalVal(worksheet.Cell(row, 4));
                        result.CommissionBancaire = val.HasValue ? val.Value * 100 : null;
                    }
                    else if (keyCell.Contains("DOUANES"))
                    {
                        var val = GetDecimalVal(worksheet.Cell(row, 4));
                        result.Douanes = val.HasValue ? val.Value * 100 : null;
                    }
                    else if (keyCell.Contains("GASYNET"))
                    {
                        result.PrestationGasyNet = GetDecimalVal(worksheet.Cell(row, 3));
                    }
                    else if (keyCell.Contains("APMF"))
                    {
                        result.Apmf = GetDecimalVal(worksheet.Cell(row, 3));
                    }
                    else if (keyCell.Contains("AUTRES"))
                    {
                        result.AutresDat = GetDecimalVal(worksheet.Cell(row, 3));
                    }
                }

                // Affectation du résultat cumulé
                result.DeboursTransit = deboursTransitVal + remunTransitVal;

                return Ok(ApiResponse<object>.Ok(result));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.Fail($"Erreur lors de la lecture du fichier Excel : {ex.Message}"));
            }
        }
        private static decimal? GetDecimalVal(IXLCell cell)
        {
            if (cell.TryGetValue<decimal>(out var val))
            {
                return val;
            }
            return null;
        }

    }
}
