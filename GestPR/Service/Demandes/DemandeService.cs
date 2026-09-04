// Service/DemandeService.cs
using GestPR.Dtos;
using GestPR.Models;
using GestPR.Repository;
using GestPR.Repository.Demandes;
using GestPR.Service.Audit;
using GestPR.Service.Demandes;
using GestPR.Service.Email;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace GestPR.Service
{
    public class DemandeService : IDemandeService
    {
        private readonly IDemandeRepository _repo;
        private readonly IEmailService _emailService;
        private readonly GestPR.Data.AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IAuditService _auditService;
        private readonly CoursChangeService _coursChangeService;
        private readonly IDistributedCache _cache;

        public DemandeService(
            IDemandeRepository repo, 
            IEmailService emailService, 
            IConfiguration config, 
            GestPR.Data.AppDbContext context, 
            IHttpContextAccessor httpContextAccessor,
            IServiceScopeFactory scopeFactory,
            IAuditService auditService,
            CoursChangeService coursChangeService,
            IDistributedCache cache
            )
        {
            _repo = repo;
            _emailService = emailService;
            _context = context;
            _config = config;
            _httpContextAccessor = httpContextAccessor;
            _scopeFactory = scopeFactory;
            _auditService = auditService;
            _coursChangeService = coursChangeService;
            _cache = cache;
        }

        // Récupère les demandes d'un utilisateur
        public async Task<IEnumerable<DemandeAvecArticleResponseDto>> GetByUserAsync(int DemandeurId)
        {
            var demandes = await _repo.GetByUserAsync(DemandeurId);
            return demandes.Select(MapToDto);
        }

        public async Task<IEnumerable<DemandeAvecArticleResponseDto>> GetAllAsync()
        {
            var returnDemande = await _repo.GetAllAsync();
            return returnDemande.Select(MapToDto);
        }

        // Récupère une demande par Id
        public async Task<DemandeAvecArticleResponseDto> GetByIdAsync(int id)
        {
            var demande = await _repo.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Demande {id} introuvable");
            return MapToDto(demande);
        }

        // Crée une demande avec ses articles
        // Modifie l'import au début si nécessaire pour utiliser EntityFrameworkCore (si besoin de SingleOrDefaultAsync)
        // ou utilise une méthode de ton repository pour chercher par username.

        public async Task<DemandeAvecArticleResponseDto> CreateAvecArticlesAsync(DemandeAvecArticleCreateDto dto)
        {
            // 1. Validation des articles
            if (dto.Articles == null || dto.Articles.Count == 0)
                throw new ArgumentException("La demande doit contenir au moins un article");

            foreach (var a in dto.Articles)
            {
                if (string.IsNullOrWhiteSpace(a.CodeLot))
                    throw new ArgumentException("Le Code Lot est obligatoire");
                if (string.IsNullOrWhiteSpace(a.Designation))
                    throw new ArgumentException("La Désignation est obligatoire");
            }

            // 2. Validation de l'existence du Demandeur dans ApplicationUsers et récupération de ses infos
            var demandeur = await _context.ApplicationUsers.FindAsync(dto.DemandeurId);
            if (demandeur == null)
            {
                // Exception spécifique attrapée par Middleware -> HTTP 404
                throw new KeyNotFoundException($"L'utilisateur avec l'ID {dto.DemandeurId} n'existe pas dans l'application.");
            }

            // 3. Construire la demande
            var demande = new Demande
            {
                DemandeurId = dto.DemandeurId,
                Motif = dto.Motif ?? "En attente",
                Status = "Nouvelle",
                DateTime = DateTime.UtcNow,
                CodeSociete = dto.CodeSociete?.Trim() ?? "",
                CodeMagasin = dto.CodeMagasin?.Trim() ?? ""
            };

            // 4. Construire les articles
            var articles = dto.Articles.Select(a => new Article
            {
                CodeLot = a.CodeLot.Trim().ToUpper(),
                Designation = a.Designation.Trim(),
                CodeArticle = a.CodeArticle?.Trim() ?? "",
                DescArticle = a.DescArticle?.Trim() ?? ""
            }).ToList();

            // 5. Sauvegarder directement en base de données
            var created = await _repo.CreateAvecArticleAsync(demande, articles);


            // 🍃 AUDIT MONGODB : Traçabilité de la création
            try
            {
                await _auditService.LogActionAsync(new AuditLog
                {
                    DemandeId = created.Id,
                    Action = "Création de la demande avec articles",
                    UtilisateurId = created.DemandeurId,
                    NouveauStatut = created.Status,
                    Commentaire = created.Motif,
                    Details = new
                    {   
                        NombreArticles = created.Articles.Count,
                        Articles = created.Articles.Select(a => new { a.Id, a.CodeLot, a.Designation })
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MONGODB ERROR] Impossible d'enregistrer l'audit de création : {ex.Message}");
            }

            // ==========================================
            // 📧 ENVOI DU MAIL AUTOMATIQUE AUX COMPTABLES
            // ==========================================
            try
            {
                // Récupérer les comptables actifs ayant une adresse mail
                var comptables = await _repo.GetUsersByRoleAsync("Comptabilité");
                var emailsComptables = comptables.Select(c => c.Mail!).ToList();

                if (emailsComptables.Count > 0)
                {
                    Console.WriteLine($"[SMTP] Tentative d'envoi de mail à {emailsComptables.Count} comptable(s)...");

                    string nomCompletDemandeur = $"{demandeur.Nom} {demandeur.Prenom}";
                    string dateSaisie = created.DateTime.ToString("dd/MM/yyyy");

                    // Construction des lignes du tableau des articles en HTML
                    string lignesArticlesHtml = "";


                    foreach (var art in created.Articles)
                    {
                        lignesArticlesHtml += $@"
                    <tr style='border-bottom: 1px solid #ddd; text-align: left;'>
                        <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.Id}</td>
                        <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.Designation}</td>
                        <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.CodeLot}</td> 
                        <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.CodeArticle}</td>
                        <td style='padding: 10px;'>{art.DescArticle}</td>
                    </tr>";
                    }

                    // Template HTML reprenant exactement la structure et les couleurs de ta capture
                    string htmlBody = $@"
                <div style='font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 800px;'>
                    <p>Bonjour,</p>
                    <p>Vous avez une demande à traiter :</p>
            
                    <!-- Premier tableau : Demandeur -->
                    <table style='width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #ddd;'>
                        <thead>
                            <tr style='background-color: #00b074; color: white; text-align: left;'>
                                <th style='padding: 12px; border-right: 1px solid #ddd;'>Demandeur</th>
                                <th style='padding: 12px; border-right: 1px solid #ddd;'>Date de saisie</th>
                                <th style='padding: 12px;'>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style='padding: 12px; border-right: 1px solid #ddd;'>{nomCompletDemandeur}</td>
                                <td style='padding: 12px; border-right: 1px solid #ddd;'>{dateSaisie}</td>
                                <td style='padding: 12px;'>
                                    <a href='http://prtest.star.mg/' style='color: #0056b3; font-weight: bold; text-decoration: underline;'>Voir Plus</a>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <p style='font-weight: bold; margin-bottom: 10px;'>Articles associés à la demande :</p>

                    <!-- Deuxième tableau : Articles -->
                    <table style='width: 100%; border-collapse: collapse; border: 1px solid #ddd;'>
                        <thead>
                            <tr style='background-color: #00b074; color: white; text-align: left;'>
                                <th style='padding: 12px; border-right: 1px solid #ddd; width: 10%;'>Id Article</th>
                                <th style='padding: 12px; border-right: 1px solid #ddd; width: 22.5%;'>Désignation</th>
                                <th style='padding: 12px; border-right: 1px solid #ddd; width: 22.5%;'>Code Lot</th>
                                <th style='padding: 12px; border-right: 1px solid #ddd; width: 22.5%;'>Code Article</th>
                                <th style='padding: 12px; border-right: 1px solid #ddd; width: 22.5%;'>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lignesArticlesHtml}
                        </tbody>
                    </table>

                    <p style='margin-top: 25px;'>Cordialement,</p>
                </div>";

                    // 🚨 MODIFICATION : On fait l'envoi en direct (synchrone) pour intercepter 
                    // et afficher immédiatement les erreurs de connexion SMTP de ton réseau STAR.
                    await _emailService.SendHtmlEmailAsync(emailsComptables, "Prix de revient des marchandises importées", htmlBody);
                    Console.WriteLine("[SMTP] Mail envoyé avec succès aux comptables !");
                }
                else
                {
                    Console.WriteLine("[SMTP] Aucun utilisateur avec le rôle 'Comptabilité' n'a d'adresse e-mail renseignée.");
                }
            }
            catch (Exception ex)
            {
                // L'erreur s'affichera clairement dans la console d'exécution de Visual Studio / dotnet run
                Console.WriteLine("================ DETAILED SMTP ERROR ================");
                Console.WriteLine($"Erreur : {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Détail interne : {ex.InnerException.Message}");
                }
                Console.WriteLine("=====================================================");

                // Optionnel : lève l'exception pour bloquer et forcer l'affichage dans l'inspecteur web (onglet Network)
                throw new Exception($"L'enregistrement a réussi mais l'envoi de l'e-mail a échoué : {ex.Message}", ex);
            }

            return MapToDto(created);
        }

        // 💡 UN SEUL BLOC : Reçoit le fichier, génère le GUID unique et l'enregistre sur le disque dur


        public async Task<bool> SoumettreDemandeAsync(int id, IFormFile pdfFile, string articlesJson, string? commentaire, string? typeDossier, string? immo, string? devise, decimal? cours)
        {
            var demande = await _repo.GetByIdAsync(id);
            if (demande == null) return false;

            string ancienStatut = demande.Status;
            demande.Commentaire = commentaire;

            // 1. Désérialisation sécurisée des articles
            // 1. Enregistrement des prix de revient des articles
            List<ArticlePrixDto>? articlesSaisis = null;
            if (!string.IsNullOrWhiteSpace(articlesJson))
            {
                //try
                //{
                //    articlesSaisis = System.Text.Json.JsonSerializer.Deserialize<List<ArticlePrixDto>>(articlesJson, new System.Text.Json.JsonSerializerOptions
                //        {
                //            PropertyNameCaseInsensitive = true
                //        }

                //    );

                //    if (articlesSaisis != null)
                //    {
                //        foreach (var artSaisi in articlesSaisis)
                //        {
                //            var articleBdd = demande.Articles.FirstOrDefault(a => a.Id == artSaisi.ArticleId);
                //            if (articleBdd != null)
                //            {
                //                articleBdd.PrixDeRevient = artSaisi.PrixDeRevient;
                //            }
                //        }
                //    }

                //}
                //catch(System.Text.Json.JsonException)
                //{
                //    // Ignore le parsing si la chaîne n'est pas du JSON valide (ex: "string" envoyé depuis Swagger)
                //    Console.WriteLine("[WARN] Le champ articlesJson ne contient pas un tableau JSON d'articles valide.");
                //}

                try
                {
                    var rawJson = articlesJson.Trim();
                    if(rawJson.StartsWith("{") && rawJson.EndsWith("}"))
                    {
                        rawJson = $"[{rawJson}]"; // Encapsule dans un tableau si c'est un objet unique
                    }
                    articlesSaisis = JsonSerializer.Deserialize<List<ArticlePrixDto>>(rawJson, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (articlesSaisis != null)
                    {
                        foreach (var artSaisi in articlesSaisis)
                        {
                            var articleBdd = demande.Articles.FirstOrDefault(a => a.Id == artSaisi.ArticleId);
                            if (articleBdd != null)
                            {
                                articleBdd.PrixDeRevient = artSaisi.PrixDeRevient;
                            }
                        }
                    }
                }
                catch(JsonException ex)
                {
                    Console.WriteLine($"[WARN] Format articlesJson invalide : {ex.Message}");
                }
            }

            // 2. Gestion du fichier PDF
            if (pdfFile != null && pdfFile.Length > 0)
            {
                var dossierStockage = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "pdfs");
                if (!Directory.Exists(dossierStockage))
                {
                    Directory.CreateDirectory(dossierStockage);
                }

                var extension = Path.GetExtension(pdfFile.FileName);
                var nomUniqueFichier = $"{Guid.NewGuid()}{extension}";
                var cheminComplet = Path.Combine(dossierStockage, nomUniqueFichier);

                using (var stream = new FileStream(cheminComplet, FileMode.Create))
                {
                    await pdfFile.CopyToAsync(stream);
                }

                demande.PdfFileName = nomUniqueFichier;
            }

            demande.Status = "En cours";
            await _repo.SaveChangesAsync();

            // 💾 REDIS : mémorise le dernier cours saisi pour cette devise,
            // pour pré-remplir le formulaire du prochain traitement.
            if (!string.IsNullOrWhiteSpace(devise) && cours.HasValue)
            {
                try
                {
                    await _coursChangeService.SetDernierCoursAsync(devise, cours.Value);
                }
                catch (Exception ex)
                {
                    // Ne bloque jamais la soumission si Redis est indisponible
                    Console.WriteLine($"[REDIS WARNING] Impossible de mettre en cache le cours : {ex.Message}");
                }
            }

            // 🍃 AUDIT MONGODB : Traçabilité de la soumission de traitemen
            try
            {
                await _auditService.LogActionAsync(new AuditLog
                {
                    DemandeId = demande.Id,
                    Action = "Soumission de la demande pour validation",
                    UtilisateurId = demande.DemandeurId,
                    AncienStatut = ancienStatut,
                    NouveauStatut = demande.Status,
                    Commentaire = commentaire,
                    Details = new
                    {
                        TypeDossier = typeDossier,
                        Immo = immo,
                        FichierJoint = demande.PdfFileName,
                        ArticlesModifies = articlesSaisis
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MONGODB ERROR] Impossible d'enregistrer l'audit de soumission : {ex.Message}");
            }

            // ============================================
            // 📧 ENVOI DU MAIL AUTOMATIQUE AUX VALIDATEURS
            // ============================================

            _ = Task.Run(async () =>
            {
                using var scope = _scopeFactory.CreateScope();
                var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                var repo = scope.ServiceProvider.GetRequiredService<IDemandeRepository>();
                var dbContext = scope.ServiceProvider.GetRequiredService<GestPR.Data.AppDbContext>();

                try
                {
                    var validateurs = await repo.GetUsersByRoleAsync("Validateur");
                    var emailsValidateurs = validateurs.Select(v => v.Mail!).Where(e => !string.IsNullOrWhiteSpace(e)).ToList();

                    if (emailsValidateurs.Count > 0)
                    {
                        var demandeurDb = await dbContext.ApplicationUsers.FindAsync(demande.DemandeurId);
                        string nomCompletDemandeur = demandeurDb != null ? $"{demandeurDb.Nom} {demandeurDb.Prenom}" : "Inconnu";
                        string dateSaisie = demande.DateTime.ToString("dd/MM/yyyy");

                        var request = _httpContextAccessor.HttpContext?.Request;
                        string baseUrl = request != null
                            ? $"{request.Scheme}://{request.Host}{request.PathBase}"
                            : "http://STASRV26005/PRTEST";

                        string lienPdf = !string.IsNullOrEmpty(demande.PdfFileName) ? $"{baseUrl}/uploads/pdfs/{demande.PdfFileName}" : "";

                        string lignesArticlesHtml = "";
                        string libelleProduit = !string.IsNullOrWhiteSpace(typeDossier) ? typeDossier : "Non défini";
                        string libelleDossier = !string.IsNullOrWhiteSpace(immo) ? immo : "Non défini";

                        foreach (var art in demande.Articles)
                        {
                            var artSaisi = articlesSaisis?.FirstOrDefault(a => a.ArticleId == art.Id);
                            var prixSaisi = artSaisi?.PrixDeRevient ?? art.PrixDeRevient;
                            string prixFormatte = $"{prixSaisi:N2} Ar";

                            lignesArticlesHtml += $@"
                                <tr style='border-bottom: 1px solid #ddd; text-align: left;'>
                                    <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.Id}</td>
                                    <td style='padding: 10px; border-right: 1px solid #ddd;'>{libelleProduit}</td>
                                    <td style='padding: 10px; border-right: 1px solid #ddd;'>{libelleDossier}</td>
                                    <td style='padding: 10px; font-weight: bold; color: #1e3a8a;'>{prixFormatte}</td>
                                </tr>";
                        }

                        string htmlBody = $@"
                            <div style='font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 850px;'>
                                <p>Bonjour,</p>
                                <p>Une demande avec prix de revient a été soumise pour validation :</p>
                                <table style='width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #ddd;'>
                                    <thead>
                                        <tr style='background-color: #00b074; color: white; text-align: left;'>
                                            <th style='padding: 12px; border-right: 1px solid #ddd;'>Demandeur</th>
                                            <th style='padding: 12px; border-right: 1px solid #ddd;'>Date de saisie</th>
                                            <th style='padding: 12px; border-right: 1px solid #ddd;'>Fichier joint</th>
                                            <th style='padding: 12px;'>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style='padding: 12px; border-right: 1px solid #ddd;'>{nomCompletDemandeur}</td>
                                            <td style='padding: 12px; border-right: 1px solid #ddd;'>{dateSaisie}</td>
                                            <td style='padding: 12px; border-right: 1px solid #ddd;'>
                                                {(string.IsNullOrEmpty(demande.PdfFileName)
                                                    ? "Aucun fichier"
                                                    : $"<a href='{lienPdf}' target='_blank' style='background-color: #ef4444; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: bold; display: inline-block;'>Télécharger le PDF</a>")}
                                            </td>
                                            <td style='padding: 12px;'>
                                                <a href='http://prtest.star.mg/' style='color: #0056b3; font-weight: bold; text-decoration: underline;'>Voir Plus</a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <p style='font-weight: bold; margin-bottom: 10px;'>Détails des articles et prix calculés :</p>
                                <table style='width: 100%; border-collapse: collapse; border: 1px solid #ddd;'>
                                    <thead>
                                        <tr style='background-color: #00b074; color: white; text-align: left;'>
                                            <th style='padding: 12px; border-right: 1px solid #ddd; width: 10%;'>Id Article</th>
                                            <th style='padding: 12px; border-right: 1px solid #ddd; width: 45%;'>Produit</th>
                                            <th style='padding: 12px; border-right: 1px solid #ddd; width: 25%;'>Dossier</th>
                                            <th style='padding: 12px; width: 20%;'>Prix de revient (P.U)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lignesArticlesHtml}
                                    </tbody>
                                </table>
                                {(string.IsNullOrWhiteSpace(commentaire) ? "" : $@"
                                    <div style='margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-left: 4px solid #9ca3af; border-radius: 4px;'>
                                        <strong style='display: block; margin-bottom: 5px;'>Commentaire de la comptabilité :</strong>
                                        <span style='font-style: italic;'>""{commentaire}""</span>
                                    </div>
                                ")}
                                <p style='margin-top: 25px;'>Cordialement,</p>
                            </div>";

                        await emailService.SendHtmlEmailAsync(emailsValidateurs, "Validation requise : Prix de revient des marchandises", htmlBody);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[SMTP ERROR] Échec lors de l'envoi aux validateurs : {ex.Message}");
                }
            });

            return true;
        }

        // 💡 Prise de décision finale + modification du motif
        public async Task<bool> UpdateStatusAsync(int id, string nouveauStatut, string motifDecision)
        {
            var demande = await _repo.GetByIdAsync(id);
            if (demande == null) return false;

            string ancienStatut = demande.Status;
            demande.Status = nouveauStatut;
            if (!string.IsNullOrWhiteSpace(motifDecision))
            {
                demande.Motif = motifDecision; // Met à jour le motif avec la raison du validateur
            }

            await _repo.SaveChangesAsync();

            // 🍃 AUDIT MONGODB : Traçabilité du changement de statut (Validation / Rejet)
            try
            {
                await _auditService.LogActionAsync(new AuditLog
                {
                    DemandeId = demande.Id,
                    Action = nouveauStatut.Equals("Validé", StringComparison.OrdinalIgnoreCase) ? "Validation" : "MiseAJourStatut",
                    UtilisateurId = demande.DemandeurId,
                    AncienStatut = ancienStatut,
                    NouveauStatut = nouveauStatut,
                    Commentaire = motifDecision
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MONGODB ERROR] Échec du log de mise à jour du statut : {ex.Message}");
            }

            // Envoi d'e-mail asynchrone
            _ = Task.Run(async () =>
            {
                using var scope = _scopeFactory.CreateScope();
                var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                var dbContext = scope.ServiceProvider.GetRequiredService<GestPR.Data.AppDbContext>();

                try
                {
                    var demandeur = await dbContext.ApplicationUsers.FindAsync(demande.DemandeurId);
                    if (demandeur != null && !string.IsNullOrWhiteSpace(demandeur.Site))
                    {
                        string siteDemandeur = demandeur.Site;
                        var utilisateursDuMemeSite = dbContext.ApplicationUsers
                            .Where(u => u.Site == siteDemandeur && !string.IsNullOrEmpty(u.Mail))
                            .ToList();

                        var emailsDestinataires = utilisateursDuMemeSite.Select(u => u.Mail!).Distinct().ToList();

                        if (emailsDestinataires.Count > 0)
                        {
                            string nomCompletDemandeur = $"{demandeur.Nom} {demandeur.Prenom}";
                            string dateSaisie = demande.DateTime.ToString("dd/MM/yyyy");

                            bool estValide = nouveauStatut.Equals("Validé", StringComparison.OrdinalIgnoreCase) ||
                                             nouveauStatut.Equals("Approuvé", StringComparison.OrdinalIgnoreCase);

                            string couleurStatut = estValide ? "#00b074" : "#ef4444";
                            string iconeStatut = estValide ? "✔️" : "❌";

                            string lignesArticlesHtml = "";
                            foreach (var art in demande.Articles)
                            {
                                string prixFormatte = art.PrixDeRevient > 0 ? $"{art.PrixDeRevient:N2} Ar" : "Non renseigné";
                                lignesArticlesHtml += $@"
                            <tr style='border-bottom: 1px solid #ddd; text-align: left;'>
                                <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.Id}</td>
                                <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.Designation}</td>
                                <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.CodeLot}</td>
                                <td style='padding: 10px; font-weight: bold;'>{prixFormatte}</td>
                            </tr>";
                            }

                            string htmlBody = $@"
                        <div style='font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 850px;'>
                            <p>Bonjour,</p>
                            <p>Une décision a été prise concernant une demande de prix de revient pour votre site (<strong>{siteDemandeur}</strong>) :</p>
                            <div style='display: inline-block; padding: 12px 20px; background-color: {couleurStatut}; color: white; font-weight: bold; font-size: 16px; border-radius: 4px; margin-bottom: 20px;'>
                                {iconeStatut} Statut de la demande : {nouveauStatut.ToUpper()}
                            </div>
                            <table style='width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #ddd;'>
                                <thead>
                                    <tr style='background-color: #f3f4f6; color: #333; text-align: left; border-bottom: 2px solid #ddd;'>
                                        <th style='padding: 12px; border-right: 1px solid #ddd;'>Demandeur</th>
                                        <th style='padding: 12px; border-right: 1px solid #ddd;'>Date de saisie</th>
                                        <th style='padding: 12px;'>Site concerné</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style='padding: 12px; border-right: 1px solid #ddd;'>{nomCompletDemandeur}</td>
                                        <td style='padding: 12px; border-right: 1px solid #ddd;'>{dateSaisie}</td>
                                        <td style='padding: 12px; font-weight: bold; color: #1e3a8a;'>{siteDemandeur}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div style='margin-bottom: 25px; padding: 15px; background-color: #f9fafb; border-left: 4px solid {couleurStatut}; border-radius: 4px;'>
                                <strong style='display: block; margin-bottom: 5px; color: #374151;'>Motif / Commentaire de décision :</strong>
                                <span style='font-style: italic;'>""{(string.IsNullOrWhiteSpace(motifDecision) ? "Aucun commentaire supplémentaire fourni." : motifDecision)}""</span>
                            </div>
                            <p style='font-weight: bold; margin-bottom: 10px;'>Articles inclus dans cette demande :</p>
                            <table style='width: 100%; border-collapse: collapse; border: 1px solid #ddd;'>
                                <thead>
                                    <tr style='background-color: #374151; color: white; text-align: left;'>
                                        <th style='padding: 12px; border-right: 1px solid #ddd; width: 10%;'>Id Article</th>
                                        <th style='padding: 12px; border-right: 1px solid #ddd; width: 45%;'>Désignation</th>
                                        <th style='padding: 12px; border-right: 1px solid #ddd; width: 25%;'>Code Lot</th>
                                        <th style='padding: 12px; width: 20%;'>Prix de revient (P.U)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lignesArticlesHtml}
                                </tbody>
                            </table>
                            <p style='margin-top: 25px;'>Cordialement,<br/>L'équipe de validation GestPR</p>
                        </div>";

                            string sujetMail = $"[GestPR] Décision prise : Demande de prix {nouveauStatut} ({siteDemandeur})";
                            await emailService.SendHtmlEmailAsync(emailsDestinataires, sujetMail, htmlBody);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[SMTP ERROR] Échec de l'envoi de la décision : {ex.Message}");
                }
            });
            return true;
        }

        public async Task<IEnumerable<object>> GetHistoriqueByDesignationAsync(string designation)
        {
            string cacheKey = $"historique:designation:{designation.Trim().ToLower()}";

            // 1. Essayer de lire depuis Redis
            var cacheData = await _cache.GetStringAsync(cacheKey);
            if (!string.IsNullOrEmpty(cacheData))
            {
                return JsonSerializer.Deserialize<List<HistoriqueArticleDto>>(cacheData)!;
            }

            // 2. Si absent de Redis, requête SQL (potentiellement coûteuse : N+1 sur GetByIdAsync)
            var articles = await _repo.GetHistoriqueByDesignationAsync(designation);

            var historique = new List<HistoriqueArticleDto>();
            foreach (var art in articles)
            {
                var dema = await _repo.GetByIdAsync(art.DemandeId);
                if (dema != null)
                {
                    historique.Add(new HistoriqueArticleDto
                    {
                        DemandeId = dema.Id,
                        Date = dema.DateTime,
                        Status = dema.Status,
                        CodeLot = art.CodeLot,
                        PrixDeRevient = art.PrixDeRevient

                    });
                }
            }

            // 3. Stocker dans Redis avec un TTL modéré : un historique peut évoluer
            //    (ex: une demande passe de "En cours" à "Validée")
            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30)
            };
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(historique), cacheOptions);

            return historique;
        }

        // 💡 Nouvelle méthode : Récupère les logs d'audit depuis MongoDB
        public async Task<IEnumerable<AuditLog>> GetAuditLogsAsync(int demandeId)
        {
            return await _auditService.GetLogsByDemandeIdAsync(demandeId);
        }

        // Conversion Model → DTO
        // Conversion Model → DTO
        private static DemandeAvecArticleResponseDto MapToDto(Demande d) => new()
        {
            Id = d.Id,
            Status = d.Status ?? "",
            Motif = d.Motif ?? "",
            DateTime = d.DateTime,
            DemandeurId = d.DemandeurId,
            PdfFileName = d.PdfFileName,
            Commentaire = d.Commentaire ?? "",
            CodeMagasin= d.CodeMagasin ?? "",
            CodeSociete= d.CodeSociete ?? "",
            Articles = d.Articles.Select(a => new ArticleResponseDto
            {
                Id = a.Id,
                CodeLot = a.CodeLot,
                Designation = a.Designation,
                DemandeId = d.Id,
                PrixDeRevient = a.PrixDeRevient,
                CodeArticle = a.CodeArticle,
                DescArticle = a.DescArticle
            }).ToList()
        };
    }
}