using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Progression;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Xunit;

namespace Lifemaxing.Api.Tests;

public sealed class ProgressionRuleTests
{
    [Fact]
    public void LevelsAndRanksUseExactBoundariesIncludingVeryLargeBalances()
    {
        Assert.Equal(1, ProgressionRules.Calculate(-100).Level);
        Assert.Equal(0, ProgressionRules.Calculate(-100).XpIntoLevel);
        Assert.Equal(1, ProgressionRules.Calculate(499).Level);
        Assert.Equal(2, ProgressionRules.Calculate(500).Level);
        Assert.Equal(600, ProgressionRules.Calculate(500).XpForNextLevel);
        foreach (var level in new[] { 2, 9, 10, 19, 20, 29, 30, 39, 40, 49, 50, 51, 100000 })
        {
            var boundary = (long)ProgressionRules.Threshold(level);
            Assert.Equal(level - 1, ProgressionRules.Calculate(boundary - 1).Level);
            Assert.Equal(level, ProgressionRules.Calculate(boundary).Level);
            Assert.Equal(0, ProgressionRules.Calculate(boundary).XpIntoLevel);
        }
        Assert.Equal(new[] { "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Apex", "Apex" },
            new[] { 9, 10, 20, 30, 40, 50, 100 }.Select(ProgressionRules.Rank));
        Assert.InRange(ProgressionRules.Calculate(long.MaxValue).Percentage, 0, 100);
        Assert.Equal(new[] { 10, 25, 50, 100, 200 }, new[] { "Tiny", "Small", "Medium", "Large", "Epic" }.Select(ProgressionRules.TaskXp));
    }
}

