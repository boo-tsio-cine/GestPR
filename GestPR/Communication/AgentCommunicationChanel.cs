// Communication/AgentCommunicationChannel.cs
using GestPR.Models;
using System.Threading.Channels;

public class AgentCommunicationChannel
{
    public Channel<AgentMessage> CanalOcr { get; } = Channel.CreateUnbounded<AgentMessage>();
    public Channel<AgentMessage> CanalControle { get; } = Channel.CreateUnbounded<AgentMessage>();
    public Channel<AgentMessage> CanalRoutage { get; } = Channel.CreateUnbounded<AgentMessage>();

    // Permet de suivre les messages traités (pour affichage dans l'UI/Swagger)
    public List<AgentMessage> Historique { get; } = new();
}