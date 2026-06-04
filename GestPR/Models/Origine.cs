using System.ComponentModel.DataAnnotations;

namespace GestPR.Models
{
    public class Origine
    {

        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string pays { get; set; } = string.Empty;
    }
}
