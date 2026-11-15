using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Numinds.Api.Data;

#nullable disable

namespace Numinds.Api.Migrations
{
    // Written by hand (no Designer file): it only adds two Orders columns, and
    // the model snapshot is updated to match. Existing orders become "bank".
    /// <inheritdoc />
    [DbContext(typeof(NumindsDbContext))]
    [Migration("20261115120000_AddOrderCardPayment")]
    public partial class AddOrderCardPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentMethod",
                table: "Orders",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "bank");

            migrationBuilder.AddColumn<string>(
                name: "GatewayPaymentId",
                table: "Orders",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "GatewayPaymentId",
                table: "Orders");
        }
    }
}
