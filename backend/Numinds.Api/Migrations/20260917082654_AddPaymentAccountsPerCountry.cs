using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Numinds.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentAccountsPerCountry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PaymentAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CountryCode = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    RecipientName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    AccountNumber = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    BankName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Iban = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Instructions = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentAccounts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAccounts_CountryCode",
                table: "PaymentAccounts",
                column: "CountryCode",
                unique: true);

            // Carries the old singleton PaymentSettings row's real data
            // forward as the new, always-present "INTL" fallback account —
            // an admin who already filled in a receiving account shouldn't
            // silently lose it just because this table changed shape. Only
            // copies it if it was ever actually filled in (RecipientName
            // non-empty); a fresh/never-configured database has nothing
            // worth carrying forward.
            migrationBuilder.Sql(
                @"INSERT INTO ""PaymentAccounts"" (""Id"", ""CountryCode"", ""RecipientName"", ""AccountNumber"", ""BankName"", ""Iban"", ""Instructions"")
                  SELECT '66666666-6666-6666-6666-666666666666', 'INTL', ""RecipientName"", ""AccountNumber"", ""BankName"", ""Iban"", ""Instructions""
                  FROM ""PaymentSettings""
                  WHERE ""RecipientName"" <> '' AND ""AccountNumber"" <> ''
                  LIMIT 1;");

            migrationBuilder.DropTable(
                name: "PaymentSettings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentAccounts");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "Orders");

            migrationBuilder.CreateTable(
                name: "PaymentSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountNumber = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    BankName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Iban = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Instructions = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    RecipientName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentSettings", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "PaymentSettings",
                columns: new[] { "Id", "AccountNumber", "BankName", "Iban", "Instructions", "RecipientName" },
                values: new object[] { new Guid("44444444-4444-4444-4444-444444444444"), "", null, null, null, "" });
        }
    }
}
