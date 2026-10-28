using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Numinds.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCountdownTypography : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CountdownNumberFont",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CountdownNumberTextColor",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CountdownNumberFontSize",
                table: "Invitations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CountdownLabelFont",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CountdownLabelTextColor",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CountdownLabelFontSize",
                table: "Invitations",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CountdownNumberFont",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "CountdownNumberTextColor",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "CountdownNumberFontSize",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "CountdownLabelFont",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "CountdownLabelTextColor",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "CountdownLabelFontSize",
                table: "Invitations");
        }
    }
}
