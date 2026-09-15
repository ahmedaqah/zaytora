using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Numinds.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInvitationTransferToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TransferToken",
                table: "Invitations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TransferTokenExpiresAt",
                table: "Invitations",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TransferToken",
                table: "Invitations");

            migrationBuilder.DropColumn(
                name: "TransferTokenExpiresAt",
                table: "Invitations");
        }
    }
}
