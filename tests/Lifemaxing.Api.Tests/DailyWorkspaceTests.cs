using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class DailyWorkspaceTests(TestDatabaseFixture database)
{
    [Fact]
    public async Task ManualGoalsAreOwnedDatedReferencesAndUnionWithTaskRelationships()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "goal-selection");
        using var client = app.CreateClient();
        await Login(client, owner.Email, owner.Password);
        var date = (await Get(client, "/today")).GetProperty("localDate").GetString()!;
        var next = DateOnly.Parse(date).AddDays(1).ToString("yyyy-MM-dd");
        var goal = await Send(client, HttpMethod.Post, "/goals", new { title = "Selected outcome", lifeAreaId = owner.AreaId }, 201);
        var id = goal.GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Post, "/goals", new { title = "Other active outcome" }, 201);
        Assert.Empty((await Get(client, "/today")).GetProperty("goals").EnumerateArray());
        await Task.WhenAll(Enumerable.Range(0, 3).Select(_ => Send(client, HttpMethod.Put, $"/today/{date}/goals/{id}", new { }, 204)));
        var selected = Assert.Single((await Get(client, "/today")).GetProperty("goals").EnumerateArray());
        Assert.True(selected.GetProperty("manuallySelected").GetBoolean());
        Assert.Empty((await Get(client, $"/today?date={next}")).GetProperty("goals").EnumerateArray());
        var task = await Send(client, HttpMethod.Post, "/tasks", new { title = "Linked work", plannedDate = date, goalId = id }, 201);
        await Send(client, HttpMethod.Delete, $"/today/{date}/goals/{id}", new { }, 204);
        var derived = Assert.Single((await Get(client, "/today")).GetProperty("goals").EnumerateArray());
        Assert.False(derived.GetProperty("manuallySelected").GetBoolean());
        Assert.Equal(1, derived.GetProperty("plannedTaskCount").GetInt32());
        await Send(client, HttpMethod.Patch, $"/tasks/{task.GetProperty("id").GetGuid()}", new { plannedDate = next });
        Assert.Empty((await Get(client, "/today")).GetProperty("goals").EnumerateArray());
        Assert.Single((await Get(client, $"/today?date={next}")).GetProperty("goals").EnumerateArray());
        var foreign = await database.CreateOwnerAsync(app, "goal-selection-foreign");
        using var stranger = app.CreateClient();
        await Login(stranger, foreign.Email, foreign.Password);
        await Send(stranger, HttpMethod.Put, $"/today/{date}/goals/{id}", new { }, 404);
        await Send(stranger, HttpMethod.Delete, $"/today/{date}/goals/{id}", new { }, 404);
        Assert.Equal(2, (await Get(client, "/goals")).GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task TodayUsesPlannedDateAndPreservesNormalTasksAcrossModes()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "daily-model");
        using var client = app.CreateClient();
        await Login(client, owner.Email, owner.Password);
        var date = (await Get(client, "/today")).GetProperty("localDate").GetString()!;
        var next = DateOnly.Parse(date).AddDays(1).ToString("yyyy-MM-dd");
        var goal = await Send(client, HttpMethod.Post, "/goals", new { title = "An outcome", lifeAreaId = owner.AreaId }, 201);
        var task = await Send(client, HttpMethod.Post, "/tasks", new { title = "Today work", plannedDate = date, lifeAreaId = owner.AreaId, goalId = goal.GetProperty("id").GetGuid() }, 201);
        var id = task.GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Post, "/tasks", new { title = "Future work", plannedDate = next }, 201);
        await Send(client, HttpMethod.Post, "/tasks", new { title = "Inbox work", dueDate = date }, 201);
        foreach (var mode in new[] { "Simple", "ThreeThreeThree", "FocusedDay", "Custom" })
        {
            await Send(client, HttpMethod.Patch, "/settings", new { planningMode = mode });
            var today = await Get(client, "/today");
            Assert.Equal(id, Assert.Single(today.GetProperty("tasks").EnumerateArray()).GetProperty("id").GetGuid());
            Assert.Single(today.GetProperty("goals").EnumerateArray());
            Assert.Equal(3, (await Get(client, "/tasks")).GetProperty("total").GetInt32());
            Assert.Equal(JsonValueKind.Null, (await Get(client, "/focus-sessions/active")).GetProperty("session").ValueKind);
        }
        await Send(client, HttpMethod.Post, $"/tasks/{id}/complete", new { });
        Assert.True(Assert.Single((await Get(client, "/today")).GetProperty("tasks").EnumerateArray()).GetProperty("isCompleted").GetBoolean());
        await Send(client, HttpMethod.Patch, $"/tasks/{id}", new { plannedDate = next });
        var moved = await Get(client, $"/tasks/{id}");
        Assert.Equal(owner.AreaId, moved.GetProperty("lifeAreaId").GetGuid());
        Assert.Equal(goal.GetProperty("id").GetGuid(), moved.GetProperty("goalId").GetGuid());
        Assert.Empty((await Get(client, "/today")).GetProperty("tasks").EnumerateArray());
    }

    [Fact]
    public async Task HabitXpAccepts75AndKeepsSharedCapAndReversal()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "habit-range");
        using var client = app.CreateClient();
        await Login(client, owner.Email, owner.Password);
        var date = (await Get(client, "/today")).GetProperty("localDate").GetString();
        foreach (var xp in new[] { 0, -1, 76 })
            await Send(client, HttpMethod.Post, "/habits", new { title = "Invalid", xpPerLog = xp }, 400);
        var habit = await Send(client, HttpMethod.Post, "/habits", new { title = "Routine", xpPerLog = 75, lifeAreaId = owner.AreaId }, 201);
        var id = habit.GetProperty("id").GetGuid();
        await Send(client, HttpMethod.Patch, $"/habits/{id}", new { xpPerLog = 76 }, 400);
        var log = await Send(client, HttpMethod.Post, $"/habits/{id}/logs", new { localDate = date }, 201);
        Assert.Equal(75, log.GetProperty("progression").GetProperty("xpChange").GetInt32());
        var second = await Send(client, HttpMethod.Post, "/habits", new { title = "Another routine", xpPerLog = 1 }, 201);
        var capped = await Send(client, HttpMethod.Post, $"/habits/{second.GetProperty("id").GetGuid()}/logs", new { localDate = date }, 201);
        Assert.Equal(0, capped.GetProperty("progression").GetProperty("xpChange").GetInt32());
        var todayHabit = (await Get(client, "/today")).GetProperty("habits").EnumerateArray().Single(x => x.GetProperty("id").GetGuid() == id);
        Assert.Equal(owner.AreaId, todayHabit.GetProperty("lifeAreaId").GetGuid());
        Assert.Equal(75, todayHabit.GetProperty("awardedXp").GetInt32());
        var reversed = await Send(client, HttpMethod.Post, $"/habits/{id}/logs/{log.GetProperty("id").GetGuid()}/revoke", new { });
        Assert.Equal(-75, reversed.GetProperty("progression").GetProperty("xpChange").GetInt32());
    }

    internal static async Task Login(HttpClient client, string email, string password)
    {
        var csrf = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", csrf.GetProperty("requestToken").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password })).StatusCode);
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        csrf = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", csrf.GetProperty("requestToken").GetString());
    }
    internal static async Task<JsonElement> Get(HttpClient client, string path) => await client.GetFromJsonAsync<JsonElement>("/api/v1" + path);
    internal static async Task<JsonElement> Send(HttpClient client, HttpMethod method, string path, object body, int expected = 200)
    {
        using var request = new HttpRequestMessage(method, "/api/v1" + path) { Content = JsonContent.Create(body) };
        request.Headers.Add("ClientActionId", Guid.NewGuid().ToString());
        using var response = await client.SendAsync(request);
        Assert.True((int)response.StatusCode == expected, $"{method} {path}: expected {expected}, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return expected == 204 ? default : await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
