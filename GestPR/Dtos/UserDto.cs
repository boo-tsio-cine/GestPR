using System.Collections.Specialized;

namespace GestPR.Dtos
{
    public class UserCreateDDto
    {
        public string Nom { get; set; } = "";
        public string Prenom { get; set; } = "";
        public string Matricule { get; set; } = "";
        public string Mail { get; set; } = "";
        public string? Fixe { get; set; } = "";
        public string Role { get; set; } = "";
        public string Site { get; set; } = "";

    }

    public class UserResponseDDto
    {
        public int Id { get; set; }
        public string Nom { get; set; } = "";
        public string Prenom { get; set; } = "";
        public string Matricule { get; set; } = "";
        public string Mail { get; set; } = "";
        public string? Fixe { get; set; } = "";
        public string Role { get; set; } = "";
        public string Site { get; set; } = "";

    }
}
