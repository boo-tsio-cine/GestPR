namespace GestPR.DTOs
{
    public class WindowsAuthResultDto
    {
        public string Username { get; set; } = string.Empty;
        public string? Nom { get; set; }
        public string? Prenom { get; set; }
        public string? Role { get; set; }
        public bool IsAuthenticated { get; set; }
        public string? Message { get; set; }
    }
}