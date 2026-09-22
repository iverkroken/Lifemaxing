using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lifemaxing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class FocusTimeHub : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FocusRunId",
                table: "FocusSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PlannedSeconds",
                table: "FocusSessions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FocusPreferences",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Custom_Method = table.Column<string>(type: "text", nullable: false),
                    Custom_FocusMinutes = table.Column<int>(type: "integer", nullable: false),
                    Custom_BreakMinutes = table.Column<int>(type: "integer", nullable: false),
                    Custom_LongBreakMinutes = table.Column<int>(type: "integer", nullable: false),
                    Custom_SessionsBeforeLongBreak = table.Column<int>(type: "integer", nullable: false),
                    Custom_TotalSessions = table.Column<int>(type: "integer", nullable: true),
                    Custom_SmartMinutes = table.Column<int>(type: "integer", nullable: false),
                    SoundEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    Sound = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Volume = table.Column<int>(type: "integer", nullable: false),
                    FocusSound = table.Column<bool>(type: "boolean", nullable: false),
                    BreakSound = table.Column<bool>(type: "boolean", nullable: false),
                    Notifications = table.Column<bool>(type: "boolean", nullable: false),
                    AutoBreak = table.Column<bool>(type: "boolean", nullable: false),
                    AutoFocus = table.Column<bool>(type: "boolean", nullable: false),
                    KeepAwake = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FocusPreferences", x => x.UserId);
                    table.CheckConstraint("CK_FocusPreferences_Volume", "\"Volume\" BETWEEN 0 AND 100");
                    table.ForeignKey(
                        name: "FK_FocusPreferences_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FocusRuns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Configuration_Method = table.Column<string>(type: "text", nullable: false),
                    Configuration_FocusMinutes = table.Column<int>(type: "integer", nullable: false),
                    Configuration_BreakMinutes = table.Column<int>(type: "integer", nullable: false),
                    Configuration_LongBreakMinutes = table.Column<int>(type: "integer", nullable: false),
                    Configuration_SessionsBeforeLongBreak = table.Column<int>(type: "integer", nullable: false),
                    Configuration_TotalSessions = table.Column<int>(type: "integer", nullable: true),
                    Configuration_SmartMinutes = table.Column<int>(type: "integer", nullable: false),
                    RuleVersion = table.Column<int>(type: "integer", nullable: false),
                    State = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Phase = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PeriodIndex = table.Column<int>(type: "integer", nullable: false),
                    RemainingSeconds = table.Column<int>(type: "integer", nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastObservedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndsAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    InterruptedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ControllerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Revision = table.Column<long>(type: "bigint", nullable: false),
                    BlockAutoStart = table.Column<bool>(type: "boolean", nullable: false),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: true),
                    GoalId = table.Column<Guid>(type: "uuid", nullable: true),
                    HabitId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FocusRuns", x => x.Id);
                    table.CheckConstraint("CK_FocusRun_State", "\"RemainingSeconds\" >= 0 AND \"PeriodIndex\" >= 0 AND \"State\" IN ('Running','Paused','Interrupted','Ready','Ended') AND \"Phase\" IN ('Focus','Break')");
                    table.ForeignKey(
                        name: "FK_FocusRuns_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FocusWorkSpans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FocusSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FocusWorkSpans", x => x.Id);
                    table.CheckConstraint("CK_FocusSpan_Time", "\"EndedAtUtc\" >= \"StartedAtUtc\"");
                    table.ForeignKey(
                        name: "FK_FocusWorkSpans_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FocusWorkSpans_FocusSessions_FocusSessionId",
                        column: x => x.FocusSessionId,
                        principalTable: "FocusSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorldClockCities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TimeZoneId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorldClockCities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorldClockCities_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FocusSessions_FocusRunId",
                table: "FocusSessions",
                column: "FocusRunId");

            migrationBuilder.CreateIndex(
                name: "IX_FocusRuns_UserId",
                table: "FocusRuns",
                column: "UserId",
                unique: true,
                filter: "\"EndedAtUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_FocusWorkSpans_FocusSessionId",
                table: "FocusWorkSpans",
                column: "FocusSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_FocusWorkSpans_UserId_StartedAtUtc",
                table: "FocusWorkSpans",
                columns: new[] { "UserId", "StartedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_WorldClockCities_UserId_Name_TimeZoneId",
                table: "WorldClockCities",
                columns: new[] { "UserId", "Name", "TimeZoneId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_FocusSessions_FocusRuns_FocusRunId",
                table: "FocusSessions",
                column: "FocusRunId",
                principalTable: "FocusRuns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FocusSessions_FocusRuns_FocusRunId",
                table: "FocusSessions");

            migrationBuilder.DropTable(
                name: "FocusPreferences");

            migrationBuilder.DropTable(
                name: "FocusRuns");

            migrationBuilder.DropTable(
                name: "FocusWorkSpans");

            migrationBuilder.DropTable(
                name: "WorldClockCities");

            migrationBuilder.DropIndex(
                name: "IX_FocusSessions_FocusRunId",
                table: "FocusSessions");

            migrationBuilder.DropColumn(
                name: "FocusRunId",
                table: "FocusSessions");

            migrationBuilder.DropColumn(
                name: "PlannedSeconds",
                table: "FocusSessions");
        }
    }
}
