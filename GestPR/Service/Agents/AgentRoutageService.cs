namespace GestPR.Service.Agents
{
    // Agents/AgentRoutageService.cs
    public class AgentRoutageService : BackgroundService
    {
        private readonly AgentCommunicationChannel _bus;
        private readonly ILogger<AgentRoutageService> _logger;

        public AgentRoutageService(AgentCommunicationChannel bus, ILogger<AgentRoutageService> logger)
        {
            _bus = bus;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await foreach (var message in _bus.CanalRoutage.Reader.ReadAllAsync(stoppingToken))
            {
                _logger.LogInformation("[Agent Routage] Routage du document {Id}", message.Id);

                message.Destination = message.AnomalieDetectee
                    ? "Responsable Financier (vérification manuelle requise)"
                    : "Service Comptabilité (traitement automatique)";
                message.Statut = "Routé";
                message.Journal.Add($"Routage vers: {message.Destination}");

                _bus.Historique.Add(message);
            }
        }
    }
}
