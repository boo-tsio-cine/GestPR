namespace GestPR.Service.Agents
{
    // Agents/AgentControleFinancierService.cs
    public class AgentControleFinancierService : BackgroundService
    {
        private readonly AgentCommunicationChannel _bus;
        private readonly ILogger<AgentControleFinancierService> _logger;
        private const decimal SeuilAnomalie = 1_000_000;

        public AgentControleFinancierService(AgentCommunicationChannel bus, ILogger<AgentControleFinancierService> logger)
        {
            _bus = bus;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await foreach (var message in _bus.CanalControle.Reader.ReadAllAsync(stoppingToken))
            {
                _logger.LogInformation("[Agent Contrôleur Financier] Vérification du document {Id}", message.Id);

                message.AnomalieDetectee = message.MontantDetecte <= 0 || message.MontantDetecte > SeuilAnomalie;
                message.Statut = message.AnomalieDetectee ? "Anomalie détectée" : "Contrôle validé";
                message.Journal.Add($"Contrôle: {(message.AnomalieDetectee ? "anomalie" : "OK")}");

                await _bus.CanalRoutage.Writer.WriteAsync(message, stoppingToken);
            }
        }
    }
}
