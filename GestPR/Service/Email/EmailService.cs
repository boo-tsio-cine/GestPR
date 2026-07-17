using System.Collections.Generic;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
namespace GestPR.Service.Email
{
    public class EmailService: IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config) 
        {
            _config = config;
        }

        public async Task SendHtmlEmailAsync(List<string> toAddresses, string subject, string htmlBody)
        {
            if (toAddresses == null || toAddresses.Count == 0) return;

            var smtpSection = _config.GetSection("SmtpSettings");

            using var client = new SmtpClient(smtpSection["Server"], int.Parse(smtpSection["Port"] ?? "587"))
            {
                Credentials = new NetworkCredential(smtpSection["Username"], smtpSection["Password"]),
                EnableSsl = bool.Parse(smtpSection["EnableSsl"] ?? "true")
            };

            using var mailMessage = new MailMessage();
            mailMessage.From = new MailAddress(smtpSection["SenderEmail"]!, smtpSection["SenderName"]);
            mailMessage.Subject = subject;
            mailMessage.Body = htmlBody;
            mailMessage.IsBodyHtml = true;

            foreach (var email in toAddresses)
            {
                if (!string.IsNullOrWhiteSpace(email))
                {
                    mailMessage.To.Add(email.Trim());
                }
            }

            await client.SendMailAsync(mailMessage);

        }
    }
}
