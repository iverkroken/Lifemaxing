using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Xunit;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class PreferenceMigrationTests(TestDatabaseFixture database)
{
    [Fact]
    public async Task AdditivePreferencesBackfillLanguageWithoutChangingExistingUserData()
    {
        var name = "lifemaxing_preferences_" + Guid.NewGuid().ToString("N");
        var connection = new NpgsqlConnectionStringBuilder(database.ConnectionString!) { Database = name };
        var adminConnection = new NpgsqlConnectionStringBuilder(database.ConnectionString!) { Database = "postgres" };
        await using var admin = new NpgsqlConnection(adminConnection.ConnectionString);
        await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        try
        {
            var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connection.ConnectionString).Options;
            await using var db = new AppDbContext(options);
            await db.GetService<IMigrator>().MigrateAsync("20260913133032_ProgressionAndFocus");
            var cases = new[] { ("nb-NO", "nb"), ("sv-SE", "sv"), ("da-DK", "da"), ("en-US", "en"), ("hu-HU", "en") };
            var ids = new List<Guid>();
            foreach (var (locale, _) in cases)
            {
                var id = Guid.NewGuid(); ids.Add(id);
                await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"AspNetUsers\" (\"Id\", \"EmailConfirmed\", \"PhoneNumberConfirmed\", \"TwoFactorEnabled\", \"LockoutEnabled\", \"AccessFailedCount\") VALUES ({id}, false, false, false, true, 0)");
                await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"UserSettings\" (\"UserId\", \"Locale\", \"TimeZoneId\", \"CreatedAtUtc\") VALUES ({id}, {locale}, 'Europe/Oslo', {DateTimeOffset.UtcNow})");
            }
            var taskId = Guid.NewGuid();
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"Tasks\" (\"Id\", \"UserId\", \"Title\", \"Tier\", \"Priority\", \"CreatedAtUtc\", \"UpdatedAtUtc\") VALUES ({taskId}, {ids[0]}, 'Fictional historical action', 'Small', 'Normal', {DateTimeOffset.UtcNow}, {DateTimeOffset.UtcNow})");
            var habitId = Guid.NewGuid();
            var focusId = Guid.NewGuid();
            var xpId = Guid.NewGuid();
            var receiptId = Guid.NewGuid();
            var now = DateTimeOffset.UtcNow;
            const string legacyReceipt = "{\"progression\":{\"progress\":{\"rank\":\"Bronze\",\"level\":1}}}";
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"Habits\" (\"Id\", \"UserId\", \"Title\", \"IsActive\", \"CreatedAtUtc\", \"XpPerLog\") VALUES ({habitId}, {ids[0]}, 'Legacy routine', true, {now}, 0)");
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"FocusSessions\" (\"Id\", \"UserId\", \"TaskId\", \"StartedAtUtc\", \"RunningSinceUtc\", \"AccumulatedSeconds\", \"Status\") VALUES ({focusId}, {ids[0]}, {taskId}, {now}, {now}, 30, 'Running')");
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"XpEntries\" (\"Id\", \"UserId\", \"AmountSigned\", \"Kind\", \"SourceKind\", \"SourceId\", \"OccurredAtUtc\", \"LocalDate\", \"TimeZoneId\", \"Category\", \"RuleVersion\") VALUES ({xpId}, {ids[0]}, 0, 'Award', 'HabitLog', {Guid.NewGuid()}, {now}, {DateOnly.FromDateTime(now.UtcDateTime)}, 'Europe/Oslo', 'Habit', 1)");
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"CommandReceipts\" (\"Id\", \"UserId\", \"ClientActionId\", \"Operation\", \"RequestHash\", \"CreatedAtUtc\", \"ResponseJson\", \"StatusCode\") VALUES ({receiptId}, {ids[0]}, {Guid.NewGuid()}, 'POST /historical', 'fixture', {now}, CAST({legacyReceipt} AS jsonb), 200)");
            await db.GetService<IMigrator>().MigrateAsync("20260922180819_FocusTimeHub");
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"FocusPreferences\" (\"UserId\", \"Custom_Method\", \"Custom_FocusMinutes\", \"Custom_BreakMinutes\", \"Custom_LongBreakMinutes\", \"Custom_SessionsBeforeLongBreak\", \"Custom_SmartMinutes\", \"SoundEnabled\", \"Sound\", \"Volume\", \"FocusSound\", \"BreakSound\", \"Notifications\", \"AutoBreak\", \"AutoFocus\", \"KeepAwake\") VALUES ({ids[0]}, 'Custom', 42, 7, 20, 4, 120, true, 'Bell', 17, true, false, false, false, false, false)");
            var cityId = Guid.NewGuid();
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"WorldClockCities\" (\"Id\", \"UserId\", \"Name\", \"TimeZoneId\", \"Position\") VALUES ({cityId}, {ids[0]}, 'Tokyo', 'Asia/Tokyo', 0)");
            await db.Database.MigrateAsync();
            var focusPreferences = await db.Set<Lifemaxing.Api.Features.Focus.FocusPreferences>().SingleAsync();
            Assert.Equal(120, focusPreferences.DailyGoalMinutes);
            Assert.False(focusPreferences.WorldClockInitialized);
            Assert.Equal("Bell", focusPreferences.Sound);
            Assert.Equal(17, focusPreferences.Volume);
            Assert.Equal(42, focusPreferences.Custom.FocusMinutes);
            Assert.Equal(cityId, (await db.Set<Lifemaxing.Api.Features.Focus.WorldClockCity>().SingleAsync()).Id);
            for (var index = 0; index < cases.Length; index++)
            {
                var saved = await db.UserSettings.AsNoTracking().SingleAsync(row => row.UserId == ids[index]);
                Assert.Equal(cases[index].Item1, saved.Locale);
                Assert.Equal(cases[index].Item2, saved.UiLanguage);
                Assert.Equal("Europe/Oslo", saved.TimeZoneId);
                Assert.Equal("system", saved.Theme);
                Assert.Equal("normal", saved.Density);
                Assert.Equal("FocusedDay", saved.PlanningMode);
            }
            Assert.Equal("Fictional historical action", (await db.Tasks.SingleAsync()).Title);
            Assert.Equal(10, (await db.Habits.SingleAsync()).XpPerLog);
            var focus = await db.FocusSessions.SingleAsync();
            Assert.Equal(taskId, focus.TaskId);
            Assert.Null(focus.GoalId);
            Assert.Null(focus.HabitId);
            Assert.Equal(30, focus.AccumulatedSeconds);
            Assert.Equal("Running", focus.Status);
            Assert.Equal(0, (await db.XpEntries.SingleAsync()).AmountSigned);
            Assert.Contains("Bronze", (await db.CommandReceipts.SingleAsync()).ResponseJson);
            Assert.Empty(await db.DailyGoalSelections.ToListAsync());
            Assert.Empty(await db.Set<Lifemaxing.Api.Features.Finance.Subscription>().ToListAsync());
            Assert.False(db.Database.HasPendingModelChanges());
        }
        finally
        {
            // This name is generated locally and never derived from the private database name.
            await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }
}
