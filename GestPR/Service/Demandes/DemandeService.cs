// Service/DemandeService.cs
using GestPR.Dtos;
using GestPR.Models;
using GestPR.Repository;
using GestPR.Repository.Demandes;
using GestPR.Service.Demandes;
using GestPR.Service.Email;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace GestPR.Service
{
    public class DemandeService : IDemandeService
    {
        private readonly IDemandeRepository _repo;
        private readonly IEmailService _emailService;
        private readonly GestPR.Data.AppDbContext _context;

        public DemandeService(IDemandeRepository repo, IEmailService emailService, GestPR.Data.AppDbContext context)
        {
            _repo = repo;
            _emailService = emailService;
            _context = context;
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
                throw new ArgumentException($"L'utilisateur avec l'ID {dto.DemandeurId} n'existe pas dans l'application. Enregistrement impossible.");
            }

            // 3. Construire la demande
            var demande = new Demande
            {
                DemandeurId = dto.DemandeurId,
                Motif = dto.Motif ?? "En attente",
                Status = "Nouvelle",
                DateTime = DateTime.UtcNow
            };

            // 4. Construire les articles
            var articles = dto.Articles.Select(a => new Article
            {
                CodeLot = a.CodeLot.Trim().ToUpper(),
                Designation = a.Designation.Trim(),
            }).ToList();

            // 5. Sauvegarder directement en base de données
            var created = await _repo.CreateAvecArticleAsync(demande, articles);

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
                        <td style='padding: 10px;'>{art.CodeLot}</td>
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
                                <th style='padding: 12px; border-right: 1px solid #ddd; width: 15%;'>Id Article</th>
                                <th style='padding: 12px; border-right: 1px solid #ddd; width: 55%;'>Désignation</th>
                                <th style='padding: 12px; width: 30%;'>Code Lot</th>
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


        public async Task<bool> SoumettreDemandeAsync(int id, IFormFile pdfFile, string articlesJson, string? commentaire)
        {
            var demande = await _repo.GetByIdAsync(id);
            if (demande == null) return false;

            demande.Commentaire = commentaire;

            // 1. Enregistrement des prix de revient des articles
            List<ArticlePrixDto>? articlesSaisis = null;
            if (!string.IsNullOrWhiteSpace(articlesJson))
            {
                // Désérialisation du JSON envoyé par le Front-end
                articlesSaisis = System.Text.Json.JsonSerializer.Deserialize<List<ArticlePrixDto>>(articlesJson, new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (articlesSaisis != null)
                {
                    foreach (var artSaisi in articlesSaisis)
                    {
                        // On retrouve l'article associé à cette demande par son ID
                        var articleBdd = demande.Articles.FirstOrDefault(a => a.Id == artSaisi.ArticleId);
                        if (articleBdd != null)
                        {
                            articleBdd.PrixDeRevient = artSaisi.PrixDeRevient;
                        }
                    }
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

            // ============================================
            // 📧 ENVOI DU MAIL AUTOMATIQUE AUX VALIDATEURS
            // ============================================
            try
            {
                // Récupérer les validateurs actifs ayant une adresse mail
                var validateurs = await _repo.GetUsersByRoleAsync("Validateur"); // Ajuste le nom du rôle si nécessaire
                var emailsValidateurs = validateurs.Select(v => v.Mail!).ToList();

                if (emailsValidateurs.Count > 0)
                {
                    // Récupération des informations du demandeur original lié à la demande
                    string nomCompletDemandeur = "Inconnu";
                    if (demande.Demandeur != null)
                    {
                        nomCompletDemandeur = $"{demande.Demandeur.Nom} {demande.Demandeur.Prenom}";
                    }
                    else
                    {
                        // Fallback de sécurité : requêter l'utilisateur si la navigation n'est pas chargée
                        var demandeurDb = await _context.ApplicationUsers.FindAsync(demande.DemandeurId);
                        if (demandeurDb != null)
                        {
                            nomCompletDemandeur = $"{demandeurDb.Nom} {demandeurDb.Prenom}";
                        }
                    }

                    string dateSaisie = demande.DateTime.ToString("dd/MM/yyyy");

                    // Construction de l'URL pour télécharger ou prévisualiser le fichier PDF joint
                    // Tu pourras remplacer "localhost:5233" par ton adresse IIS de production le moment venu
                    string baseUrl = "http://localhost:5233";
                    string lienPdf = $"{baseUrl}/uploads/pdfs/{demande.PdfFileName}";

                    // Construction des lignes du tableau des articles avec le P.U en Ariary
                    string lignesArticlesHtml = "";
                    foreach (var art in demande.Articles)
                    {
                        // Récupérer le prix saisi correspondant à cet article
                        var prixSaisi = articlesSaisis?.FirstOrDefault(a => a.ArticleId == art.Id)?.PrixDeRevient ?? art.PrixDeRevient;

                        // Formatage propre de la monnaie en Ariary (ex: 150 000,00 Ar)
                        string prixFormatte = $"{prixSaisi:N2} Ar";

                        lignesArticlesHtml += $@"
                            <tr style='border-bottom: 1px solid #ddd; text-align: left;'>
                                <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.Id}</td>
                                <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.Designation}</td>
                                <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.CodeLot}</td>
                                <td style='padding: 10px; font-weight: bold; color: #1e3a8a;'>{prixFormatte}</td>
                            </tr>";
                    }

                    // Génération du template HTML à destination des validateurs
                    string htmlBody = $@"
                <div style='font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 850px;'>
                    <p>Bonjour,</p>
                    <p>Une demande avec prix de revient a été soumise pour validation :</p>
                    
                    <!-- Premier tableau : Infos générales -->
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

                    <!-- Deuxième tableau : Articles & Prix de Revient -->
                    <table style='width: 100%; border-collapse: collapse; border: 1px solid #ddd;'>
                        <thead>
                            <tr style='background-color: #00b074; color: white; text-align: left;'>
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

                    {(string.IsNullOrWhiteSpace(commentaire) ? "" : $@"
                        <div style='margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-left: 4px solid #9ca3af; border-radius: 4px;'>
                            <strong style='display: block; margin-bottom: 5px;'>Commentaire de la comptabilité :</strong>
                            <span style='font-style: italic;'>""{commentaire}""</span>
                        </div>
                    ")}

                    <p style='margin-top: 25px;'>Cordialement,</p>
                </div>";

                    // Envoi en arrière-plan (non bloquant)
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            Console.WriteLine("[SMTP] Envoi du mail de soumission aux validateurs...");
                            await _emailService.SendHtmlEmailAsync(emailsValidateurs, "Validation requise : Prix de revient des marchandises", htmlBody);
                            Console.WriteLine("[SMTP] Mail envoyé avec succès aux validateurs !");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[SMTP ERROR] Échec de l'envoi aux validateurs : {ex.Message}");
                        }
                    });
                }
                else
                {
                    Console.WriteLine("[SMTP] Aucun validateur actif trouvé avec une adresse e-mail.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SMTP ERROR] Erreur lors de la préparation du mail validateur : {ex.Message}");
            }

            return true;
        }

        // 💡 Prise de décision finale + modification du motif
        public async Task<bool> UpdateStatusAsync(int id, string nouveauStatut, string motifDecision)
        {
            var demande = await _repo.GetByIdAsync(id);
            if (demande == null) return false;

            demande.Status = nouveauStatut;
            if (!string.IsNullOrWhiteSpace(motifDecision))
            {
                demande.Motif = motifDecision; // Met à jour le motif avec la raison du validateur
            }

            await _repo.SaveChangesAsync();

            // =================================================================
            // 📧 ENVOI DU MAIL DE DÉCISION AUX UTILISATEURS DU MÊME SITE
            // =================================================================
            try
            {
                // 1. Récupérer le demandeur pour connaître son site
                var demandeur = await _context.ApplicationUsers.FindAsync(demande.DemandeurId);

                if (demandeur != null && !string.IsNullOrWhiteSpace(demandeur.Site)) // Ajuste "Site" selon le nom exact de ta propriété
                {
                    string siteDemandeur = demandeur.Site;

                    // 2. Récupérer tous les utilisateurs du même site qui ont un email valide
                    var utilisateursDuMemeSite = _context.ApplicationUsers
                        .Where(u => u.Site == siteDemandeur && !string.IsNullOrEmpty(u.Mail))
                        .ToList();

                    var emailsDestinataires = utilisateursDuMemeSite.Select(u => u.Mail!).Distinct().ToList();

                    if (emailsDestinataires.Count > 0)
                    {
                        string nomCompletDemandeur = $"{demandeur.Nom} {demandeur.Prenom}";
                        string dateSaisie = demande.DateTime.ToString("dd/MM/yyyy");

                        // Personnalisation visuelle selon la décision (Validation ou Rejet)
                        bool estValide = nouveauStatut.Equals("Validé", StringComparison.OrdinalIgnoreCase) ||
                                         nouveauStatut.Equals("Approuvé", StringComparison.OrdinalIgnoreCase);

                        string couleurStatut = estValide ? "#00b074" : "#ef4444"; // Vert STAR ou Rouge Rejet
                        string iconeStatut = estValide ? "✔️" : "❌";

                        // Construction des lignes d'articles pour le récapitulatif
                        string lignesArticlesHtml = "";
                        foreach (var art in demande.Articles)
                        {
                            string prixFormatte = art.PrixDeRevient > 0
                                 ? $"{art.PrixDeRevient:N2} Ar"
                                 : "Non renseigné";

                            lignesArticlesHtml += $@"
                        <tr style='border-bottom: 1px solid #ddd; text-align: left;'>
                            <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.Id}</td>
                            <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.Designation}</td>
                            <td style='padding: 10px; border-right: 1px solid #ddd;'>{art.CodeLot}</td>
                            <td style='padding: 10px; font-weight: bold;'>{prixFormatte}</td>
                        </tr>";
                        }

                        // Génération du Template HTML
                        string htmlBody = $@"
                    <div style='font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 850px;'>
                        <p>Bonjour,</p>
                        <p>Une décision a été prise concernant une demande de prix de revient pour votre site (<strong>{siteDemandeur}</strong>) :</p>
                        
                        <!-- Badge du Statut de Décision -->
                        <div style='display: inline-block; padding: 12px 20px; background-color: {couleurStatut}; color: white; font-weight: bold; font-size: 16px; border-radius: 4px; margin-bottom: 20px;'>
                            {iconeStatut} Statut de la demande : {nouveauStatut.ToUpper()}
                        </div>

                        <!-- Premier tableau : Infos générales -->
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

                        <!-- Bloc Motif de Décision -->
                        <div style='margin-bottom: 25px; padding: 15px; background-color: #f9fafb; border-left: 4px solid {couleurStatut}; border-radius: 4px;'>
                            <strong style='display: block; margin-bottom: 5px; color: #374151;'>Motif / Commentaire de décision :</strong>
                            <span style='font-style: italic;'>""{(string.IsNullOrWhiteSpace(motifDecision) ? "Aucun commentaire supplémentaire fourni." : motifDecision)}""</span>
                        </div>

                        <p style='font-weight: bold; margin-bottom: 10px;'>Articles inclus dans cette demande :</p>

                        <!-- Deuxième tableau : Articles -->
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

                        // Envoi asynchrone sécurisé (ne bloque pas le serveur si le réseau de la STAR a des lenteurs)
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                Console.WriteLine($"[SMTP] Envoi de la décision aux {emailsDestinataires.Count} membres du site {siteDemandeur}...");
                                string sujetMail = $"[GestPR] Décision prise : Demande de prix {nouveauStatut} ({siteDemandeur})";
                                await _emailService.SendHtmlEmailAsync(emailsDestinataires, sujetMail, htmlBody);
                                Console.WriteLine("[SMTP] Notification de décision envoyée avec succès !");
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[SMTP ERROR] Échec de l'envoi de la décision : {ex.Message}");
                            }
                        });
                    }
                    else
                    {
                        Console.WriteLine($"[SMTP] Aucun destinataire trouvé pour le site '{siteDemandeur}'.");
                    }
                }
                else
                {
                    Console.WriteLine("[SMTP] Impossible de notifier le site : demandeur introuvable ou propriété 'Site' vide.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SMTP ERROR] Erreur lors de la préparation du mail de décision : {ex.Message}");
            }

            return true;
        }

        public async Task<IEnumerable<object>> GetHistoriqueByDesignationAsync(string designation)
        {
            var articles = await _repo.GetHistoriqueByDesignationAsync(designation);

            var historique = new List<object>();
            foreach (var art in articles)
            {
                var dema = await _repo.GetByIdAsync(art.DemandeId);
                if (dema != null)
                {
                    historique.Add(new
                    {
                        DemandeId = dema.Id,
                        Date = dema.DateTime,
                        Status = dema.Status,
                        CodeLot = art.CodeLot,
                        PrixDeRevient = art.PrixDeRevient // ✅ Correction : Plus de virgule pendante inutile après la dernière propriété !
                   
                    });
                }
            }
            return historique;
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
            Articles = d.Articles.Select(a => new ArticleResponseDto
            {
                Id = a.Id,
                CodeLot = a.CodeLot,
                Designation = a.Designation,
                DemandeId = d.Id,
                PrixDeRevient = a.PrixDeRevient
            }).ToList()
        };
    }
}