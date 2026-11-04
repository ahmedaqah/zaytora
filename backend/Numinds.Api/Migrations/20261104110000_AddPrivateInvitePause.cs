using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Numinds.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPrivateInvitePause : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPaused",
                table: "PrivateInvites",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPaused",
                table: "PrivateInvites");
        }
    }
}
