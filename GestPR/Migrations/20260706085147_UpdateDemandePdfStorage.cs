using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestPR.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDemandePdfStorage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PdfFileName",
                table: "Demande",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PdfFileName",
                table: "Demande");
        }
    }
}
