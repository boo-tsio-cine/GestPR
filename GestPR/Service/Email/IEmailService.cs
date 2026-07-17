namespace GestPR.Service.Email
{
    public interface IEmailService
    {
        Task SendHtmlEmailAsync(List<string> toAdresses,string subject,string htmlBody);
    }
}
