namespace GestPR.Dtos
{
    public class OrigineCreateDto
    {
        public string pays { get; set; } = "";
    }

    public class OrigineResponseDto
    {
        public int Id { get; set; }
        public string pays { get; set; } = "";
    }
}