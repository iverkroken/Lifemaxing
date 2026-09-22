using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lifemaxing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SoftDeleteAndCustomLifeAreas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_XpEntries_LifeAreas_LifeAreaId",
                table: "XpEntries");

            migrationBuilder.DropIndex(
                name: "IX_XpEntries_LifeAreaId",
                table: "XpEntries");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ArchivedAtUtc",
                table: "Tasks",
                type: "timestamp with time zone",
                nullable: true);

            // Task.DeletedAtUtc used to mean indefinite archival. Keep those records archived
            // and ensure no existing record enters the new 30-day recovery window.
            migrationBuilder.Sql("UPDATE \"Tasks\" SET \"ArchivedAtUtc\" = \"DeletedAtUtc\", \"DeletedAtUtc\" = NULL WHERE \"DeletedAtUtc\" IS NOT NULL;");

            migrationBuilder.AddColumn<byte[]>(
                name: "CustomImage",
                table: "LifeAreas",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomImageContentType",
                table: "LifeAreas",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CustomImageUpdatedAtUtc",
                table: "LifeAreas",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeletedAtUtc",
                table: "LifeAreas",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ImageFocalX",
                table: "LifeAreas",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 50m);

            migrationBuilder.AddColumn<decimal>(
                name: "ImageFocalY",
                table: "LifeAreas",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 50m);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeletedAtUtc",
                table: "Habits",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeletedAtUtc",
                table: "Goals",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_XpEntries_UserId_LifeAreaId",
                table: "XpEntries",
                columns: new[] { "UserId", "LifeAreaId" });

            migrationBuilder.CreateIndex(
                name: "IX_LifeAreas_UserId_DeletedAtUtc",
                table: "LifeAreas",
                columns: new[] { "UserId", "DeletedAtUtc" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_LifeArea_CustomImage",
                table: "LifeAreas",
                sql: "(\"CustomImage\" IS NULL AND \"CustomImageContentType\" IS NULL AND \"CustomImageUpdatedAtUtc\" IS NULL) OR (\"CustomImage\" IS NOT NULL AND \"CustomImageContentType\" IS NOT NULL AND \"CustomImageUpdatedAtUtc\" IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_LifeArea_ImageFocal",
                table: "LifeAreas",
                sql: "\"ImageFocalX\" BETWEEN 0 AND 100 AND \"ImageFocalY\" BETWEEN 0 AND 100");

            migrationBuilder.CreateIndex(
                name: "IX_Habits_UserId_DeletedAtUtc",
                table: "Habits",
                columns: new[] { "UserId", "DeletedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Goals_UserId_DeletedAtUtc",
                table: "Goals",
                columns: new[] { "UserId", "DeletedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE \"Tasks\" SET \"DeletedAtUtc\" = \"ArchivedAtUtc\" WHERE \"ArchivedAtUtc\" IS NOT NULL;");

            migrationBuilder.DropIndex(
                name: "IX_XpEntries_UserId_LifeAreaId",
                table: "XpEntries");

            migrationBuilder.DropIndex(
                name: "IX_LifeAreas_UserId_DeletedAtUtc",
                table: "LifeAreas");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LifeArea_CustomImage",
                table: "LifeAreas");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LifeArea_ImageFocal",
                table: "LifeAreas");

            migrationBuilder.DropIndex(
                name: "IX_Habits_UserId_DeletedAtUtc",
                table: "Habits");

            migrationBuilder.DropIndex(
                name: "IX_Goals_UserId_DeletedAtUtc",
                table: "Goals");

            migrationBuilder.DropColumn(
                name: "ArchivedAtUtc",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "CustomImage",
                table: "LifeAreas");

            migrationBuilder.DropColumn(
                name: "CustomImageContentType",
                table: "LifeAreas");

            migrationBuilder.DropColumn(
                name: "CustomImageUpdatedAtUtc",
                table: "LifeAreas");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "LifeAreas");

            migrationBuilder.DropColumn(
                name: "ImageFocalX",
                table: "LifeAreas");

            migrationBuilder.DropColumn(
                name: "ImageFocalY",
                table: "LifeAreas");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "Habits");

            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "Goals");

            migrationBuilder.CreateIndex(
                name: "IX_XpEntries_LifeAreaId",
                table: "XpEntries",
                column: "LifeAreaId");

            migrationBuilder.AddForeignKey(
                name: "FK_XpEntries_LifeAreas_LifeAreaId",
                table: "XpEntries",
                column: "LifeAreaId",
                principalTable: "LifeAreas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
