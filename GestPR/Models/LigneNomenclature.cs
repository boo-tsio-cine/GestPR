using SharpCompress.Compressors.ZStandard.Unsafe;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestPR.Models;

[Table("LigneNomenclature")]
public class LigneNomenclature
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int NomenclatureId { get; set; }

    [ForeignKey(nameof(NomenclatureId))]
    public virtual Nomenclature? Nomenclature { get; set; }

    
    public int ComposantId { get; set; }

    [ForeignKey(nameof(ComposantId))]
    public virtual Article? Composant { get; set; }

    [Column(TypeName = "decimal(18,4)")]
    public decimal Quantite {  get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal PrixUnitaire { get; set; }




}

