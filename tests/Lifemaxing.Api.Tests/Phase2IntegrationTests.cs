using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Habits;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class Phase2IntegrationTests(TestDatabaseFixture database)
{
    [Fact]
    public async Task InboxAlwaysExcludesFinishedAndArchivedTasksAndDateFiltersAreValidated()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "inbox-validation");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        var taskId = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Unplanned with deadline", dueDate = "2026-10-01", lifeAreaId = owner.AreaId }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        Assert.Equal(1, (await Get(client, "/tasks?inbox=true&status=all")).GetProperty("total").GetInt32());
        await Send(client, HttpMethod.Post, $"/tasks/{taskId}/complete", new { });
        Assert.Equal(0, (await Get(client, "/tasks?inbox=true&status=all")).GetProperty("total").GetInt32());
        await Send(client, HttpMethod.Delete, $"/tasks/{taskId}", new { }, HttpStatusCode.NoContent);
        Assert.Equal(0, (await Get(client, "/tasks?inbox=true&status=archived")).GetProperty("total").GetInt32());
        var habitId = (await Send(client, HttpMethod.Post, "/habits", new { title = "Date validation" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        foreach (var path in new[] { "/tasks?plannedDate=0001-01-01", "/tasks?dueBefore=9999-01-01", $"/habits/{habitId}/logs?from=0001-01-01", $"/habits/{habitId}/logs?to=9999-01-01" })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/v1" + path)).StatusCode);
        await Send(client, HttpMethod.Delete, "/daily-mission/0001-01-01", new { }, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task QuickCapturePatchFiltersCompletionArchiveAndRestartPersist()
    {
        Guid taskId;
        var application = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(application, "tasks");
        using (var client = application.CreateClient())
        {
            await SignIn(client, owner.Email, owner.Password);
            var task = await Send(client, HttpMethod.Post, "/tasks", new { title = "Capture action" }, HttpStatusCode.Created);
            taskId = task.GetProperty("id").GetGuid();
            Assert.False(task.GetProperty("isCompleted").GetBoolean());
            Assert.Equal(JsonValueKind.Null, task.GetProperty("plannedDate").ValueKind);
            Assert.Equal(1, (await Get(client, "/tasks?inbox=true")).GetProperty("total").GetInt32());
            var edited = await Send(client, HttpMethod.Patch, $"/tasks/{taskId}", new { title = "Edited action", lifeAreaId = owner.AreaId, dueDate = "2026-10-01" });
            Assert.Equal("Small", edited.GetProperty("tier").GetString());
            Assert.Equal("2026-10-01", edited.GetProperty("dueDate").GetString());
            await Send(client, HttpMethod.Patch, $"/tasks/{taskId}", new { dueDate = (string?)null });
            Assert.Equal(1, (await Get(client, $"/tasks?areaId={owner.AreaId}&search=Edited&pageSize=1")).GetProperty("total").GetInt32());
            await Send(client, HttpMethod.Post, $"/tasks/{taskId}/complete", new { });
            await Send(client, HttpMethod.Post, $"/tasks/{taskId}/complete", new { });
            Assert.Equal(0, (await Get(client, "/tasks?inbox=true")).GetProperty("total").GetInt32());
            Assert.Equal(1, (await Get(client, "/tasks?status=completed")).GetProperty("total").GetInt32());
            await Send(client, HttpMethod.Post, $"/tasks/{taskId}/reopen", new { });
            await Send(client, HttpMethod.Post, $"/tasks/{taskId}/complete", new { });
        }
        await application.DisposeAsync();
        await using var restarted = database.CreateApplication();
        using var afterRestart = restarted.CreateClient();
        await SignIn(afterRestart, owner.Email, owner.Password);
        var persisted = await Get(afterRestart, $"/tasks/{taskId}");
        Assert.Equal("Edited action", persisted.GetProperty("title").GetString());
        Assert.True(persisted.GetProperty("isCompleted").GetBoolean());
        await Send(afterRestart, HttpMethod.Delete, $"/tasks/{taskId}", new { }, HttpStatusCode.NoContent);
        Assert.Equal(1, (await Get(afterRestart, "/tasks?status=archived")).GetProperty("total").GetInt32());
        await using var scope = restarted.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(2, await db.TaskCompletions.CountAsync(x => x.TaskId == taskId));
        Assert.Equal(1, await db.TaskCompletions.CountAsync(x => x.TaskId == taskId && x.ReversedAtUtc == null));
        Assert.False(db.Database.HasPendingModelChanges());
    }

    [Fact]
    public async Task PlansPreserveStartedDaysAndRemoveOnlyFuturePlansWhenMoved()
    {
        var clock = new TestClock("2026-03-28T23:30:00Z"); // Oslo March 29, DST transition day.
        await using var app = WithClock(clock);
        var owner = await database.CreateOwnerAsync(app, "plans");
        using var client = app.CreateClient(); await SignIn(client, owner.Email, owner.Password);
        var today = await Get(client, "/today");
        Assert.Equal("2026-03-29", today.GetProperty("localDate").GetString());
        var task = await Send(client, HttpMethod.Post, "/tasks", new { title = "Plan me", plannedDate = "2026-03-29", dueDate = "2026-03-28" }, HttpStatusCode.Created);
        var id = task.GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Patch, $"/tasks/{id}", new { plannedDate = "2026-03-30" });
        var original = await Get(client, "/today?date=2026-03-29");
        Assert.Single(original.GetProperty("commitments").EnumerateArray());
        Assert.Equal(JsonValueKind.Null, original.GetProperty("commitments")[0].GetProperty("removedAtUtc").ValueKind);
        Assert.True(original.GetProperty("commitments")[0].GetProperty("plannedSameDay").GetBoolean());
        await Send(client, HttpMethod.Patch, $"/tasks/{id}", new { plannedDate = "2026-03-31" });
        var future = await Get(client, "/today?date=2026-03-30");
        Assert.NotEqual(JsonValueKind.Null, future.GetProperty("commitments")[0].GetProperty("removedAtUtc").ValueKind);
        var commitment = await Send(client, HttpMethod.Post, "/daily-commitments", new { taskId = id, localDate = "2026-03-31" });
        await Send(client, HttpMethod.Post, "/daily-commitments", new { taskId = id, localDate = "2026-03-31" });
        Assert.Single((await Get(client, "/today?date=2026-03-31")).GetProperty("commitments").EnumerateArray());
        await Send(client, HttpMethod.Delete, $"/daily-commitments/{commitment.GetProperty("id").GetGuid()}", new { }, HttpStatusCode.NoContent);
        Assert.Equal(1, (await Get(client, "/tasks?inbox=true")).GetProperty("total").GetInt32());
        await Send(client, HttpMethod.Patch, "/settings", new { timeZoneId = "America/Los_Angeles", locale = "en-US" });
        Assert.Equal("2026-03-28", (await Get(client, "/today")).GetProperty("localDate").GetString());
        Assert.Equal("Europe/Oslo", (await Get(client, "/today?date=2026-03-29")).GetProperty("commitments")[0].GetProperty("timeZoneId").GetString());
    }

    [Fact]
    public async Task MissionHasOneRowPerDayCreatesCommitmentAndRejectsFinishedTasks()
    {
        await using var app = WithClock(new TestClock("2026-06-10T09:00:00Z"));
        var owner = await database.CreateOwnerAsync(app, "mission");
        using var client = app.CreateClient(); await SignIn(client, owner.Email, owner.Password);
        var a = (await Send(client, HttpMethod.Post, "/tasks", new { title = "First" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var b = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Second" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Put, "/daily-mission/2026-06-10", new { taskId = a }, HttpStatusCode.Conflict);
        await Send(client, HttpMethod.Post, "/daily-commitments", new { taskId = a, localDate = "2026-06-10" });
        await Send(client, HttpMethod.Post, "/daily-commitments", new { taskId = b, localDate = "2026-06-10" });
        await Send(client, HttpMethod.Put, "/daily-mission/2026-06-10", new { taskId = a });
        await Send(client, HttpMethod.Put, "/daily-mission/2026-06-10", new { taskId = b });
        var today = await Get(client, "/today");
        Assert.Equal(b, today.GetProperty("mission").GetProperty("taskId").GetGuid());
        Assert.Equal(2, today.GetProperty("commitments").GetArrayLength());
        await Send(client, HttpMethod.Post, $"/tasks/{a}/complete", new { });
        await Send(client, HttpMethod.Put, "/daily-mission/2026-06-10", new { taskId = a }, HttpStatusCode.Conflict);
        await Send(client, HttpMethod.Delete, "/daily-mission/2026-06-10", new { }, HttpStatusCode.NoContent);
        Assert.Equal(JsonValueKind.Null, (await Get(client, "/today")).GetProperty("mission").ValueKind);
    }

    [Fact]
    public async Task HabitSchedulesAppendAndWeeklyLogsAreUniqueAndReversible()
    {
        var clock = new TestClock("2026-03-27T10:00:00Z");
        await using var app = WithClock(clock);
        var owner = await database.CreateOwnerAsync(app, "habit");
        using var client = app.CreateClient(); await SignIn(client, owner.Email, owner.Password);
        var habit = await Send(client, HttpMethod.Post, "/habits", new { title = "Read", schedule = new { effectiveFromDate = "2026-03-27", pattern = "WeeklyCount", weeklyTarget = 2 } }, HttpStatusCode.Created);
        var id = habit.GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Put, $"/habits/{id}/schedule", new { effectiveFromDate = "2026-03-30", pattern = "SelectedWeekdays", daysOfWeek = new[] { 1, 3, 5 } });
        await Send(client, HttpMethod.Put, $"/habits/{id}/schedule", new { effectiveFromDate = "2026-03-29", pattern = "Daily" }, HttpStatusCode.BadRequest);
        await Send(client, HttpMethod.Post, $"/habits/{id}/logs", new { localDate = "2026-03-28" }, HttpStatusCode.BadRequest);
        var first = await Send(client, HttpMethod.Post, $"/habits/{id}/logs", new { localDate = "2026-03-27" }, HttpStatusCode.Created);
        await Send(client, HttpMethod.Post, $"/habits/{id}/logs", new { localDate = "2026-03-27" }, HttpStatusCode.Conflict);
        clock.Now = DateTimeOffset.Parse("2026-03-29T10:00:00Z");
        await Send(client, HttpMethod.Post, $"/habits/{id}/logs", new { localDate = "2026-03-29" }, HttpStatusCode.Created);
        var row = (await Get(client, "/today")).GetProperty("habits")[0];
        Assert.Equal(2, row.GetProperty("weekCompletions").GetInt32());
        Assert.True(row.GetProperty("targetReached").GetBoolean());
        await Send(client, HttpMethod.Post, $"/habits/{id}/logs/{first.GetProperty("id").GetGuid()}/revoke", new { });
        await Send(client, HttpMethod.Post, $"/habits/{id}/logs", new { localDate = "2026-03-27" }, HttpStatusCode.Created);
        Assert.Equal(3, (await Get(client, $"/habits/{id}/logs")).GetProperty("total").GetInt32());
        clock.Now = DateTimeOffset.Parse("2026-03-31T10:00:00Z");
        Assert.Empty((await Get(client, "/today")).GetProperty("habits").EnumerateArray());
        await Send(client, HttpMethod.Post, $"/habits/{id}/logs", new { localDate = "2026-03-31" }, HttpStatusCode.BadRequest);
        await Send(client, HttpMethod.Post, $"/habits/{id}/logs", new { localDate = "2026-03-30" }, HttpStatusCode.Created);
        await Send(client, HttpMethod.Patch, $"/habits/{id}", new { title = "Read thoughtfully" });
        await Send(client, HttpMethod.Delete, $"/habits/{id}", new { }, HttpStatusCode.NoContent);
        Assert.Equal(2, (await Get(client, $"/habits/{id}")).GetProperty("schedules").GetArrayLength());
        Assert.Equal(4, (await Get(client, $"/habits/{id}/logs")).GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task GoalHistoryPreservesValuesAndMeaningAndSupportsQualitativeGoals()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "goals");
        using var client = app.CreateClient(); await SignIn(client, owner.Email, owner.Password);
        var goal = await Send(client, HttpMethod.Post, "/goals", new { title = "Finish chapters", targetValue = 10, baselineValue = 0, unit = "chapters", direction = "Increase" }, HttpStatusCode.Created);
        var id = goal.GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Post, $"/goals/{id}/progress", new { value = 2, note = "First update" }, HttpStatusCode.Created);
        await Send(client, HttpMethod.Post, $"/goals/{id}/progress", new { value = 1, note = "Correction" }, HttpStatusCode.Created);
        await Send(client, HttpMethod.Patch, $"/goals/{id}", new { unit = "hours" }, HttpStatusCode.Conflict);
        await Send(client, HttpMethod.Patch, $"/goals/{id}", new { title = "Read chapters", state = "Completed" });
        Assert.NotEqual(JsonValueKind.Null, (await Get(client, $"/goals/{id}")).GetProperty("completedAtUtc").ValueKind);
        await Send(client, HttpMethod.Delete, $"/goals/{id}", new { }, HttpStatusCode.NoContent);
        var progress = await Get(client, $"/goals/{id}/progress?pageSize=1");
        Assert.Equal(2, progress.GetProperty("total").GetInt32());
        Assert.Equal(1, progress.GetProperty("items")[0].GetProperty("value").GetDecimal());
        var qualitative = await Send(client, HttpMethod.Post, "/goals", new { title = "Publish a short story" }, HttpStatusCode.Created);
        var qid = qualitative.GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Post, $"/goals/{qid}/progress", new { value = 1 }, HttpStatusCode.BadRequest);
        await Send(client, HttpMethod.Post, $"/goals/{qid}/progress", new { note = "Draft completed" }, HttpStatusCode.Created);
        await Send(client, HttpMethod.Post, "/goals", new { title = "Invalid direction", targetValue = 1, baselineValue = 2, unit = "items", direction = "Increase" }, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AllPrivateResourcesAndRelationshipsRejectForeignOwners()
    {
        await using var app = database.CreateApplication();
        var a = await database.CreateOwnerAsync(app, "isolation-a");
        var b = await database.CreateOwnerAsync(app, "isolation-b");
        using var foreign = app.CreateClient(); await SignIn(foreign, b.Email, b.Password);
        var taskId = (await Send(foreign, HttpMethod.Post, "/tasks", new { title = "Private task" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var goalId = (await Send(foreign, HttpMethod.Post, "/goals", new { title = "Private goal" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var habitId = (await Send(foreign, HttpMethod.Post, "/habits", new { title = "Private habit" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var date = (await Get(foreign, "/today")).GetProperty("localDate").GetString();
        var logId = (await Send(foreign, HttpMethod.Post, $"/habits/{habitId}/logs", new { localDate = date }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var planId = (await Send(foreign, HttpMethod.Post, "/daily-commitments", new { taskId, localDate = date })).GetProperty("id").GetGuid();
        using var client = app.CreateClient(); await SignIn(client, a.Email, a.Password);
        foreach (var path in new[] { $"/tasks/{taskId}", $"/goals/{goalId}", $"/goals/{goalId}/progress", $"/habits/{habitId}", $"/habits/{habitId}/logs" })
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/v1" + path)).StatusCode);
        foreach (var path in new[] { "/tasks", "/habits", "/goals" })
        {
            Assert.Equal(0, (await Get(client, path)).GetProperty("total").GetInt32());
            await Send(client, HttpMethod.Post, path, new { title = "Wrong link", lifeAreaId = b.AreaId }, HttpStatusCode.NotFound);
        }
        await Send(client, HttpMethod.Post, "/tasks", new { title = "Wrong goal", goalId }, HttpStatusCode.NotFound);
        foreach (var path in new[] { $"/tasks/{taskId}", $"/habits/{habitId}", $"/goals/{goalId}" })
        {
            await Send(client, HttpMethod.Patch, path, new { title = "Wrong owner" }, HttpStatusCode.NotFound);
            await Send(client, HttpMethod.Delete, path, new { }, HttpStatusCode.NotFound);
        }
        foreach (var path in new[] { $"/tasks/{taskId}/complete", $"/tasks/{taskId}/reopen", $"/habits/{habitId}/logs/{logId}/revoke" })
            await Send(client, HttpMethod.Post, path, new { }, HttpStatusCode.NotFound);
        await Send(client, HttpMethod.Post, "/daily-commitments", new { taskId, localDate = date }, HttpStatusCode.NotFound);
        await Send(client, HttpMethod.Delete, $"/daily-commitments/{planId}", new { }, HttpStatusCode.NotFound);
        await Send(client, HttpMethod.Put, $"/daily-mission/{date}", new { taskId }, HttpStatusCode.NotFound);
        await Send(client, HttpMethod.Put, $"/habits/{habitId}/schedule", new { effectiveFromDate = "2028-01-01" }, HttpStatusCode.NotFound);
        await Send(client, HttpMethod.Post, $"/habits/{habitId}/logs", new { localDate = date }, HttpStatusCode.NotFound);
        await Send(client, HttpMethod.Post, $"/goals/{goalId}/progress", new { note = "Wrong owner" }, HttpStatusCode.NotFound);
        Assert.Empty((await Get(client, "/today")).GetProperty("tasks").EnumerateArray());
    }

    [Fact]
    public async Task AnonymousAndMissingCsrfRejectedAcrossProductivityGroups()
    {
        await using var app = database.CreateApplication();
        using var client = app.CreateClient();
        foreach (var path in new[] { "/today", "/tasks", "/habits", "/goals" })
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1" + path)).StatusCode);
        foreach (var path in new[] { "/tasks", "/habits", "/goals", "/daily-commitments" })
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1" + path, new { })).StatusCode);
        var owner = await database.CreateOwnerAsync(app, "phase2-csrf");
        await SignIn(client, owner.Email, owner.Password);
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        foreach (var path in new[] { "/tasks", "/habits", "/goals" })
        {
            var response = await client.PostAsJsonAsync("/api/v1" + path, new { title = "Rejected" });
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains("csrf_validation_failed", await response.Content.ReadAsStringAsync());
        }
    }

    [Fact]
    public async Task ConcurrentCompletionMissionAndHabitLogRespectDatabaseInvariants()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "concurrent");
        using var client = app.CreateClient(); await SignIn(client, owner.Email, owner.Password);
        var taskId = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Once" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => Send(client, HttpMethod.Post, $"/tasks/{taskId}/complete", new { })));
        await Send(client, HttpMethod.Post, $"/tasks/{taskId}/reopen", new { });
        var date = (await Get(client, "/today")).GetProperty("localDate").GetString();
        await Send(client, HttpMethod.Post, "/daily-commitments", new { taskId, localDate = date });
        await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => Send(client, HttpMethod.Put, $"/daily-mission/{date}", new { taskId })));
        var habitId = (await Send(client, HttpMethod.Post, "/habits", new { title = "Once per day" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var responses = await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => { var request = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/habits/{habitId}/logs") { Content = JsonContent.Create(new { localDate = date }) }; request.Headers.Add("ClientActionId", Guid.NewGuid().ToString()); return client.SendAsync(request); }));
        Assert.Single(responses, x => x.StatusCode == HttpStatusCode.Created);
        Assert.Equal(3, responses.Count(x => x.StatusCode == HttpStatusCode.Conflict));
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.TaskCompletions.CountAsync(x => x.TaskId == taskId));
        Assert.Equal(1, await db.DailyMissions.CountAsync(x => x.UserId == owner.UserId));
        Assert.Equal(1, await db.DailyCommitments.CountAsync(x => x.UserId == owner.UserId));
    }

    [Theory]
    [InlineData("2026-03-29T00:30:00Z", "Europe/Oslo", "2026-03-29")]
    [InlineData("2026-03-29T01:30:00Z", "Europe/Oslo", "2026-03-29")]
    [InlineData("2026-10-25T00:30:00Z", "Europe/Oslo", "2026-10-25")]
    [InlineData("2026-10-25T01:30:00Z", "Europe/Oslo", "2026-10-25")]
    [InlineData("2026-01-01T00:30:00Z", "America/Los_Angeles", "2025-12-31")]
    public void LocalDatesAndIsoWeeksDoNotDependOnUtcDayOrDstLength(string instant, string zone, string expected)
    {
        var date = Productivity.LocalDate(DateTimeOffset.Parse(instant), zone);
        Assert.Equal(DateOnly.Parse(expected), date);
        Assert.Equal(DayOfWeek.Monday, HabitRules.WeekStart(date).DayOfWeek);
    }

    private WebApplicationFactory<Program> WithClock(TestClock clock) => database.CreateApplication()
        .WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.AddSingleton<TimeProvider>(clock);
            // The HTTP cookie jar uses wall time. Only the domain calendar is under test.
            services.PostConfigure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme,
                options => options.TimeProvider = TimeProvider.System);
        }));
    private static async Task SignIn(HttpClient client, string email, string password)
    {
        var token = (await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf")).GetProperty("requestToken").GetString();
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", token);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password })).StatusCode);
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        token = (await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf")).GetProperty("requestToken").GetString();
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", token);
    }
    private static async Task<JsonElement> Get(HttpClient client, string path)
    {
        var response = await client.GetAsync("/api/v1" + path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
    private static async Task<JsonElement> Send(HttpClient client, HttpMethod method, string path, object body, HttpStatusCode expected = HttpStatusCode.OK)
    {
        using var request = new HttpRequestMessage(method, "/api/v1" + path) { Content = JsonContent.Create(body) };
        request.Headers.Add("ClientActionId", Guid.NewGuid().ToString());
        using var response = await client.SendAsync(request);
        Assert.True(response.StatusCode == expected, $"{method} {path}: expected {expected}, got {response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return response.StatusCode == HttpStatusCode.NoContent ? default : await response.Content.ReadFromJsonAsync<JsonElement>();
    }
    private sealed class TestClock(string value) : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = DateTimeOffset.Parse(value);
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
