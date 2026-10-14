using GestPR.Repository.Demandes;
using GestPR.Service.Email;
using GestPR.Service.MachineLearning;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace GestPR.Service.Scheduling
{
    // Scanne periodiquement les demandes "En cours" de validation, compare le
    // temps deja ecoule au delai estime (moyenne sur tous les validateurs actifs),
    // et envoie un mail de relance groupe si la demande est en retard.
    public class RelanceValidationBackgroundService : BackgroundService
    {
        // Marge de tolerance avant de considerer une demande "en retard" :
        // le delai predit est une moyenne, pas une garantie stricte.
        private const double MARGE_TOLERANCE = 1.2; // +20%

        // Frequence a laquelle le job tourne
        private static readonly TimeSpan INTERVALLE_SCAN = TimeSpan.FromHours(1);

        // Ne jamais relancer pour la meme demande plus d'une fois par periode
        private static readonly TimeSpan COOLDOWN_RELANCE = TimeSpan.FromHours(24);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<RelanceValidationBackgroundService> _logger;

        public RelanceValidationBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<RelanceValidationBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ScannerEtRelancerAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    // Une erreur sur un cycle ne doit jamais arreter le job definitivement
                    _logger.LogError(ex, "[RELANCE] Erreur lors du scan des demandes en retard.");
                }

                try
                {
                    await Task.Delay(INTERVALLE_SCAN, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    // Arret normal de l'application
                }
            }
        }

        private async Task ScannerEtRelancerAsync(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GestPR.Data.AppDbContext>();
            var estimationService = scope.ServiceProvider.GetRequiredService<IEstimationDelaiService>();
            var demandeRepo = scope.ServiceProvider.GetRequiredService<IDemandeRepository>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            var maintenant = DateTime.UtcNow;

            // Demandes en attente de validation : transmises mais pas encore tranchees
            var demandesEnCours = await context.Demande
                .Include(d => d.Articles)
                .Where(d => d.DateTransmissionValidation != null && d.DateValidation == null)
                .ToListAsync(stoppingToken);

            if (demandesEnCours.Count == 0)
                return;

            var validateurs = await demandeRepo.GetUsersByRoleAsync("Validateur");
            var emailsValidateurs = validateurs
                .Select(v => v.Mail!)
                .Where(e => !string.IsNullOrWhiteSpace(e))
                .ToList();

            if (emailsValidateurs.Count == 0)
            {
                _logger.LogWarning("[RELANCE] Aucun validateur avec adresse mail, relance impossible.");
                return;
            }

            foreach (var demande in demandesEnCours)
            {
                // Cooldown : on ne relance pas si une relance a deja ete envoyee recemment
                if (demande.DateDerniereRelance != null
                    && maintenant - demande.DateDerniereRelance.Value < COOLDOWN_RELANCE)
                {
                    continue;
                }

                var montant = demande.Articles.Sum(a => a.PrixDeRevient);
                var delaiEstimeJours = await estimationService.EstimerDelaiPourMontantAsync(montant);

                // Pas d'estimation disponible (modele pas encore entraine) : rien a comparer
                if (delaiEstimeJours == null)
                    continue;

                var delaiEcouleJours = (maintenant - demande.DateTransmissionValidation!.Value).TotalDays;
                var seuilRetard = delaiEstimeJours.Value * MARGE_TOLERANCE;

                if (delaiEcouleJours <= seuilRetard)
                    continue; // pas encore en retard

                try
                {
                    string sujet = $"[GestPR] Relance : demande #{demande.Id} en attente de validation";
                    string htmlBody = $@"
                        <div style='font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 700px;'>
                            <p>Bonjour,</p>
                            <p>La demande <strong>#{demande.Id}</strong> attend une validation depuis
                            <strong>{Math.Round(delaiEcouleJours, 1)} jour(s)</strong>, au-dela du delai habituel
                            estime pour ce montant (<strong>~{Math.Round(delaiEstimeJours.Value, 1)} jour(s)</strong>).</p>
                            <p>Merci de la traiter en priorite.</p>
                            <p style='margin-top: 20px;'>Cordialement,<br/>GestPR</p>
                        </div>";

                    await emailService.SendHtmlEmailAsync(emailsValidateurs, sujet, htmlBody);

                    demande.DateDerniereRelance = maintenant;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[RELANCE] Echec de l'envoi pour la demande {Id}", demande.Id);
                }
            }

            await context.SaveChangesAsync(stoppingToken);
        }
    }
}
