using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lifemaxing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InterfacePreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Density",
                table: "UserSettings",
                type: "character varying(7)",
                maxLength: 7,
                nullable: false,
                defaultValue: "normal");

            migrationBuilder.AddColumn<string>(
                name: "Theme",
                table: "UserSettings",
                type: "character varying(6)",
                maxLength: 6,
                nullable: false,
                defaultValue: "system");

            migrationBuilder.AddColumn<string>(
                name: "UiLanguage",
                table: "UserSettings",
                type: "character varying(2)",
                maxLength: 2,
                nullable: false,
                defaultValue: "en");
            // Preserve the interface language previously derived from Locale, without changing Locale or historical dates.
            migrationBuilder.Sql("""
                UPDATE "UserSettings" SET "UiLanguage" = CASE
                    WHEN lower(split_part("Locale", '-', 1)) IN ('nb', 'nn', 'no') THEN 'nb'
                    WHEN lower(split_part("Locale", '-', 1)) = 'sv' THEN 'sv'
                    WHEN lower(split_part("Locale", '-', 1)) = 'da' THEN 'da'
                    ELSE 'en' END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Density",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "Theme",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "UiLanguage",
                table: "UserSettings");
        }
    }
}
