using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lifemaxing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class FocusHubRefinement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DailyGoalMinutes",
                table: "FocusPreferences",
                type: "integer",
                nullable: false,
                defaultValue: 120);

            migrationBuilder.AddColumn<bool>(
                name: "WorldClockInitialized",
                table: "FocusPreferences",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddCheckConstraint(
                name: "CK_FocusPreferences_DailyGoal",
                table: "FocusPreferences",
                sql: "\"DailyGoalMinutes\" BETWEEN 15 AND 1440 AND \"DailyGoalMinutes\" % 15 = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_FocusPreferences_DailyGoal",
                table: "FocusPreferences");

            migrationBuilder.DropColumn(
                name: "DailyGoalMinutes",
                table: "FocusPreferences");

            migrationBuilder.DropColumn(
                name: "WorldClockInitialized",
                table: "FocusPreferences");
        }
    }
}
