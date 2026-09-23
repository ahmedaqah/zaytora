using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Numinds.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTemplateSceneLayout : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SceneLayoutStyle",
                table: "Templates",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ScenesJson",
                table: "Templates",
                type: "character varying(4096)",
                maxLength: 4096,
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000001"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000002"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000003"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000004"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000005"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000006"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000007"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000008"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000009"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000a"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000b"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000c"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000d"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000e"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-00000000000f"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000010"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000011"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000012"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000013"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000014"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000015"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000016"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000017"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });

            migrationBuilder.UpdateData(
                table: "Templates",
                keyColumn: "Id",
                keyValue: new Guid("8f14e45f-ceea-467e-adb2-000000000018"),
                columns: new[] { "SceneLayoutStyle", "ScenesJson" },
                values: new object[] { null, "[]" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SceneLayoutStyle",
                table: "Templates");

            migrationBuilder.DropColumn(
                name: "ScenesJson",
                table: "Templates");
        }
    }
}
