using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Numinds.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSectionTypography : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VenueFont",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VenueFontSize",
                table: "Invitations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VenueTextColor",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonalMessageFont",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PersonalMessageFontSize",
                table: "Invitations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonalMessageTextColor",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EventRulesFont",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EventRulesFontSize",
                table: "Invitations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EventRulesTextColor",
                table: "Invitations",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VenueFont",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "VenueFontSize",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "VenueTextColor",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "PersonalMessageFont",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "PersonalMessageFontSize",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "PersonalMessageTextColor",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "EventRulesFont",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "EventRulesFontSize",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "EventRulesTextColor",
                table: "Invitations");
        }
    }
}
