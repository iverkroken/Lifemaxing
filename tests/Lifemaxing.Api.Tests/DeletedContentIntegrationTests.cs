using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.DeletedContent;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class DeletedContentIntegrationTests(TestDatabaseFixture database)
{
    [Fact]
    public async Task DeletedTaskIsHiddenAndRestoresWithItsIdentityAndRelationships()
    {
        var clock = new TestClock("2026-09-21T22:30:00Z");
        await using var app = WithClock(clock);
        var owner = await database.CreateOwnerAsync(app, "deleted-task");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);

        var goal = await Send(client, HttpMethod.Post, "/goals", new
        {
            title = "Ship the release",
            lifeAreaId = owner.AreaId
        }, HttpStatusCode.Created);
        var goalId = goal.GetProperty("id").GetGuid();
        var task = await Send(client, HttpMethod.Post, "/tasks", new
        {
            title = "Run the release checklist",
            lifeAreaId = owner.AreaId,
            goalId,
            plannedDate = "2026-09-22",
            priority = "High",
            tier = "Medium"
        }, HttpStatusCode.Created);
        var taskId = task.GetProperty("id").GetGuid();

        await Send(client, HttpMethod.Delete, $"/tasks/{taskId}", new { }, HttpStatusCode.NoContent);

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/v1/tasks/{taskId}")).StatusCode);
        Assert.DoesNotContain((await Get(client, "/today?date=2026-09-22")).GetProperty("tasks").EnumerateArray(),
            item => item.GetProperty("id").GetGuid() == taskId);
        Assert.Equal(0, (await Get(client, "/tasks?status=all&search=release+checklist")).GetProperty("total").GetInt32());

        var deleted = await Get(client, "/recently-deleted?type=task");
        var deletedTask = Assert.Single(deleted.GetProperty("items").EnumerateArray());
        Assert.Equal(taskId, deletedTask.GetProperty("id").GetGuid());
        Assert.Equal("task", deletedTask.GetProperty("type").GetString());
        Assert.Equal(DateTimeOffset.Parse("2026-10-21T22:30:00Z"), deletedTask.GetProperty("expiresAtUtc").GetDateTimeOffset());

        await Send(client, HttpMethod.Post, $"/recently-deleted/task/{taskId}/restore", new { }, HttpStatusCode.NoContent);
        var restored = await Get(client, $"/tasks/{taskId}");
        Assert.Equal(taskId, restored.GetProperty("id").GetGuid());
        Assert.Equal(owner.AreaId, restored.GetProperty("lifeAreaId").GetGuid());
        Assert.Equal(goalId, restored.GetProperty("goalId").GetGuid());
        Assert.Equal("2026-09-22", restored.GetProperty("plannedDate").GetString());
    }

    [Fact]
    public async Task DeletedContentIsOwnerScopedAndExpiredItemsCannotBeRestored()
    {
        var clock = new TestClock("2026-09-21T22:30:00Z");
        await using var app = WithClock(clock);
        var first = await database.CreateOwnerAsync(app, "deleted-owner-a");
        var second = await database.CreateOwnerAsync(app, "deleted-owner-b");
        using var firstClient = app.CreateClient();
        await SignIn(firstClient, first.Email, first.Password);
        var taskId = (await Send(firstClient, HttpMethod.Post, "/tasks", new { title = "Private deleted task" }, HttpStatusCode.Created))
            .GetProperty("id").GetGuid();
        await Send(firstClient, HttpMethod.Delete, $"/tasks/{taskId}", new { }, HttpStatusCode.NoContent);

        using var secondClient = app.CreateClient();
        await SignIn(secondClient, second.Email, second.Password);
        Assert.Empty((await Get(secondClient, "/recently-deleted")).GetProperty("items").EnumerateArray());
        await Send(secondClient, HttpMethod.Post, $"/recently-deleted/task/{taskId}/restore", new { }, HttpStatusCode.NotFound);
        await Send(secondClient, HttpMethod.Delete, $"/recently-deleted/task/{taskId}", new { }, HttpStatusCode.NotFound);

        await using (var scope = app.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Tasks.IgnoreQueryFilters().Where(x => x.Id == taskId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.DeletedAtUtc,
                    clock.Now - TimeSpan.FromDays(30)));
        }
        await Send(firstClient, HttpMethod.Post, $"/recently-deleted/task/{taskId}/restore", new { }, HttpStatusCode.Conflict);
        Assert.Empty((await Get(firstClient, "/recently-deleted")).GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task CustomLifeAreaImageAndRelationshipsSurviveDeleteAndRestore()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "custom-area");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);

        var created = await Send(client, HttpMethod.Post, "/areas", new
        {
            displayName = "Creative work",
            imageFocalX = 35,
            imageFocalY = 62
        }, HttpStatusCode.Created);
        var areaId = created.GetProperty("id").GetGuid();
        Assert.StartsWith("custom-", created.GetProperty("key").GetString());

        var image = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=");
        using (var upload = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/areas/{areaId}/image"))
        {
            var content = new MultipartFormDataContent();
            content.Add(new ByteArrayContent(image) { Headers = { ContentType = new("image/png") } }, "image", "area.png");
            upload.Content = content;
            using var response = await client.SendAsync(upload);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
        var storedImage = await client.GetAsync($"/api/v1/areas/{areaId}/image");
        Assert.Equal("image/png", storedImage.Content.Headers.ContentType?.MediaType);
        Assert.True(storedImage.Headers.CacheControl?.NoStore);
        Assert.Equal(image, await storedImage.Content.ReadAsByteArrayAsync());
        using (var invalid = new MultipartFormDataContent())
        {
            invalid.Add(new ByteArrayContent(image[..11]) { Headers = { ContentType = new("image/png") } }, "image", "broken.png");
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsync($"/api/v1/areas/{areaId}/image", invalid)).StatusCode);
        }

        var taskId = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Draft a story", lifeAreaId = areaId }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var habitId = (await Send(client, HttpMethod.Post, "/habits", new { title = "Sketch", lifeAreaId = areaId }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var goalId = (await Send(client, HttpMethod.Post, "/goals", new { title = "Publish", lifeAreaId = areaId }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var impact = await Get(client, $"/areas/{areaId}/delete-impact");
        Assert.Equal(1, impact.GetProperty("tasks").GetInt32());
        Assert.Equal(1, impact.GetProperty("habits").GetInt32());
        Assert.Equal(1, impact.GetProperty("goals").GetInt32());

        await Send(client, HttpMethod.Delete, $"/areas/{areaId}", new { }, HttpStatusCode.NoContent);
        Assert.DoesNotContain((await Get(client, "/areas")).EnumerateArray(), x => x.GetProperty("id").GetGuid() == areaId);
        Assert.Equal(areaId, (await Get(client, $"/tasks/{taskId}")).GetProperty("lifeAreaId").GetGuid());
        Assert.Equal(areaId, (await Get(client, $"/habits/{habitId}")).GetProperty("lifeAreaId").GetGuid());
        Assert.Equal(areaId, (await Get(client, $"/goals/{goalId}")).GetProperty("lifeAreaId").GetGuid());
        await Send(client, HttpMethod.Patch, $"/tasks/{taskId}", new { title = "Draft a better story" });
        await Send(client, HttpMethod.Patch, $"/habits/{habitId}", new { title = "Sketch daily" });
        await Send(client, HttpMethod.Patch, $"/goals/{goalId}", new { title = "Publish a story" });

        await Send(client, HttpMethod.Post, $"/recently-deleted/lifeArea/{areaId}/restore", new { }, HttpStatusCode.NoContent);
        var restored = Assert.Single((await Get(client, "/areas")).EnumerateArray(), x => x.GetProperty("id").GetGuid() == areaId);
        Assert.Equal("Creative work", restored.GetProperty("displayName").GetString());
        Assert.Equal(35, restored.GetProperty("imageFocalX").GetDecimal());
        Assert.Equal(62, restored.GetProperty("imageFocalY").GetDecimal());
        Assert.Equal(image, await (await client.GetAsync($"/api/v1/areas/{areaId}/image")).Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task DeletingFocusTargetStopsTheSessionAndPreservesElapsedTime()
    {
        var clock = new TestClock("2026-09-21T22:30:00Z");
        await using var app = WithClock(clock);
        var owner = await database.CreateOwnerAsync(app, "delete-focus");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        var taskId = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Focused work" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var sessionId = (await Send(client, HttpMethod.Post, "/focus-sessions", new { taskId }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        clock.Now = clock.Now.AddMinutes(5);

        await Send(client, HttpMethod.Delete, $"/tasks/{taskId}", new { }, HttpStatusCode.NoContent);

        Assert.Equal(JsonValueKind.Null, (await Get(client, "/focus-sessions/active")).GetProperty("session").ValueKind);
        var session = Assert.Single((await Get(client, "/focus-sessions")).GetProperty("items").EnumerateArray(),
            x => x.GetProperty("id").GetGuid() == sessionId);
        Assert.Equal("Stopped", session.GetProperty("status").GetString());
        Assert.Equal(300, session.GetProperty("accumulatedSeconds").GetInt64());
        Assert.Equal(taskId, session.GetProperty("taskId").GetGuid());
    }

    [Fact]
    public async Task HabitAndGoalRestoreTheirHistoryAndPermanentTaskDeletionKeepsXp()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "delete-history");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        var date = (await Get(client, "/today")).GetProperty("localDate").GetString();
        var habitId = (await Send(client, HttpMethod.Post, "/habits", new { title = "Keep the log", xpPerLog = 75 }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var logId = (await Send(client, HttpMethod.Post, $"/habits/{habitId}/logs", new { localDate = date }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var goalId = (await Send(client, HttpMethod.Post, "/goals", new { title = "Keep progress" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Post, $"/goals/{goalId}/progress", new { note = "A durable step" }, HttpStatusCode.Created);
        var taskId = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Keep XP" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Post, $"/tasks/{taskId}/complete", new { });

        await Send(client, HttpMethod.Delete, $"/habits/{habitId}", new { }, HttpStatusCode.NoContent);
        await Send(client, HttpMethod.Post, $"/habits/{habitId}/logs/{logId}/revoke", new { }, HttpStatusCode.NotFound);
        await Send(client, HttpMethod.Delete, $"/goals/{goalId}", new { }, HttpStatusCode.NoContent);
        await Send(client, HttpMethod.Delete, $"/tasks/{taskId}", new { }, HttpStatusCode.NoContent);
        await Send(client, HttpMethod.Post, $"/recently-deleted/habit/{habitId}/restore", new { }, HttpStatusCode.NoContent);
        await Send(client, HttpMethod.Post, $"/recently-deleted/goal/{goalId}/restore", new { }, HttpStatusCode.NoContent);
        Assert.Equal(1, (await Get(client, $"/habits/{habitId}/logs")).GetProperty("total").GetInt32());
        Assert.Equal(1, (await Get(client, $"/goals/{goalId}/progress")).GetProperty("total").GetInt32());

        int xpBefore;
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            xpBefore = await db.XpEntries.CountAsync(x => x.UserId == owner.UserId);
        }
        await Send(client, HttpMethod.Delete, $"/recently-deleted/task/{taskId}", new { }, HttpStatusCode.NoContent);
        await Send(client, HttpMethod.Post, $"/recently-deleted/task/{taskId}/restore", new { }, HttpStatusCode.NotFound);
        await using var verification = app.Services.CreateAsyncScope();
        var verifyDb = verification.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await verifyDb.Tasks.IgnoreQueryFilters().AnyAsync(x => x.Id == taskId));
        Assert.Equal(xpBefore, await verifyDb.XpEntries.CountAsync(x => x.UserId == owner.UserId));
    }

    [Fact]
    public async Task CleanupPermanentlyDeletesExpiredRecordsButLeavesNewerRecords()
    {
        var clock = new TestClock("2026-09-21T22:30:00Z");
        await using var app = WithClock(clock);
        var owner = await database.CreateOwnerAsync(app, "delete-cleanup");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        var expiredId = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Expired" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var recentId = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Recent" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Delete, $"/tasks/{expiredId}", new { }, HttpStatusCode.NoContent);
        await Send(client, HttpMethod.Delete, $"/tasks/{recentId}", new { }, HttpStatusCode.NoContent);
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Tasks.IgnoreQueryFilters().Where(x => x.Id == expiredId).ExecuteUpdateAsync(setters =>
            setters.SetProperty(x => x.DeletedAtUtc, clock.Now - TimeSpan.FromDays(31)));
        var service = scope.ServiceProvider.GetRequiredService<DeletedContentService>();

        Assert.Equal(1, await service.PurgeExpiredAsync(CancellationToken.None));
        Assert.False(await db.Tasks.IgnoreQueryFilters().AnyAsync(x => x.Id == expiredId));
        Assert.True(await db.Tasks.IgnoreQueryFilters().AnyAsync(x => x.Id == recentId));
    }

    [Fact]
    public async Task DeletedTaskCommitmentCannotBeChanged()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "deleted-commitment");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        var date = (await Get(client, "/today")).GetProperty("localDate").GetString();
        var taskId = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Planned work" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        var commitmentId = (await Send(client, HttpMethod.Post, "/daily-commitments", new { taskId, localDate = date })).GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Delete, $"/tasks/{taskId}", new { }, HttpStatusCode.NoContent);
        await Send(client, HttpMethod.Delete, $"/daily-commitments/{commitmentId}", new { }, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CleanupWaitsForRestoreAndRechecksDeletionBeforeRemovingHistory()
    {
        var clock = new TestClock("2026-09-21T22:30:00Z");
        await using var app = WithClock(clock);
        var owner = await database.CreateOwnerAsync(app, "cleanup-race");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        var taskId = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Restoring" }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Delete, $"/tasks/{taskId}", new { }, HttpStatusCode.NoContent);
        await using var restoringScope = app.Services.CreateAsyncScope();
        var restoringDb = restoringScope.ServiceProvider.GetRequiredService<AppDbContext>();
        await restoringDb.Tasks.IgnoreQueryFilters().Where(x => x.Id == taskId).ExecuteUpdateAsync(setters =>
            setters.SetProperty(x => x.DeletedAtUtc, clock.Now - TimeSpan.FromDays(31)));
        await using var transaction = await restoringDb.Database.BeginTransactionAsync();
        await restoringDb.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"UserSettings\" WHERE \"UserId\" = {owner.UserId} FOR UPDATE");
        // Simulate a restore accepted before the deadline, with its commit still pending.
        await restoringDb.Tasks.IgnoreQueryFilters().Where(x => x.Id == taskId).ExecuteUpdateAsync(setters =>
            setters.SetProperty(x => x.DeletedAtUtc, (DateTimeOffset?)null));
        await using var cleanupScope = app.Services.CreateAsyncScope();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var cleanup = cleanupScope.ServiceProvider.GetRequiredService<DeletedContentService>().PurgeExpiredAsync(timeout.Token);
        var waiting = false;
        for (var attempt = 0; attempt < 100 && !waiting; attempt++)
        {
            waiting = await restoringDb.Database.SqlQueryRaw<bool>("SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND query LIKE '%UserSettings%FOR UPDATE%') AS \"Value\"").SingleAsync();
            if (!waiting) await Task.Delay(25);
        }
        await transaction.CommitAsync();
        Assert.Equal(0, await cleanup);
        Assert.True(waiting, "Cleanup must acquire the same owner lock as restore.");
        Assert.True(await restoringDb.Tasks.AnyAsync(x => x.Id == taskId));
    }

    [Fact]
    public async Task DeletedItemsRemainRecoverableAfterApiRestart()
    {
        Guid taskId;
        (Guid UserId, Guid AreaId, string Email, string Password) owner;
        var first = database.CreateApplication();
        owner = await database.CreateOwnerAsync(first, "delete-restart");
        using (var client = first.CreateClient())
        {
            await SignIn(client, owner.Email, owner.Password);
            taskId = (await Send(client, HttpMethod.Post, "/tasks", new { title = "Survive restart", lifeAreaId = owner.AreaId }, HttpStatusCode.Created)).GetProperty("id").GetGuid();
            await Send(client, HttpMethod.Delete, $"/tasks/{taskId}", new { }, HttpStatusCode.NoContent);
        }
        await first.DisposeAsync();

        await using var restarted = database.CreateApplication();
        using var afterRestart = restarted.CreateClient();
        await SignIn(afterRestart, owner.Email, owner.Password);
        Assert.Contains((await Get(afterRestart, "/recently-deleted?type=task")).GetProperty("items").EnumerateArray(),
            item => item.GetProperty("id").GetGuid() == taskId);
        await Send(afterRestart, HttpMethod.Post, $"/recently-deleted/task/{taskId}/restore", new { }, HttpStatusCode.NoContent);
        Assert.Equal(owner.AreaId, (await Get(afterRestart, $"/tasks/{taskId}")).GetProperty("lifeAreaId").GetGuid());
    }

    private WebApplicationFactory<Program> WithClock(TestClock clock) => database.CreateApplication()
        .WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.AddSingleton<TimeProvider>(clock);
            services.PostConfigure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme,
                options => options.TimeProvider = TimeProvider.System);
        }));

    private static async Task SignIn(HttpClient client, string email, string password)
    {
        var token = (await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf")).GetProperty("requestToken").GetString();
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", token);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password })).StatusCode);
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

    private static async Task<JsonElement> Send(HttpClient client, HttpMethod method, string path, object body,
        HttpStatusCode expected = HttpStatusCode.OK)
    {
        using var request = new HttpRequestMessage(method, "/api/v1" + path) { Content = JsonContent.Create(body) };
        request.Headers.Add("ClientActionId", Guid.NewGuid().ToString());
        using var response = await client.SendAsync(request);
        Assert.True(response.StatusCode == expected,
            $"{method} {path}: expected {expected}, got {response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return response.StatusCode == HttpStatusCode.NoContent
            ? default
            : await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private sealed class TestClock(string value) : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = DateTimeOffset.Parse(value);
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
