using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Numinds.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDateTimeFormatAndExtraMessage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WeekdayFontSize",
                table: "Invitations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DateFontSize",
                table: "Invitations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DateMonthStyle",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TimeFormat",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WeekdayFont",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WeekdayTextColor",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DateFont",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DateTextColor",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonalMessageExtraText",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonalMessageExtraFont",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PersonalMessageExtraFontSize",
                table: "Invitations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonalMessageExtraTextColor",
                table: "Invitations",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WeekdayFontSize",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "DateFontSize",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "DateMonthStyle",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "TimeFormat",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "WeekdayFont",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "WeekdayTextColor",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "DateFont",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "DateTextColor",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "PersonalMessageExtraText",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "PersonalMessageExtraFont",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "PersonalMessageExtraFontSize",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "PersonalMessageExtraTextColor",
                table: "Invitations");
        }
    }
}
