using GestPR.Dtos;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestPR.Models
{
    [Table("Nomenclatures")]
    public class Nomenclature
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ArticleId { get; set; }

        [Required]
        [StringLength(50)]
        public string CodeArticle { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty ;

        public DateTime DateCreation { get; set; } = DateTime.UtcNow;

        public virtual ICollection<LigneNomenclature> Lignes { get; set; } = new List<LigneNomenclature>();
    }
}
