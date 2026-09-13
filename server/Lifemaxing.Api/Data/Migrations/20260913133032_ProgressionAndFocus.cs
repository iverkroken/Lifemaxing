using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lifemaxing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ProgressionAndFocus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AwardedXp",
                table: "TaskCompletions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "XpPerLog",
                table: "Habits",
                type: "integer",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.CreateTable(
                name: "ActivityEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    SubjectKind = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    SubjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    LifeAreaId = table.Column<Guid>(type: "uuid", nullable: true),
                    OccurredAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Summary = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    SchemaVersion = table.Column<int>(type: "integer", nullable: false),
                    SourceEventId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ActivityEvents_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CommandReceipts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientActionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Operation = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    RequestHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ResultId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ResponseJson = table.Column<string>(type: "jsonb", nullable: false),
                    StatusCode = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommandReceipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommandReceipts_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FocusSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: true),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RunningSinceUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    AccumulatedSeconds = table.Column<long>(type: "bigint", nullable: false),
                    EndedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FocusSessions", x => x.Id);
                    table.CheckConstraint("CK_Focus_State", "\"AccumulatedSeconds\" >= 0 AND (\"EndedAtUtc\" IS NULL OR \"EndedAtUtc\" >= \"StartedAtUtc\") AND ((\"Status\" = 'Running' AND \"RunningSinceUtc\" IS NOT NULL AND \"EndedAtUtc\" IS NULL) OR (\"Status\" = 'Paused' AND \"RunningSinceUtc\" IS NULL AND \"EndedAtUtc\" IS NULL) OR (\"Status\" IN ('Completed', 'Stopped', 'Cancelled') AND \"RunningSinceUtc\" IS NULL AND \"EndedAtUtc\" IS NOT NULL))");
                    table.ForeignKey(
                        name: "FK_FocusSessions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FocusSessions_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Rewards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RequiredLevel = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ArchivedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rewards", x => x.Id);
                    table.CheckConstraint("CK_Reward_Level", "\"RequiredLevel\" BETWEEN 1 AND 100000");
                    table.ForeignKey(
                        name: "FK_Rewards_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "XpEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AmountSigned = table.Column<int>(type: "integer", nullable: false),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SourceKind = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    SourceId = table.Column<Guid>(type: "uuid", nullable: false),
                    RelatedEntryId = table.Column<Guid>(type: "uuid", nullable: true),
                    LifeAreaId = table.Column<Guid>(type: "uuid", nullable: true),
                    OccurredAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TimeZoneId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    RuleVersion = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_XpEntries", x => x.Id);
                    table.CheckConstraint("CK_Xp_Sign", "(\"Kind\" = 'Award' AND \"AmountSigned\" >= 0 AND \"RelatedEntryId\" IS NULL) OR (\"Kind\" = 'Reversal' AND \"AmountSigned\" <= 0 AND \"RelatedEntryId\" IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_XpEntries_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_XpEntries_LifeAreas_LifeAreaId",
                        column: x => x.LifeAreaId,
                        principalTable: "LifeAreas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_XpEntries_XpEntries_RelatedEntryId",
                        column: x => x.RelatedEntryId,
                        principalTable: "XpEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RewardClaims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RewardId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RewardClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RewardClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RewardClaims_Rewards_RewardId",
                        column: x => x.RewardId,
                        principalTable: "Rewards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Habit_Xp",
                table: "Habits",
                sql: "\"XpPerLog\" BETWEEN 0 AND 25");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityEvents_UserId_Kind_SourceEventId",
                table: "ActivityEvents",
                columns: new[] { "UserId", "Kind", "SourceEventId" },
                unique: true,
                filter: "\"SourceEventId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityEvents_UserId_OccurredAtUtc",
                table: "ActivityEvents",
                columns: new[] { "UserId", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_CommandReceipts_UserId_ClientActionId",
                table: "CommandReceipts",
                columns: new[] { "UserId", "ClientActionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FocusSessions_TaskId",
                table: "FocusSessions",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_FocusSessions_UserId",
                table: "FocusSessions",
                column: "UserId",
                unique: true,
                filter: "\"EndedAtUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_FocusSessions_UserId_StartedAtUtc",
                table: "FocusSessions",
                columns: new[] { "UserId", "StartedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_RewardClaims_RewardId",
                table: "RewardClaims",
                column: "RewardId");

            migrationBuilder.CreateIndex(
                name: "IX_RewardClaims_UserId_ClaimedAtUtc",
                table: "RewardClaims",
                columns: new[] { "UserId", "ClaimedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_RewardClaims_UserId_RewardId",
                table: "RewardClaims",
                columns: new[] { "UserId", "RewardId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rewards_UserId_RequiredLevel",
                table: "Rewards",
                columns: new[] { "UserId", "RequiredLevel" });

            migrationBuilder.CreateIndex(
                name: "IX_XpEntries_LifeAreaId",
                table: "XpEntries",
                column: "LifeAreaId");

            migrationBuilder.CreateIndex(
                name: "IX_XpEntries_RelatedEntryId",
                table: "XpEntries",
                column: "RelatedEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_XpEntries_UserId_Kind_SourceKind_SourceId",
                table: "XpEntries",
                columns: new[] { "UserId", "Kind", "SourceKind", "SourceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_XpEntries_UserId_LocalDate_Category",
                table: "XpEntries",
                columns: new[] { "UserId", "LocalDate", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_XpEntries_UserId_OccurredAtUtc",
                table: "XpEntries",
                columns: new[] { "UserId", "OccurredAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivityEvents");

            migrationBuilder.DropTable(
                name: "CommandReceipts");

            migrationBuilder.DropTable(
                name: "FocusSessions");

            migrationBuilder.DropTable(
                name: "RewardClaims");

            migrationBuilder.DropTable(
                name: "XpEntries");

            migrationBuilder.DropTable(
                name: "Rewards");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Habit_Xp",
                table: "Habits");

            migrationBuilder.DropColumn(
                name: "AwardedXp",
                table: "TaskCompletions");

            migrationBuilder.DropColumn(
                name: "XpPerLog",
                table: "Habits");
        }
    }
}
