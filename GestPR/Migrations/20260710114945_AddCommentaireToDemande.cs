using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestPR.Migrations
{
    /// <inheritdoc />
    public partial class AddCommentaireToDemande : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Commentaire",
                table: "Demande",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Commentaire",
                table: "Demande");
        }
    }
}
