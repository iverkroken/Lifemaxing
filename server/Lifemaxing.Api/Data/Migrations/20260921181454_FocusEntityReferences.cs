using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lifemaxing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class FocusEntityReferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GoalId",
                table: "FocusSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "HabitId",
                table: "FocusSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FocusSessions_GoalId",
                table: "FocusSessions",
                column: "GoalId");

            migrationBuilder.CreateIndex(
                name: "IX_FocusSessions_HabitId",
                table: "FocusSessions",
                column: "HabitId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Focus_Reference",
                table: "FocusSessions",
                sql: "num_nonnulls(\"TaskId\", \"GoalId\", \"HabitId\") <= 1");

            migrationBuilder.AddForeignKey(
                name: "FK_FocusSessions_Goals_GoalId",
                table: "FocusSessions",
                column: "GoalId",
                principalTable: "Goals",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_FocusSessions_Habits_HabitId",
                table: "FocusSessions",
                column: "HabitId",
                principalTable: "Habits",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FocusSessions_Goals_GoalId",
                table: "FocusSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_FocusSessions_Habits_HabitId",
                table: "FocusSessions");

            migrationBuilder.DropIndex(
                name: "IX_FocusSessions_GoalId",
                table: "FocusSessions");

            migrationBuilder.DropIndex(
                name: "IX_FocusSessions_HabitId",
                table: "FocusSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Focus_Reference",
                table: "FocusSessions");

            migrationBuilder.DropColumn(
                name: "GoalId",
                table: "FocusSessions");

            migrationBuilder.DropColumn(
                name: "HabitId",
                table: "FocusSessions");
        }
    }
}
