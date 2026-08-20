namespace GestPR.Dtos
{
    public class NomenclatureDto
    {
        public int ArticleId {  get; set; }
        public string CodeArticle { get; set; } = string.Empty;
        public List<LigneNomenclatureDto> Lignes { get; set; }  
    }

    public class LigneNomenclatureDto
    {
        public int ComposantId { get; set; }
        public string CodeComposant { get; set; } = string.Empty;
        public string LibelleComposant { get; set; } = string.Empty;
        public decimal Quantite { get; set; }
        public decimal PrixUnitaire { get; set; }
    }

}
