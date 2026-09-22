using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lifemaxing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class DailyWorkspaceAndHabitXp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Habit_Xp",
                table: "Habits");

            migrationBuilder.CreateTable(
                name: "DailyGoalSelections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GoalId = table.Column<Guid>(type: "uuid", nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TimeZoneId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SelectedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RemovedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyGoalSelections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyGoalSelections_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DailyGoalSelections_Goals_GoalId",
                        column: x => x.GoalId,
                        principalTable: "Goals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // Correct only invalid current configuration; historical awards remain immutable.
            migrationBuilder.Sql("UPDATE \"Habits\" SET \"XpPerLog\" = 10 WHERE \"XpPerLog\" = 0;");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Habit_Xp",
                table: "Habits",
                sql: "\"XpPerLog\" BETWEEN 1 AND 75");

            migrationBuilder.CreateIndex(
                name: "IX_DailyGoalSelections_GoalId",
                table: "DailyGoalSelections",
                column: "GoalId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyGoalSelections_UserId_LocalDate_GoalId",
                table: "DailyGoalSelections",
                columns: new[] { "UserId", "LocalDate", "GoalId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyGoalSelections");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Habit_Xp",
                table: "Habits");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Habit_Xp",
                table: "Habits",
                sql: "\"XpPerLog\" BETWEEN 0 AND 25");
        }
    }
}
