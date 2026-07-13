using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestPR.Migrations
{
    /// <inheritdoc />
    public partial class AddPrixDeRevientToArticle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Site",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "PrixDeRevient",
                table: "Article",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Site",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PrixDeRevient",
                table: "Article");
        }
    }
}
