using System.Net.Http.Json;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Focus;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.Cookies;
using Xunit;
using static Lifemaxing.Api.Tests.DailyWorkspaceTests;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class FocusHubTests(TestDatabaseFixture database)
{
    [Fact]
    public async Task StreakContinuesAcrossHistoryWindowsAndExcludesOtherOwners()
    {
        var clock = new FocusClock();
        await using var app = database.CreateApplication().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddSingleton<TimeProvider>(clock);
            s.PostConfigure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme, o => o.TimeProvider = TimeProvider.System);
            s.PostConfigure<SecurityStampValidatorOptions>(o => o.TimeProvider = TimeProvider.System);
        }));
        var owner = await database.CreateOwnerAsync(app, "focus-long-streak");
        var other = await database.CreateOwnerAsync(app, "focus-other-streak");
        using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            for (var i = 1; i <= 41; i++)
                db.FocusSessions.Add(new() { Id = Guid.NewGuid(), UserId = i == 41 ? other.UserId : owner.UserId, StartedAtUtc = clock.Now.AddDays(-i), EndedAtUtc = clock.Now.AddDays(-i).AddMinutes(1), AccumulatedSeconds = 60, Status = "Completed" });
            await db.SaveChangesAsync();
        }
        var summary = await Get(client, "/focus-summary");
        Assert.Equal(40, summary.GetProperty("streakDays").GetInt32());
        Assert.Equal(60, summary.GetProperty("yesterdaySeconds").GetInt64());
        Assert.Equal(0, summary.GetProperty("todaySeconds").GetInt64());
    }

    [Theory]
    [InlineData("2026-03-30T12:00:00Z", "2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z", 82800)]
    [InlineData("2026-10-26T12:00:00Z", "2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z", 90000)]
    public async Task SummarySplitsConfirmedSpansAtLocalDaysAndKeepsStreakThroughToday(string now, string yesterdayStart, string todayStart, long yesterdaySeconds)
    {
        var clock = new FocusClock { Now = DateTimeOffset.Parse(now) };
        await using var app = database.CreateApplication().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddSingleton<TimeProvider>(clock);
            s.PostConfigure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme, o => o.TimeProvider = TimeProvider.System);
            s.PostConfigure<SecurityStampValidatorOptions>(o => o.TimeProvider = TimeProvider.System);
        }));
        var owner = await database.CreateOwnerAsync(app, "focus-summary-days");
        using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        var controllerId = Guid.NewGuid();
        var runId = (await Send(client, HttpMethod.Post, "/focus-runs", new { controllerId }, 201)).GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Post, $"/focus-runs/{runId}/action", new { action = "stop", controllerId, revision = 0 });
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var session = await db.FocusSessions.SingleAsync(x => x.FocusRunId == runId);
            var start = DateTimeOffset.Parse(yesterdayStart); var end = DateTimeOffset.Parse(todayStart).AddSeconds(30);
            session.StartedAtUtc = start; session.EndedAtUtc = end; session.AccumulatedSeconds = yesterdaySeconds + 30; session.Status = "Completed";
            db.Add(new FocusWorkSpan { Id = Guid.NewGuid(), UserId = session.UserId, FocusSessionId = session.Id, StartedAtUtc = start, EndedAtUtc = end });
            // A preceding legacy day counts; a cancelled interval does not fill a missing day.
            db.FocusSessions.Add(new() { Id = Guid.NewGuid(), UserId = session.UserId, StartedAtUtc = start.AddHours(-12), EndedAtUtc = start.AddHours(-11), AccumulatedSeconds = 60, Status = "Completed" });
            db.FocusSessions.Add(new() { Id = Guid.NewGuid(), UserId = session.UserId, StartedAtUtc = start.AddHours(-36), EndedAtUtc = start.AddHours(-35), AccumulatedSeconds = 3600, Status = "Cancelled" });
            await db.SaveChangesAsync();
        }
        var summary = await Get(client, "/focus-summary");
        Assert.Equal(yesterdaySeconds, summary.GetProperty("yesterdaySeconds").GetInt64());
        Assert.Equal(30, summary.GetProperty("todaySeconds").GetInt64());
        Assert.Equal(2, summary.GetProperty("streakDays").GetInt32());
        // Two short confirmed intervals together qualify today.
        var next = (await Send(client, HttpMethod.Post, "/focus-runs", new { controllerId }, 201)).GetProperty("id").GetGuid();
        clock.Now = clock.Now.AddSeconds(30);
        await Send(client, HttpMethod.Post, $"/focus-runs/{next}/action", new { action = "stop", controllerId, revision = 0 });
        Assert.Equal(3, (await Get(client, "/focus-summary")).GetProperty("streakDays").GetInt32());
        clock.Now = clock.Now.AddDays(2);
        Assert.Equal(0, (await Get(client, "/focus-summary")).GetProperty("streakDays").GetInt32());
    }

    [Fact]
    public async Task WorldClockDefaultsInitializeOnceWithoutReplacingSavedChoices()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "clock-defaults");
        using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        Assert.Empty((await Get(client, "/world-clock")).EnumerateArray());
        await Task.WhenAll(Enumerable.Range(0, 2).Select(_ => Send(client, HttpMethod.Post, "/world-clock/initialize", new { })));
        var cities = (await Get(client, "/world-clock")).EnumerateArray().ToArray();
        Assert.Equal(new[] { "London", "New York", "Tokyo", "Sydney" }, cities.Select(x => x.GetProperty("name").GetString()));
        foreach (var city in cities) await Send(client, HttpMethod.Delete, "/world-clock/" + city.GetProperty("id").GetGuid(), new { }, 204);
        await Send(client, HttpMethod.Post, "/world-clock/initialize", new { });
        Assert.Empty((await Get(client, "/world-clock")).EnumerateArray());
        var other = await database.CreateOwnerAsync(app, "clock-existing");
        using var second = app.CreateClient(); await Login(second, other.Email, other.Password);
        await Send(second, HttpMethod.Post, "/world-clock", new { name = "Oslo", timeZoneId = "Europe/Oslo" }, 201);
        await Send(second, HttpMethod.Post, "/world-clock/initialize", new { });
        Assert.Single((await Get(second, "/world-clock")).EnumerateArray());
    }

    [Fact]
    public async Task DailyGoalPersistsIndependentlyOfSoundSettingsAndOtherOwners()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "daily-focus-goal");
        using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        Assert.Equal(120, (await Get(client, "/focus-preferences")).GetProperty("dailyGoalMinutes").GetInt32());
        await Send(client, HttpMethod.Put, "/focus-preferences", new { volume = 17, sound = "Bell" });
        await Send(client, HttpMethod.Put, "/focus-preferences/daily-goal", new { dailyGoalMinutes = 420 });
        var prefs = await Get(client, "/focus-preferences");
        Assert.Equal(420, prefs.GetProperty("dailyGoalMinutes").GetInt32());
        Assert.Equal(17, prefs.GetProperty("volume").GetInt32());
        await Send(client, HttpMethod.Put, "/focus-preferences", new { volume = 30 });
        Assert.Equal(420, (await Get(client, "/focus-preferences")).GetProperty("dailyGoalMinutes").GetInt32());
        foreach (var invalid in new[] { 0, 14, 16, 1441 })
            await Send(client, HttpMethod.Put, "/focus-preferences/daily-goal", new { dailyGoalMinutes = invalid }, 400);
        var other = await database.CreateOwnerAsync(app, "daily-focus-other");
        using var second = app.CreateClient(); await Login(second, other.Email, other.Password);
        Assert.Equal(120, (await Get(second, "/focus-preferences")).GetProperty("dailyGoalMinutes").GetInt32());
    }

    [Fact]
    public async Task NextReferenceDoesNotChangeTheDisplayedCompletionTarget()
    {
        await using var app = database.CreateApplication(); var owner = await database.CreateOwnerAsync(app, "focus-next");
        using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        var first = (await Send(client, HttpMethod.Post, "/tasks", new { title = "First interval" }, 201)).GetProperty("id").GetGuid();
        var next = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Next interval" }, 201)).GetProperty("id").GetGuid();
        var controllerId = Guid.NewGuid();
        var id = (await Send(client, HttpMethod.Post, "/focus-runs", new { controllerId, reference = new { taskId = first } }, 201)).GetProperty("id").GetGuid();
        var changed = await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "reference", controllerId, revision = 0, reference = new { taskId = next } });
        Assert.Equal(next, changed.GetProperty("reference").GetProperty("taskId").GetGuid());
        Assert.Equal(first, changed.GetProperty("currentReference").GetProperty("taskId").GetGuid());
        await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "stop", controllerId, revision = 1, completeTask = true });
        Assert.True((await Get(client, $"/tasks/{first}")).GetProperty("isCompleted").GetBoolean());
        Assert.False((await Get(client, $"/tasks/{next}")).GetProperty("isCompleted").GetBoolean());
    }

    [Fact]
    public async Task DeletingTheNextItemDuringABreakEndsTheRun()
    {
        var clock = new FocusClock();
        await using var app = database.CreateApplication().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddSingleton<TimeProvider>(clock);
            s.PostConfigure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme, o => o.TimeProvider = TimeProvider.System);
            s.PostConfigure<SecurityStampValidatorOptions>(o => o.TimeProvider = TimeProvider.System);
        }));
        var owner = await database.CreateOwnerAsync(app, "focus-delete-break"); using var client = app.CreateClient();
        await Login(client, owner.Email, owner.Password);
        var taskId = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Temporary item" }, 201)).GetProperty("id").GetGuid();
        var controllerId = Guid.NewGuid();
        var id = (await Send(client, HttpMethod.Post, "/focus-runs", new { controllerId, configuration = new { method = "Custom", focusMinutes = 1 }, reference = new { taskId } }, 201)).GetProperty("id").GetGuid();
        clock.Now = clock.Now.AddMinutes(1);
        await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "checkpoint", controllerId, revision = 0 });
        await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "next", controllerId, revision = 1 });
        await Send(client, HttpMethod.Delete, $"/tasks/{taskId}", new { }, 204);
        Assert.Equal(System.Text.Json.JsonValueKind.Null, (await Get(client, "/focus-runs/active")).GetProperty("run").ValueKind);
        Assert.Equal(60, (await Get(client, "/progress")).GetProperty("focusSeconds").GetInt64());
    }

    [Fact]
    public async Task ReferencesControllersAndRecoveryCommandsRespectOwnershipAndState()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "focus-reference");
        var other = await database.CreateOwnerAsync(app, "focus-reference-other");
        using var client = app.CreateClient(); using var foreign = app.CreateClient();
        await Login(client, owner.Email, owner.Password); await Login(foreign, other.Email, other.Password);
        foreach (var (path, property) in new[] { ("tasks", "taskId"), ("goals", "goalId"), ("habits", "habitId") })
        {
            var entity = await Send(client, HttpMethod.Post, "/" + path, new { title = "Shared focus fixture" }, 201);
            var reference = new Dictionary<string, Guid> { [property] = entity.GetProperty("id").GetGuid() };
            var controllerId = Guid.NewGuid();
            await Send(foreign, HttpMethod.Post, "/focus-runs", new { controllerId, reference }, 404);
            var started = await Send(client, HttpMethod.Post, "/focus-runs", new { controllerId, reference }, 201);
            var id = started.GetProperty("id").GetGuid();
            Assert.Equal(reference[property], (await Get(client, "/focus-sessions/active")).GetProperty("session").GetProperty(property).GetGuid());
            await Send(foreign, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "stop", controllerId, revision = 0 }, 404);
            await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "pause", controllerId = Guid.NewGuid(), revision = 0 }, 409);
            await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "recover-end", controllerId, revision = 0 }, 409);
            await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "stop", controllerId, revision = 10 }, 409);
            await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "stop", controllerId, revision = 0 });
        }
    }

    [Theory]
    [InlineData("recover-resume", 1200)]
    [InlineData("recover-count", 3000)]
    [InlineData("recover-end", 1200)]
    public async Task RecoveryPreservesOnlyConfirmedWork(string recovery, int expectedSeconds)
    {
        var clock = new FocusClock();
        await using var app = database.CreateApplication().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddSingleton<TimeProvider>(clock);
            s.PostConfigure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme, o => o.TimeProvider = TimeProvider.System);
            s.PostConfigure<SecurityStampValidatorOptions>(o => o.TimeProvider = TimeProvider.System);
        }));
        var owner = await database.CreateOwnerAsync(app, "focus-recovery");
        using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        var controllerId = Guid.NewGuid();
        var task = await Send(client, HttpMethod.Post, "/tasks", new { title = "Fictional research" }, 201);
        var started = await Send(client, HttpMethod.Post, "/focus-runs", new { controllerId, configuration = new { method = "Balanced" }, reference = new { taskId = task.GetProperty("id").GetGuid() } }, 201);
        var id = started.GetProperty("id").GetGuid(); long revision = 0;
        async Task<System.Text.Json.JsonElement> Act(string action) => await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action, controllerId, revision = revision++ });
        for (var i = 0; i < 20; i++) { clock.Now = clock.Now.AddMinutes(1); await Act("checkpoint"); }
        clock.Now = clock.Now.AddMinutes(40);
        var interrupted = await Act("checkpoint");
        Assert.Equal("Interrupted", interrupted.GetProperty("state").GetString());
        Assert.Equal(1800, interrupted.GetProperty("remainingSeconds").GetInt32());
        Assert.Equal(1200, (await Get(client, "/focus-summary")).GetProperty("todaySeconds").GetInt64());
        var restored = await Act(recovery);
        if (recovery == "recover-resume")
        {
            Assert.Equal("Running", restored.GetProperty("state").GetString());
            Assert.Equal(1800, restored.GetProperty("remainingSeconds").GetInt32());
            await Act("stop");
        }
        if (recovery == "recover-count")
        {
            Assert.Equal("Ready", restored.GetProperty("state").GetString());
            Assert.True(restored.GetProperty("blockAutoStart").GetBoolean());
            Assert.Equal(0, restored.GetProperty("periodIndex").GetInt32());
            await Act("stop");
        }
        Assert.Equal(expectedSeconds, (await Get(client, "/progress")).GetProperty("focusSeconds").GetInt64());
        Assert.Equal(expectedSeconds, (await Get(client, "/focus-summary")).GetProperty("todaySeconds").GetInt64());
        Assert.Equal(0, (await Get(client, "/progress")).GetProperty("progress").GetProperty("totalXp").GetInt64());
        Assert.False((await Get(client, "/tasks/" + task.GetProperty("id").GetGuid())).GetProperty("isCompleted").GetBoolean());
    }

    [Fact]
    public async Task FocusBreakPauseAndNextIntervalDoNotCreditBreakOrPausedTime()
    {
        var clock = new FocusClock();
        await using var app = database.CreateApplication().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddSingleton<TimeProvider>(clock);
            s.PostConfigure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme, o => o.TimeProvider = TimeProvider.System);
            s.PostConfigure<SecurityStampValidatorOptions>(o => o.TimeProvider = TimeProvider.System);
        }));
        var owner = await database.CreateOwnerAsync(app, "focus-boundary"); using var client = app.CreateClient();
        await Login(client, owner.Email, owner.Password);
        var controllerId = Guid.NewGuid();
        var started = await Send(client, HttpMethod.Post, "/focus-runs", new { controllerId, configuration = new { method = "Custom", focusMinutes = 1, breakMinutes = 1, totalSessions = 2 } }, 201);
        var id = started.GetProperty("id").GetGuid(); long revision = 0;
        async Task<System.Text.Json.JsonElement> Act(string action) => await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action, controllerId, revision = revision++ });
        clock.Now = clock.Now.AddSeconds(20); await Act("pause");
        clock.Now = clock.Now.AddHours(1); await Act("resume");
        clock.Now = clock.Now.AddSeconds(40);
        Assert.Equal("Ready", (await Act("checkpoint")).GetProperty("state").GetString());
        Assert.Equal("Break", (await Act("next")).GetProperty("phase").GetString());
        clock.Now = clock.Now.AddMinutes(1); await Act("checkpoint");
        Assert.Equal("Focus", (await Act("next")).GetProperty("phase").GetString());
        clock.Now = clock.Now.AddMinutes(1); await Act("checkpoint"); await Act("next");
        Assert.Equal(120, (await Get(client, "/progress")).GetProperty("focusSeconds").GetInt64());
        Assert.Equal(2, (await Get(client, "/focus-summary")).GetProperty("sessions").GetInt32());
    }

    private sealed class FocusClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = DateTimeOffset.Parse("2026-09-22T14:00:00Z");
        public override DateTimeOffset GetUtcNow() => Now;
    }

    [Fact]
    public async Task PreferencesAndCitiesPersistAndAreOwnerScoped()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "time-hub");
        var other = await database.CreateOwnerAsync(app, "time-other");
        using var client = app.CreateClient(); using var foreign = app.CreateClient();
        await Login(client, owner.Email, owner.Password); await Login(foreign, other.Email, other.Password);
        var prefs = await Get(client, "/focus-preferences");
        Assert.Equal(25, prefs.GetProperty("volume").GetInt32());
        await Send(client, HttpMethod.Put, "/focus-preferences", new { volume = 17, sound = "Bell", autoBreak = true });
        Assert.Equal(17, (await Get(client, "/focus-preferences")).GetProperty("volume").GetInt32());
        Assert.Equal(25, (await Get(foreign, "/focus-preferences")).GetProperty("volume").GetInt32());
        var city = await Send(client, HttpMethod.Post, "/world-clock", new { name = "Tokyo", timeZoneId = "Asia/Tokyo" }, 201);
        await Send(foreign, HttpMethod.Delete, $"/world-clock/{city.GetProperty("id").GetGuid()}", new { }, 404);
        Assert.Single((await Get(client, "/world-clock")).EnumerateArray());
        await Send(client, HttpMethod.Post, "/world-clock", new { name = "Invalid", timeZoneId = "UTC+7" }, 400);
        await Send(client, HttpMethod.Put, "/focus-preferences", new { volume = 101 }, 400);
    }

    [Fact]
    public async Task RunSuspensionIsPersistedAndDoesNotAwardXp()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "interrupted-work");
        using var client = app.CreateClient(); await Login(client, owner.Email, owner.Password);
        var controller = Guid.NewGuid();
        var started = await Send(client, HttpMethod.Post, "/focus-runs", new { controllerId = controller, configuration = new { method = "Balanced" } }, 201);
        var id = started.GetProperty("id").GetGuid();
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var run = await db.Set<FocusRun>().SingleAsync(x => x.Id == id);
            run.LastObservedAtUtc = run.LastObservedAtUtc.AddMinutes(-40);
            await db.SaveChangesAsync();
        }
        var interrupted = await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "checkpoint", controllerId = controller, revision = 0 });
        Assert.Equal("Interrupted", interrupted.GetProperty("state").GetString());
        Assert.Equal(3000, interrupted.GetProperty("remainingSeconds").GetInt32());
        var recovered = await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "recover-resume", controllerId = controller, revision = 1 });
        Assert.Equal("Running", recovered.GetProperty("state").GetString());
        await Send(client, HttpMethod.Post, $"/focus-runs/{id}/action", new { action = "stop", controllerId = controller, revision = 2 });
        Assert.Equal(0, (await Get(client, "/progress")).GetProperty("progress").GetProperty("totalXp").GetInt64());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, (await Get(client, "/focus-runs/active")).GetProperty("run").ValueKind);
    }
}
