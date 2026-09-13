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
            await db.Database.MigrateAsync();
            for (var index = 0; index < cases.Length; index++)
            {
                var saved = await db.UserSettings.AsNoTracking().SingleAsync(row => row.UserId == ids[index]);
                Assert.Equal(cases[index].Item1, saved.Locale);
                Assert.Equal(cases[index].Item2, saved.UiLanguage);
                Assert.Equal("Europe/Oslo", saved.TimeZoneId);
                Assert.Equal("system", saved.Theme);
                Assert.Equal("normal", saved.Density);
            }
            Assert.Equal("Fictional historical action", (await db.Tasks.SingleAsync()).Title);
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
