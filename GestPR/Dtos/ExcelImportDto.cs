namespace GestPR.Dtos
{
    public class ExcelImportDto
    {
        public decimal? Cours { get; set; }
        public decimal? Tc { get; set; }
        public decimal? FobTotal { get; set; }
        public decimal? MfobTotal { get; set; }
        public decimal? FretTotal { get; set; }
        public decimal? DeboursTransit { get; set; }
        public decimal? TransportLocal { get; set; }
        public decimal? CommissionRemun { get; set; }
        public decimal? Douanes { get; set; }
        public decimal? PrestationGasyNet { get; set; }
        public decimal? Apmf { get; set; }
        public decimal? AutresDat { get; set; }
    }

    public class ExcelUploadDto
    {
        public required IFormFile Fichier { get; set; }
    }
}