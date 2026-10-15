using PDFtoImage;

namespace GestPR.Service.Agents
{
    // Agents/AgentOcrService.cs
    public class AgentOcrService : BackgroundService
    {
        private readonly AgentCommunicationChannel _bus;
        private readonly ILogger<AgentOcrService> _logger;

        public AgentOcrService(AgentCommunicationChannel bus, ILogger<AgentOcrService> logger)
        {
            _bus = bus;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await foreach (var message in _bus.CanalOcr.Reader.ReadAllAsync(stoppingToken))
            {
                try
                {
                    _logger.LogInformation("[Agent OCR] Traitement du document {Id}", message.Id);

                    byte[] imageBytes;
                    var extension = Path.GetExtension(message.CheminDocument).ToLowerInvariant();

                    if (extension == ".pdf")
                    {
                        // Le document est un PDF : on convertit sa première page en image
                        var pdfBytes = await File.ReadAllBytesAsync(message.CheminDocument, stoppingToken);
                        using var imageStream = new MemoryStream();
                        PDFtoImage.Conversion.SavePng(imageStream, pdfBytes, page: 0);
                        imageBytes = imageStream.ToArray();
                    }
                    else
                    {
                        // Le document est déjà une image (png, jpg...) : on le lit tel quel
                        imageBytes = await File.ReadAllBytesAsync(message.CheminDocument, stoppingToken);
                    }

                    var tessdataPath = Path.Combine(AppContext.BaseDirectory, "tessdata");
                    using var engine = new Tesseract.TesseractEngine(tessdataPath, "fra", Tesseract.EngineMode.Default);
                    using var img = Tesseract.Pix.LoadFromMemory(imageBytes);
                    using var page = engine.Process(img);

                    message.TexteExtrait = page.GetText();
                    message.MontantDetecte = ExtraireMontant(message.TexteExtrait);
                    message.Statut = "Texte extrait";
                    message.Journal.Add($"OCR: montant détecté = {message.MontantDetecte}");

                    await _bus.CanalControle.Writer.WriteAsync(message, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[Agent OCR] Échec du traitement du document {Id}", message.Id);
                    message.Statut = "Erreur OCR : " + ex.Message;
                    message.Journal.Add($"OCR: erreur — {ex.Message}");
                    _bus.Historique.Add(message);
                }
            }
        }

        private decimal ExtraireMontant(string texte)
        {
            var match = System.Text.RegularExpressions.Regex.Match(texte, @"(\d[\d\s]*[.,]?\d*)\s*Ar");
            if (match.Success && decimal.TryParse(match.Groups[1].Value.Replace(" ", ""), out var m))
                return m;
            return 0;
        }
    }

}
