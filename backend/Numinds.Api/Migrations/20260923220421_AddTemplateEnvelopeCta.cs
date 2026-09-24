using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Numinds.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTemplateEnvelopeCta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EnvelopeCtaBgColor",
                table: "Templates",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnvelopeCtaShape",
                table: "Templates",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnvelopeCtaTextAr",
                table: "Templates",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnvelopeCtaTextColor",
                table: "Templates",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnvelopeCtaTextEn",
                table: "Templates",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000001"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000002"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000003"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000004"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000005"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000006"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000007"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000008"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000009"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000a"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000b"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000c"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000d"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000e"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000f"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000010"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000011"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000012"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000013"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000014"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000015"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000016"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000017"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000018"),
                columns: new[] { "EnvelopeCtaBgColor", "EnvelopeCtaShape", "EnvelopeCtaTextAr", "EnvelopeCtaTextColor", "EnvelopeCtaTextEn" },
                values: new object[] { null, null, null, null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EnvelopeCtaBgColor",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "EnvelopeCtaShape",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "EnvelopeCtaTextAr",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "EnvelopeCtaTextColor",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "EnvelopeCtaTextEn",
                table: "Templates");
        }
    }
}
