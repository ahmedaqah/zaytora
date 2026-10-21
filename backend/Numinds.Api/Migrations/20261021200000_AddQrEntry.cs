using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Numinds.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQrEntry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "QrCheckins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvitationId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScannerId = table.Column<Guid>(type: "uuid", nullable: true),
                    ScannerLabel = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    GuestName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    PartySize = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QrCheckins", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QrCheckins_Invitations_InvitationId",
                        column: x => x.InvitationId,
                        principalTable: "Invitations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QrScanners",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvitationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QrScanners", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QrScanners_Invitations_InvitationId",
                        column: x => x.InvitationId,
                        principalTable: "Invitations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_QrCheckins_InvitationId",
                table: "QrCheckins",
                column: "InvitationId");

            migrationBuilder.CreateIndex(
                name: "IX_QrScanners_InvitationId",
                table: "QrScanners",
                column: "InvitationId");

            migrationBuilder.CreateIndex(
                name: "IX_QrScanners_Token",
                table: "QrScanners",
                column: "Token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "QrCheckins");

            migrationBuilder.DropTable(
                name: "QrScanners");
        }
    }
}
