using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestPR.Migrations
{
    /// <inheritdoc />
    public partial class ChangeDemandeToApplicationUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Demande_Users_DemandeurId",
                table: "Demande");

            migrationBuilder.RenameTable(
                name: "ApplicationUsers",
                schema: "dbo",
                newName: "ApplicationUsers");

            migrationBuilder.AddForeignKey(
                name: "FK_Demande_ApplicationUsers_DemandeurId",
                table: "Demande",
                column: "DemandeurId",
                principalTable: "ApplicationUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Demande_ApplicationUsers_DemandeurId",
                table: "Demande");

            migrationBuilder.EnsureSchema(
                name: "dbo");

            migrationBuilder.RenameTable(
                name: "ApplicationUsers",
                newName: "ApplicationUsers",
                newSchema: "dbo");

            migrationBuilder.AddForeignKey(
                name: "FK_Demande_Users_DemandeurId",
                table: "Demande",
                column: "DemandeurId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