[Collection(DatabaseCollection.Name)]
public sealed class Phase3Tests(TestDatabaseFixture database)
{
    [Fact]
    public async Task GoalHistoryCreatesActivityWithoutXpAndSupportsIdentifiedRetries()
    {
        await using var app = database.CreateApplication(); var owner = await database.CreateOwnerAsync(app, "goal-activity");
        using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        var id = (await Send(client, "/goals", new { title = "Direction" }, 201)).GetProperty("id").GetGuid();
        var key = Guid.NewGuid();
        await Send(client, $"/goals/{id}/progress", new { note = "A meaningful step" }, 201, key);
        await Send(client, $"/goals/{id}/progress", new { note = "A meaningful step" }, 201, key);
        for (var i = 0; i < 2; i++) (await client.PatchAsJsonAsync($"/api/v1/goals/{id}", new { state = "Completed" })).EnsureSuccessStatusCode();
        Assert.Equal(1, (await Get(client, $"/goals/{id}/progress")).GetProperty("total").GetInt32());
        Assert.Equal(2, (await Get(client, "/activity")).GetProperty("total").GetInt32());
        Assert.Equal(0, (await Get(client, "/progress/ledger")).GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task Phase2DatabaseUpgradePreservesExistingCompletionWithoutInventingXp()
    {
        var name = "lifemaxing_upgrade_" + Guid.NewGuid().ToString("N");
        var connection = new NpgsqlConnectionStringBuilder(database.ConnectionString!) { Database = name };
        var adminConnection = new NpgsqlConnectionStringBuilder(database.ConnectionString!) { Database = "postgres" };
        await using var admin = new NpgsqlConnection(adminConnection.ConnectionString); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        try
        {
            await using var app = database.CreateApplication().WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, c) =>
                c.AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:Database"] = connection.ConnectionString })));
            await using (var scope = app.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await db.GetService<IMigrator>().MigrateAsync("20260912202529_CoreProductivity");
            }
            // Seed the historical schema explicitly: the current settings model has
            // additive columns which did not exist in Phase 2.
            var owner = (UserId: Guid.NewGuid(), Email: $"legacy-{Guid.NewGuid():N}@example.test", Password: "Legacy-Test!Password-739");
            await using (var scope = app.Services.CreateAsyncScope())
            {
                var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                var result = await users.CreateAsync(new AppUser { Id = owner.UserId, Email = owner.Email, UserName = owner.Email, EmailConfirmed = true }, owner.Password);
                Assert.True(result.Succeeded);
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"UserSettings\" (\"UserId\", \"TimeZoneId\", \"Locale\", \"CreatedAtUtc\") VALUES ({owner.UserId}, 'Europe/Oslo', 'nb-NO', {DateTimeOffset.UtcNow})");
            }
            var taskId = Guid.NewGuid(); var completionId = Guid.NewGuid(); var now = DateTimeOffset.UtcNow;
            await using (var scope = app.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"Tasks\" (\"Id\", \"UserId\", \"Title\", \"Tier\", \"Priority\", \"CreatedAtUtc\", \"UpdatedAtUtc\") VALUES ({taskId}, {owner.UserId}, 'Legacy work', 'Small', 'Normal', {now}, {now})");
                await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"TaskCompletions\" (\"Id\", \"UserId\", \"TaskId\", \"CompletedAtUtc\") VALUES ({completionId}, {owner.UserId}, {taskId}, {now})");
                await db.Database.MigrateAsync();
                Assert.Equal(0, (await db.TaskCompletions.SingleAsync()).AwardedXp);
                Assert.Empty(await db.XpEntries.ToListAsync());
            }
            using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
            Assert.Equal(0, (await Send(client, $"/tasks/{taskId}/reopen", new { })).GetProperty("progression").GetProperty("xpChange").GetInt32());
            Assert.Equal(25, (await Send(client, $"/tasks/{taskId}/complete", new { })).GetProperty("progression").GetProperty("xpChange").GetInt32());
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync();
        }
    }

    [Fact]
    public async Task HabitReversalIsExactAfterConfigurationChangesAndHistoryCannotBeEdited()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "habit-reversal"); using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        var habit = (await Send(client, "/habits", new { title = "A repeatable action", xpPerLog = 20 }, 201)).GetProperty("id").GetGuid();
        var date = (await Get(client, "/today")).GetProperty("localDate").GetString();
        var log = (await Send(client, $"/habits/{habit}/logs", new { localDate = date }, 201)).GetProperty("id").GetGuid();
        var patch = await client.PatchAsJsonAsync($"/api/v1/habits/{habit}", new { xpPerLog = 5 }); patch.EnsureSuccessStatusCode();
        var key = Guid.NewGuid();
        var reversed = await Send(client, $"/habits/{habit}/logs/{log}/revoke", new { }, key: key);
        Assert.Equal(-20, reversed.GetProperty("progression").GetProperty("xpChange").GetInt32());
        await Send(client, $"/habits/{habit}/logs", new { localDate = date }, 201);
        await Send(client, $"/habits/{habit}/logs/{log}/revoke", new { }, key: key);
        Assert.Equal(5, (await Get(client, "/progress")).GetProperty("progress").GetProperty("totalXp").GetInt32());
        await using var scope = app.Services.CreateAsyncScope(); var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var entries = await db.XpEntries.Where(x => x.UserId == owner.UserId).ToListAsync();
        Assert.Equal(3, entries.Count);
        var reversal = Assert.Single(entries, x => x.Kind == "Reversal");
        Assert.Equal(20, entries.Single(x => x.Id == reversal.RelatedEntryId).AmountSigned);
        entries[0].AmountSigned = 1000;
        await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task CompletionReplayConcurrencyReversalAndNewCyclePreserveLedger()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "xp-cycles");
        using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        var id = (await Send(client, "/tasks", new { title = "Meaningful work", tier = "Large" }, 201)).GetProperty("id").GetGuid();
        var action = Guid.NewGuid();
        var first = await Send(client, $"/tasks/{id}/complete", new { }, key: action);
        Assert.Equal(100, first.GetProperty("progression").GetProperty("xpChange").GetInt32());
        await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => Send(client, $"/tasks/{id}/complete", new { })));
        await Send(client, $"/tasks/{id}/reopen", new { });
        var replay = await Send(client, $"/tasks/{id}/complete", new { }, key: action);
        Assert.True(replay.GetProperty("isCompleted").GetBoolean()); // Original response, not today's state.
        Assert.False((await Get(client, $"/tasks/{id}")).GetProperty("isCompleted").GetBoolean());
        await Send(client, $"/tasks/{id}/reopen", new { }, 409, action);
        await Send(client, $"/tasks/{id}/complete", new { changed = true }, 409, action);
        await Send(client, $"/tasks/{id}/complete", new { });
        var ledger = (await Get(client, "/progress/ledger")).GetProperty("items").EnumerateArray().ToArray();
        Assert.Equal(3, ledger.Length); Assert.Equal(100, ledger.Sum(x => x.GetProperty("amountSigned").GetInt32()));
        Assert.Single(ledger, x => x.GetProperty("kind").GetString() == "Reversal");
        Assert.Equal(3, (await Get(client, "/activity")).GetProperty("total").GetInt32());
        await using var scope = app.Services.CreateAsyncScope(); var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(2, await db.TaskCompletions.CountAsync(x => x.UserId == owner.UserId));
        Assert.Single(await db.TaskCompletions.Where(x => x.UserId == owner.UserId && x.ReversedAtUtc == null).ToListAsync());
        Assert.False(db.Database.HasPendingModelChanges());
    }

    [Fact]
    public async Task CapsAreAtomicAndReversalsRestoreOriginalCalendarBucket()
    {
        var clock = new DomainClock();
        await using var app = database.CreateApplication().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddSingleton<TimeProvider>(clock);
            s.PostConfigure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme, o => o.TimeProvider = TimeProvider.System);
            s.PostConfigure<SecurityStampValidatorOptions>(o => o.TimeProvider = TimeProvider.System);
        }));
        var owner = await database.CreateOwnerAsync(app, "xp-cap"); using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        var ids = new List<Guid>();
        foreach (var tier in new[] { "Tiny", "Small", "Small", "Medium", "Large", "Epic" })
            ids.Add((await Send(client, "/tasks", new { title = tier, tier }, 201)).GetProperty("id").GetGuid());
        foreach (var id in ids) await Send(client, $"/tasks/{id}/complete", new { });
        Assert.Equal(400, (await Get(client, "/progress")).GetProperty("progress").GetProperty("totalXp").GetInt32());
        var date = (await Get(client, "/today")).GetProperty("localDate").GetString();
        for (var i = 0; i < 4; i++)
        {
            var habit = (await Send(client, "/habits", new { title = "Routine", xpPerLog = 25 }, 201)).GetProperty("id").GetGuid();
            var key = Guid.NewGuid();
            var log = await Send(client, $"/habits/{habit}/logs", new { localDate = date }, 201, key);
            await Send(client, $"/habits/{habit}/logs", new { localDate = date }, 201, key);
            await Send(client, $"/habits/{habit}/logs", new { localDate = date }, 409);
            Assert.Equal(i < 3 ? 25 : 0, log.GetProperty("progression").GetProperty("xpChange").GetInt32());
        }
        clock.Now = clock.Now.AddDays(1);
        await Send(client, $"/tasks/{ids[0]}/reopen", new { });
        await Send(client, $"/tasks/{ids[0]}/complete", new { });
        Assert.Equal(475, (await Get(client, "/progress")).GetProperty("progress").GetProperty("totalXp").GetInt32());
        var entries = (await Get(client, "/progress/ledger")).GetProperty("items").EnumerateArray().ToArray();
        Assert.Equal(date, entries.Single(x => x.GetProperty("kind").GetString() == "Reversal").GetProperty("localDate").GetString());
    }

    [Fact]
    public async Task RewardsUnlockOnceAndRemainClaimedAfterXpCorrection()
    {
        await using var app = database.CreateApplication(); var owner = await database.CreateOwnerAsync(app, "rewards");
        using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        var reward = (await Send(client, "/rewards", new { title = "An intentional break", requiredLevel = 2 }, 201)).GetProperty("id").GetGuid();
        await Send(client, $"/rewards/{reward}/claim", new { }, 409);
        Guid task = default;
        foreach (var tier in new[] { "Epic", "Epic", "Large" })
        {
            task = (await Send(client, "/tasks", new { title = "Work", tier }, 201)).GetProperty("id").GetGuid();
            await Send(client, $"/tasks/{task}/complete", new { });
        }
        var key = Guid.NewGuid(); await Send(client, $"/rewards/{reward}/claim", new { }, key: key);
        await Send(client, $"/rewards/{reward}/claim", new { }, key: key);
        await Send(client, $"/rewards/{reward}/claim", new { }, 409);
        await Send(client, $"/tasks/{task}/reopen", new { });
        Assert.NotEqual(JsonValueKind.Null, (await Get(client, $"/rewards/{reward}")).GetProperty("claimedAtUtc").ValueKind);
        var events = (await Get(client, "/activity")).GetProperty("items").EnumerateArray().ToArray();
        Assert.Single(events, x => x.GetProperty("kind").GetString() == "LevelReached");
        Assert.Single(events, x => x.GetProperty("kind").GetString() == "RewardClaimed");
        await Send(client, "/rewards", new { title = "", requiredLevel = 0 }, 400);
    }

    [Fact]
    public async Task FocusSurvivesNewApplicationPauseExcludesTimeAndCompletionIsAtomic()
    {
        var clock = new DomainClock();
        await using var app = database.CreateApplication().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddSingleton<TimeProvider>(clock);
            s.PostConfigure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme, o => o.TimeProvider = TimeProvider.System);
            s.PostConfigure<SecurityStampValidatorOptions>(o => o.TimeProvider = TimeProvider.System);
        }));
        var owner = await database.CreateOwnerAsync(app, "focus"); using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        var task = (await Send(client, "/tasks", new { title = "One thing", tier = "Medium" }, 201)).GetProperty("id").GetGuid();
        var key = Guid.NewGuid();
        var session = (await Send(client, "/focus-sessions", new { taskId = task }, 201, key)).GetProperty("id").GetGuid();
        await Send(client, "/focus-sessions", new { taskId = task }, 201, key);
        await Send(client, "/focus-sessions", new { taskId = task }, 409);
        clock.Now = clock.Now.AddSeconds(60); await Send(client, $"/focus-sessions/{session}/pause", new { });
        clock.Now = clock.Now.AddHours(1);
        Assert.Equal(60, (await Get(client, "/focus-sessions/active")).GetProperty("session").GetProperty("elapsedSeconds").GetInt64());
        await using (var restarted = database.CreateApplication())
        {
            using var other = restarted.CreateClient(); await Login(other, owner.Email, owner.Password);
            Assert.Equal(session, (await Get(other, "/focus-sessions/active")).GetProperty("session").GetProperty("id").GetGuid());
        }
        await Send(client, $"/focus-sessions/{session}/resume", new { }); clock.Now = clock.Now.AddSeconds(30);
        key = Guid.NewGuid();
        var ended = await Send(client, $"/focus-sessions/{session}/stop", new { outcome = "Completed", completeTask = true }, key: key);
        Assert.Equal(90, ended.GetProperty("elapsedSeconds").GetInt64());
        Assert.Equal(50, ended.GetProperty("progression").GetProperty("xpChange").GetInt32());
        await Send(client, $"/focus-sessions/{session}/stop", new { outcome = "Completed", completeTask = true }, key: key);
        Assert.Equal(JsonValueKind.Null, (await Get(client, "/focus-sessions/active")).GetProperty("session").ValueKind);
        Assert.Equal(90, (await Get(client, "/progress")).GetProperty("focusSeconds").GetInt64());
        var next = (await Send(client, "/focus-sessions", new { taskId = (Guid?)null }, 201)).GetProperty("id").GetGuid();
        await Send(client, $"/focus-sessions/{next}/stop", new { outcome = "Cancelled" });
    }

    [Fact]
    public async Task NewResourcesArePrivateAndCommandsRequireCsrfAndActionIdentity()
    {
        await using var app = database.CreateApplication(); var owner = await database.CreateOwnerAsync(app, "private-progression");
        using var client = app.CreateClient();
        foreach (var path in new[] { "/progress", "/activity", "/rewards", "/focus-sessions", "/progress/ledger" }) Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1" + path)).StatusCode);
        await Login(client, owner.Email, owner.Password);
        var reward = (await Send(client, "/rewards", new { title = "Mine" }, 201)).GetProperty("id").GetGuid();
        var focus = (await Send(client, "/focus-sessions", new { taskId = (Guid?)null }, 201)).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync($"/api/v1/rewards/{reward}/claim", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync($"/api/v1/REWARDS/{reward}/CLAIM/", new { })).StatusCode);
        var other = await database.CreateOwnerAsync(app, "other-progression"); using var second = app.CreateClient(); await Login(second, other.Email, other.Password);
        Assert.Equal(HttpStatusCode.NotFound, (await second.GetAsync($"/api/v1/rewards/{reward}")).StatusCode);
        await SendRequest(second, HttpMethod.Patch, $"/rewards/{reward}", new { title = "Not mine" }, 404);
        await SendRequest(second, HttpMethod.Delete, $"/rewards/{reward}", null, 404);
        await Send(second, $"/rewards/{reward}/claim", new { }, 404);
        var unchangedReward = await Get(client, $"/rewards/{reward}");
        Assert.Equal("Mine", unchangedReward.GetProperty("title").GetString());
        Assert.Equal(JsonValueKind.Null, unchangedReward.GetProperty("archivedAtUtc").ValueKind);
        Assert.Equal(JsonValueKind.Null, unchangedReward.GetProperty("claimedAtUtc").ValueKind);
        await Send(second, $"/focus-sessions/{focus}/pause", new { }, 404);
        Assert.Equal("Running", (await Get(client, "/focus-sessions/active")).GetProperty("session").GetProperty("status").GetString());
        await Send(client, $"/focus-sessions/{focus}/pause", new { });
        await Send(second, $"/focus-sessions/{focus}/resume", new { }, 404);
        Assert.Equal("Paused", (await Get(client, "/focus-sessions/active")).GetProperty("session").GetProperty("status").GetString());
        await Send(client, $"/focus-sessions/{focus}/resume", new { });
        await Send(second, $"/focus-sessions/{focus}/stop", new { outcome = "Cancelled" }, 404);
        var unchangedFocus = (await Get(client, "/focus-sessions/active")).GetProperty("session");
        Assert.Equal(focus, unchangedFocus.GetProperty("id").GetGuid());
        Assert.Equal("Running", unchangedFocus.GetProperty("status").GetString());
        Assert.Equal(0, (await Get(second, "/activity")).GetProperty("total").GetInt32());
        Assert.Equal(0, (await Get(second, "/progress/ledger")).GetProperty("total").GetInt32());
        Assert.Equal(0, (await Get(second, "/rewards")).GetProperty("total").GetInt32());
        Assert.Equal(JsonValueKind.Null, (await Get(second, "/focus-sessions/active")).GetProperty("session").ValueKind);

        var sharedActionId = Guid.NewGuid();
        await Send(client, $"/rewards/{reward}/claim", new { }, key: sharedActionId);
        var otherReward = (await Send(second, "/rewards", new { title = "Theirs" }, 201)).GetProperty("id").GetGuid();
        await Send(second, $"/rewards/{otherReward}/claim", new { }, key: sharedActionId);
        Assert.Equal(reward, (await Send(client, $"/rewards/{reward}/claim", new { }, key: sharedActionId)).GetProperty("id").GetGuid());
        Assert.Equal(otherReward, (await Send(second, $"/rewards/{otherReward}/claim", new { }, key: sharedActionId)).GetProperty("id").GetGuid());
        Assert.Equal(1, (await Get(client, "/activity?kind=RewardClaimed")).GetProperty("total").GetInt32());
        Assert.Equal(1, (await Get(second, "/activity?kind=RewardClaimed")).GetProperty("total").GetInt32());
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var receipts = await db.CommandReceipts.Where(x => x.ClientActionId == sharedActionId).ToListAsync();
            Assert.Equal(2, receipts.Count);
            Assert.Contains(receipts, x => x.UserId == owner.UserId);
            Assert.Contains(receipts, x => x.UserId == other.UserId);
        }
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN"); await Send(client, $"/rewards/{reward}/claim", new { }, 400);
    }

    private static async Task Login(HttpClient client, string email, string password)
    {
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", (await Get(client, "/auth/csrf")).GetProperty("requestToken").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password })).StatusCode);
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", (await Get(client, "/auth/csrf")).GetProperty("requestToken").GetString());
    }
    private static async Task<JsonElement> Get(HttpClient client, string path)
    {
        var response = await client.GetAsync("/api/v1" + path); response.EnsureSuccessStatusCode(); return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
    private static async Task<JsonElement> Send(HttpClient client, string path, object body, int expected = 200, Guid? key = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1" + path) { Content = JsonContent.Create(body) };
        request.Headers.Add("ClientActionId", (key ?? Guid.NewGuid()).ToString());
        using var response = await client.SendAsync(request);
        Assert.True((int)response.StatusCode == expected, $"{path}: {response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
    private static async Task SendRequest(HttpClient client, HttpMethod method, string path, object? body, int expected)
    {
        using var request = new HttpRequestMessage(method, "/api/v1" + path)
        {
            Content = body is null ? null : JsonContent.Create(body)
        };
        using var response = await client.SendAsync(request);
        Assert.True((int)response.StatusCode == expected, $"{method} {path}: {response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
    }
    private sealed class DomainClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = DateTimeOffset.Parse("2026-09-13T12:00:00Z");
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
