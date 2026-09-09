using PDFtoImage;
using SkiaSharp;
using Tesseract;
using UglyToad.PdfPig;

namespace GestPR.Service.Ocr
{
    public class OcrService
    {
        private readonly string _tessDataPath;

        public OcrService(IWebHostEnvironment env)
        {
            // 1. Cherche dans la racine du projet
            var rootPath = Path.Combine(env.ContentRootPath, "tessdata");

            // 2. Cherche dans le répertoire de sortie de l'exécutable
            var binPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "tessdata");

            if (Directory.Exists(rootPath) && File.Exists(Path.Combine(rootPath, "fra.traineddata")))
            {
                _tessDataPath = rootPath;
            }
            else if (Directory.Exists(binPath) && File.Exists(Path.Combine(binPath, "fra.traineddata")))
            {
                _tessDataPath = binPath;
            }
            else
            {
                _tessDataPath = rootPath; // fallback
            }
        }

        public async Task<string> ExtraireTexteAsync(Stream fichierStream, string nomFichier)
        {
            var extension = Path.GetExtension(nomFichier).ToLowerInvariant();

            // CAS 1 : Document PDF (Traitement 100% C# sans crash)
            if (extension == ".pdf")
            {
                return await Task.Run(() =>
                {
                    using var ms = new MemoryStream();
                    fichierStream.CopyTo(ms);
                    ms.Position = 0;

                    using var pdf = PdfDocument.Open(ms);
                    var sb = new System.Text.StringBuilder();

                    foreach (var page in pdf.GetPages())
                    {
                        sb.AppendLine(page.Text);
                    }

                    return sb.ToString().Trim();
                });
            }

            // CAS 2 : Images (PNG, JPG) avec Tesseract
            var langFilePath = Path.Combine(_tessDataPath, "fra.traineddata");
            if (!File.Exists(langFilePath))
            {
                throw new FileNotFoundException(
                    $"Le fichier 'fra.traineddata' est introuvable. Emplacement attendu : {langFilePath}");
            }

            using var memoryStream = new MemoryStream();
            await fichierStream.CopyToAsync(memoryStream);
            var imageBytes = memoryStream.ToArray();

            return await Task.Run(() =>
            {
                using var engine = new TesseractEngine(_tessDataPath, "fra", EngineMode.Default);
                using var pix = Pix.LoadFromMemory(imageBytes);
                using var page = engine.Process(pix);
                return page.GetText().Trim();
            });
        }
    }
}