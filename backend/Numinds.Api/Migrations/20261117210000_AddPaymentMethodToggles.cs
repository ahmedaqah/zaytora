using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Numinds.Api.Data;

#nullable disable

namespace Numinds.Api.Migrations
{
    // Written by hand (no Designer file), like AddOrderCardPayment: it only adds two PaymentAccounts columns and
    // the model snapshot is updated to match. Existing rows start with both card and bank transfer on.
    /// <inheritdoc />
    [DbContext(typeof(NumindsDbContext))]
    [Migration("20261117210000_AddPaymentMethodToggles")]
    public partial class AddPaymentMethodToggles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CardEnabled",
                table: "PaymentAccounts",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "BankEnabled",
                table: "PaymentAccounts",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CardEnabled",
                table: "PaymentAccounts");

            migrationBuilder.DropColumn(
                name: "BankEnabled",
                table: "PaymentAccounts");
        }
    }
}
