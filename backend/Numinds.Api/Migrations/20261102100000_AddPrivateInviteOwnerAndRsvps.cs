using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Numinds.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPrivateInviteOwnerAndRsvps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OwnerUserId",
                table: "PrivateInvites",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransferToken",
                table: "PrivateInvites",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TransferTokenExpiresAt",
                table: "PrivateInvites",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PrivateInviteRsvps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PrivateInviteId = table.Column<Guid>(type: "uuid", nullable: false),
                    GuestName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Attending = table.Column<bool>(type: "boolean", nullable: true),
                    GuestCount = table.Column<int>(type: "integer", nullable: true),
                    Message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrivateInviteRsvps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrivateInviteRsvps_PrivateInvites_PrivateInviteId",
                        column: x => x.PrivateInviteId,
                        principalTable: "PrivateInvites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PrivateInvites_OwnerUserId",
                table: "PrivateInvites",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PrivateInvites_TransferToken",
                table: "PrivateInvites",
                column: "TransferToken");

            migrationBuilder.CreateIndex(
                name: "IX_PrivateInviteRsvps_PrivateInviteId",
                table: "PrivateInviteRsvps",
                column: "PrivateInviteId");

            migrationBuilder.AddForeignKey(
                name: "FK_PrivateInvites_AspNetUsers_OwnerUserId",
                table: "PrivateInvites",
                column: "OwnerUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PrivateInvites_AspNetUsers_OwnerUserId",
                table: "PrivateInvites");

            migrationBuilder.DropTable(
                name: "PrivateInviteRsvps");

            migrationBuilder.DropIndex(
                name: "IX_PrivateInvites_OwnerUserId",
                table: "PrivateInvites");

            migrationBuilder.DropIndex(
                name: "IX_PrivateInvites_TransferToken",
                table: "PrivateInvites");

            migrationBuilder.DropColumn(
                name: "OwnerUserId",
                table: "PrivateInvites");

            migrationBuilder.DropColumn(
                name: "TransferToken",
                table: "PrivateInvites");

            migrationBuilder.DropColumn(
                name: "TransferTokenExpiresAt",
                table: "PrivateInvites");
        }
    }
}
