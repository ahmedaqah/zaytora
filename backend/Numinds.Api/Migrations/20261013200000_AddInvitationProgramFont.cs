using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Numinds.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInvitationProgramFont : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProgramFont",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ProgramFontSize",
                table: "Invitations",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProgramFont",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "ProgramFontSize",
                table: "Invitations");
        }
    }
}
