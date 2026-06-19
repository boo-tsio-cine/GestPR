using System.ComponentModel.DataAnnotations;

namespace GestPR.Models
{
    public class User
    {
        public int Id { get; set; }

        public string AdUsername { get; set; }
        public string Role { get; set; }
        public bool IsActive { get; set; }
    }
}
