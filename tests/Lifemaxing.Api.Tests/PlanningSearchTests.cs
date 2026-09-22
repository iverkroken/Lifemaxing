using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Tasks;
using Lifemaxing.Api.Features.Goals;
using Lifemaxing.Api.Features.Habits;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class PlanningSearchTests(TestDatabaseFixture database)
{
    [Fact]
    public async Task PlanningModesPersistWithoutChangingWorkOrOtherOwners()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "planning");
        var other = await database.CreateOwnerAsync(app, "planning-other");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        using var created = await Send(client, HttpMethod.Post, "/api/v1/tasks", new { title = "Keep this work" });
        var task = await created.Content.ReadFromJsonAsync<JsonElement>();
        var original = await client.GetFromJsonAsync<JsonElement>("/api/v1/settings");
        Assert.Equal("FocusedDay", original.GetProperty("planningMode").GetString());
        foreach (var mode in new[] { "Simple", "ThreeThreeThree", "Custom", "FocusedDay" })
        {
            using var updated = await Send(client, HttpMethod.Patch, "/api/v1/settings", new { planningMode = mode, userId = other.UserId });
            Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
            var saved = await client.GetFromJsonAsync<JsonElement>("/api/v1/settings");
            Assert.Equal(mode, saved.GetProperty("planningMode").GetString());
            var retained = await client.GetFromJsonAsync<JsonElement>($"/api/v1/tasks/{task.GetProperty("id").GetGuid()}");
            Assert.Equal("Keep this work", retained.GetProperty("title").GetString());
        }
        using var invalid = await Send(client, HttpMethod.Patch, "/api/v1/settings", new { planningMode = "Other" });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        using var missingCsrf = await client.PatchAsJsonAsync("/api/v1/settings", new { planningMode = "Simple" });
        Assert.Equal(HttpStatusCode.BadRequest, missingCsrf.StatusCode);
        using var otherClient = app.CreateClient();
        await SignIn(otherClient, other.Email, other.Password);
        var unchanged = await otherClient.GetFromJsonAsync<JsonElement>("/api/v1/settings");
        Assert.Equal("FocusedDay", unchanged.GetProperty("planningMode").GetString());
    }

    [Fact]
    public async Task SearchRanksMatchesSupportsTyposAndNeverLeaksOtherOwners()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "search");
        var other = await database.CreateOwnerAsync(app, "search-other");
        var exactId = Guid.NewGuid();
        var foreignIds = new[] { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), other.AreaId };
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Tasks.AddRange(
                new TaskItem { Id = exactId, UserId = owner.UserId, Title = "Read", LifeAreaId = owner.AreaId },
                new TaskItem { Id = Guid.NewGuid(), UserId = owner.UserId, Title = "Read chapter", LifeAreaId = owner.AreaId },
                new TaskItem { Id = Guid.NewGuid(), UserId = owner.UserId, Title = "Must read today", LifeAreaId = owner.AreaId },
                new TaskItem { Id = Guid.NewGuid(), UserId = owner.UserId, Title = "Bread recipe", LifeAreaId = owner.AreaId },
                new TaskItem { Id = foreignIds[0], UserId = other.UserId, Title = "Read", LifeAreaId = other.AreaId },
                new TaskItem { Id = Guid.NewGuid(), UserId = owner.UserId, Title = "Read deleted", DeletedAtUtc = DateTimeOffset.UtcNow });
            db.Goals.Add(new Goal { Id = Guid.NewGuid(), UserId = owner.UserId, Title = "Finish reading", LifeAreaId = owner.AreaId });
            db.Habits.Add(new Habit { Id = Guid.NewGuid(), UserId = owner.UserId, Title = "Read nightly", LifeAreaId = owner.AreaId });
            db.Goals.Add(new Goal { Id = foreignIds[1], UserId = other.UserId, Title = "Read", LifeAreaId = other.AreaId });
            db.Habits.Add(new Habit { Id = foreignIds[2], UserId = other.UserId, Title = "Read", LifeAreaId = other.AreaId });
            var otherArea = await db.LifeAreas.SingleAsync(item => item.Id == other.AreaId);
            otherArea.DisplayName = "Read";
            var area = await db.LifeAreas.SingleAsync(item => item.Id == owner.AreaId);
            area.DisplayName = "Reading room";
            await db.SaveChangesAsync();
        }
        using var client = app.CreateClient();
        using var anonymous = await client.GetAsync("/api/v1/search?q=read");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        await SignIn(client, owner.Email, owner.Password);
        var found = await Items(client, "read");
        Assert.Equal(exactId, found[0].GetProperty("id").GetGuid());
        Assert.DoesNotContain(found, row => foreignIds.Contains(row.GetProperty("id").GetGuid()));
        Assert.DoesNotContain(found, row => row.GetProperty("title").GetString()!.Contains("foreign") || row.GetProperty("title").GetString()!.Contains("deleted"));
        Assert.Contains(found, row => row.GetProperty("kind").GetString() == "goal");
        Assert.Contains(found, row => row.GetProperty("kind").GetString() == "habit");
        Assert.Contains(found, row => row.GetProperty("kind").GetString() == "area");
        var areaResult = Assert.Single(found, row => row.GetProperty("kind").GetString() == "area");
        Assert.Equal("/areas/personal", areaResult.GetProperty("path").GetString());
        Assert.Equal(owner.AreaId, areaResult.GetProperty("lifeAreaId").GetGuid());
        Assert.True(Array.FindIndex(found, row => row.GetProperty("title").GetString() == "Read chapter") < Array.FindIndex(found, row => row.GetProperty("title").GetString() == "Must read today"));
        Assert.True(Array.FindIndex(found, row => row.GetProperty("title").GetString() == "Must read today") < Array.FindIndex(found, row => row.GetProperty("title").GetString() == "Bread recipe"));
        Assert.Contains(await Items(client, "raed"), row => row.GetProperty("id").GetGuid() == exactId);
        var foreignContext = await client.GetFromJsonAsync<JsonElement>($"/api/v1/search?q=foreign&areaId={other.AreaId}");
        Assert.Empty(foreignContext.GetProperty("items").EnumerateArray());
        Assert.Empty(await Items(client, "%"));
        using var tooLong = await client.GetAsync("/api/v1/search?q=" + new string('a', 101));
        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
    }

    [Fact]
    public async Task SearchKeepsOlderPunctuationWordMatchesAheadOfSubstringNoise()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "search-word-boundaries");
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            foreach (var separator in new[] { "-", "_", "/", ".", ",", ":", ";", "(", ")" })
                db.Tasks.Add(new TaskItem { Id = Guid.NewGuid(), UserId = owner.UserId, Title = "topic" + separator + "needle" });
            for (var index = 0; index < 100; index++)
                db.Tasks.Add(new TaskItem { Id = Guid.NewGuid(), UserId = owner.UserId, Title = "xneedle" + index, UpdatedAtUtc = DateTimeOffset.UtcNow });
            await db.SaveChangesAsync();
        }
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        var matches = await Items(client, "needle");
        Assert.Equal(9, matches.Take(9).Count(item => item.GetProperty("title").GetString()!.StartsWith("topic")));
    }

    [Fact]
    public async Task SearchBoundsResultsAndFindsOldExactMatchesAheadOfRecentNoise()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "search-bounds");
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Tasks.Add(new TaskItem { Id = Guid.NewGuid(), UserId = owner.UserId, Title = "Needle" });
            for (var index = 0; index < 180; index++) db.Tasks.Add(new TaskItem { Id = Guid.NewGuid(), UserId = owner.UserId, Title = "Needle task " + index, UpdatedAtUtc = DateTimeOffset.UtcNow });
            await db.SaveChangesAsync();
        }
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        var matches = await Items(client, "needle");
        Assert.Equal("Needle", matches[0].GetProperty("title").GetString());
        Assert.InRange(matches.Length, 1, 20);
        Assert.InRange((await Items(client, "")).Length, 1, 20);
    }

    private static async Task<JsonElement[]> Items(HttpClient client, string query)
    {
        var result = await client.GetFromJsonAsync<JsonElement>("/api/v1/search?q=" + Uri.EscapeDataString(query));
        return result.GetProperty("items").EnumerateArray().ToArray();
    }
    private static async Task SignIn(HttpClient client, string email, string password)
    {
        using var response = await Send(client, HttpMethod.Post, "/api/v1/auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
    private static async Task<HttpResponseMessage> Send(HttpClient client, HttpMethod method, string path, object body)
    {
        var csrf = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf");
        using var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-CSRF-TOKEN", csrf.GetProperty("requestToken").GetString());
        return await client.SendAsync(request);
    }
}
