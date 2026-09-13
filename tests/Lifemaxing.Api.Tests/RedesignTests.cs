using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class RedesignTests(TestDatabaseFixture database)
{
    [Fact]
    public async Task PreferencesAreIndependentValidatedPersistedAndOwnerScoped()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "preferences");
        var other = await database.CreateOwnerAsync(app, "other-preferences");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        var original = await client.GetFromJsonAsync<JsonElement>("/api/v1/settings");
        using var missingCsrf = await client.PatchAsJsonAsync("/api/v1/settings", new { theme = "dark" });
        Assert.Equal(HttpStatusCode.BadRequest, missingCsrf.StatusCode);
        using var changed = await Send(client, HttpMethod.Patch, "/api/v1/settings", new { uiLanguage = "sv", theme = "dark", density = "compact", userId = other.UserId });
        Assert.Equal(HttpStatusCode.OK, changed.StatusCode);
        using var invalid = await Send(client, HttpMethod.Patch, "/api/v1/settings", new { uiLanguage = "xx", theme = "bright", density = "tiny" });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        using var region = await Send(client, HttpMethod.Patch, "/api/v1/settings", new { locale = "da-DK" });
        Assert.Equal(HttpStatusCode.OK, region.StatusCode);
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var saved = await db.UserSettings.AsNoTracking().SingleAsync(value => value.UserId == owner.UserId);
        Assert.Equal("sv", saved.UiLanguage);
        Assert.Equal("dark", saved.Theme);
        Assert.Equal("compact", saved.Density);
        Assert.Equal("da-DK", saved.Locale);
        Assert.Equal(original.GetProperty("timeZoneId").GetString(), saved.TimeZoneId);
        var untouched = await db.UserSettings.AsNoTracking().SingleAsync(value => value.UserId == other.UserId);
        Assert.Equal("system", untouched.Theme);
        Assert.Equal("normal", untouched.Density);
        Assert.Equal("nb-NO", untouched.Locale);
    }

    [Fact]
    public async Task AreaCountsIncludeAllPagesAndExcludeForeignArchivedAndCompletedWork()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "counts");
        var other = await database.CreateOwnerAsync(app, "foreign-counts");
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            for (var index = 0; index < 57; index++) db.Tasks.Add(new TaskItem
            {
                Id = Guid.NewGuid(), UserId = owner.UserId, LifeAreaId = owner.AreaId, Title = "Fictional action " + index,
                CreatedAtUtc = DateTimeOffset.UtcNow, UpdatedAtUtc = DateTimeOffset.UtcNow
            });
            db.Tasks.Add(new TaskItem { Id = Guid.NewGuid(), UserId = owner.UserId, LifeAreaId = owner.AreaId,
                Title = "Archived action", DeletedAtUtc = DateTimeOffset.UtcNow });
            db.Tasks.Add(new TaskItem { Id = Guid.NewGuid(), UserId = other.UserId, LifeAreaId = other.AreaId, Title = "Foreign action" });
            await db.SaveChangesAsync();
        }
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        var rows = await client.GetFromJsonAsync<JsonElement[]>("/api/v1/areas/counts");
        Assert.Single(rows!);
        Assert.Equal(owner.AreaId, rows![0].GetProperty("id").GetGuid());
        Assert.Equal(57, rows[0].GetProperty("tasks").GetInt32());
        var tasks = await client.GetFromJsonAsync<JsonElement>("/api/v1/tasks");
        var id = tasks.GetProperty("items")[0].GetProperty("id").GetGuid();
        using var completed = await Send(client, HttpMethod.Post, $"/api/v1/tasks/{id}/complete", new { });
        Assert.Equal(HttpStatusCode.OK, completed.StatusCode);
        rows = await client.GetFromJsonAsync<JsonElement[]>("/api/v1/areas/counts");
        Assert.Equal(56, rows![0].GetProperty("tasks").GetInt32());
    }

    [Fact]
    public async Task WeekPreservesFlexibleSchedulesRestFutureAndCorrectedLogs()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "week");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        var today = await client.GetFromJsonAsync<JsonElement>("/api/v1/today");
        var date = DateOnly.Parse(today.GetProperty("currentLocalDate").GetString()!);
        using var created = await Send(client, HttpMethod.Post, "/api/v1/habits", new
        {
            title = "Flexible fictional routine", schedule = new { effectiveFromDate = date, pattern = "WeeklyCount", weeklyTarget = 2 }
        });
        var habit = await created.Content.ReadFromJsonAsync<JsonElement>();
        var id = habit.GetProperty("id").GetGuid();
        using var logged = await Send(client, HttpMethod.Post, $"/api/v1/habits/{id}/logs", new { localDate = date });
        var log = await logged.Content.ReadFromJsonAsync<JsonElement>();
        using var reversed = await Send(client, HttpMethod.Post, $"/api/v1/habits/{id}/logs/{log.GetProperty("id").GetGuid()}/revoke", new { });
        Assert.Equal(HttpStatusCode.OK, reversed.StatusCode);
        var week = await client.GetFromJsonAsync<JsonElement>("/api/v1/habits/week");
        var days = week.GetProperty("items")[0].GetProperty("days").EnumerateArray().ToArray();
        Assert.Equal(7, days.Length);
        Assert.Equal("corrected", days.Single(day => day.GetProperty("localDate").GetString() == date.ToString("yyyy-MM-dd")).GetProperty("state").GetString());
        Assert.All(days.Where(day => DateOnly.Parse(day.GetProperty("localDate").GetString()!) < date), day => Assert.Equal("notPlanned", day.GetProperty("state").GetString()));
        Assert.All(days.Where(day => DateOnly.Parse(day.GetProperty("localDate").GetString()!) > date), day => Assert.Equal("future", day.GetProperty("state").GetString()));
        var filtered = await client.GetFromJsonAsync<JsonElement>($"/api/v1/habits/week?areaId={Guid.NewGuid()}");
        Assert.Equal(0, filtered.GetProperty("total").GetInt32());
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
        request.Headers.Add("ClientActionId", Guid.NewGuid().ToString());
        return await client.SendAsync(request);
    }
}
