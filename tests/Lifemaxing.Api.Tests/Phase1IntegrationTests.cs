using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Lifemaxing.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Xunit;

namespace Lifemaxing.Api.Tests;

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class DatabaseCollection : ICollectionFixture<TestDatabaseFixture>
{
    public const string Name = "Phase 1 database";
}

public sealed class TestDatabaseFixture : IAsyncLifetime
{
    private string? _adminConnectionString;
    public string? ConnectionString { get; private set; }

    public async Task InitializeAsync()
    {
        var configuredConnection = Environment.GetEnvironmentVariable("LIFEMAXING_TEST_CONNECTION")
            ?? new ConfigurationBuilder().AddUserSecrets<Program>(optional: true).Build().GetConnectionString("Database");
        if (string.IsNullOrWhiteSpace(configuredConnection))
        {
            throw new InvalidOperationException(
                "Configure the API Database connection in User Secrets or set LIFEMAXING_TEST_CONNECTION before running integration tests.");
        }

        var databaseName = $"lifemaxing_phase1_{Guid.NewGuid():N}";
        var applicationBuilder = new NpgsqlConnectionStringBuilder(configuredConnection) { Database = databaseName };
        var adminBuilder = new NpgsqlConnectionStringBuilder(configuredConnection) { Database = "postgres" };
        ConnectionString = applicationBuilder.ConnectionString;
        _adminConnectionString = adminBuilder.ConnectionString;

        await using (var admin = new NpgsqlConnection(_adminConnectionString))
        {
            await admin.OpenAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE \"{databaseName}\"", admin);
            await create.ExecuteNonQueryAsync();
        }

        await using var application = CreateApplication();
        await using var scope = application.Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        if (ConnectionString is null || _adminConnectionString is null) return;
        var databaseName = new NpgsqlConnectionStringBuilder(ConnectionString).Database;
        await using var admin = new NpgsqlConnection(_adminConnectionString);
        await admin.OpenAsync();
        await using var terminate = new NpgsqlCommand(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = @database AND pid <> pg_backend_pid();", admin);
        terminate.Parameters.AddWithValue("database", databaseName!);
        await terminate.ExecuteNonQueryAsync();
        await using var drop = new NpgsqlCommand($"DROP DATABASE \"{databaseName}\"", admin);
        await drop.ExecuteNonQueryAsync();
    }

    public WebApplicationFactory<Program> CreateApplication()
    {
        if (ConnectionString is null) throw new InvalidOperationException("The test database was not initialized.");
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?> { ["ConnectionStrings:Database"] = ConnectionString }));
        });
    }

    public async Task<(Guid UserId, Guid AreaId, string Email, string Password)> CreateOwnerAsync(
        WebApplicationFactory<Program> application, string prefix)
    {
        var email = $"{prefix}-{Guid.NewGuid():N}@example.test";
        const string password = "Phase1-Test!Password-739";
        await using var scope = application.Services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new AppUser { Id = Guid.NewGuid(), Email = email, UserName = email, EmailConfirmed = true };
        var result = await users.CreateAsync(user, password);
        Assert.True(result.Succeeded, string.Join(", ", result.Errors.Select(error => error.Code)));
        var area = new LifeArea
        {
            Id = Guid.NewGuid(), UserId = user.Id, Key = "personal", DisplayName = $"{prefix} Personal",
            IsActive = true, SortOrder = 0
        };
        db.UserSettings.Add(new UserSettings
        {
            UserId = user.Id, TimeZoneId = "Europe/Oslo", Locale = "nb-NO", CreatedAtUtc = DateTimeOffset.UtcNow
        });
        db.LifeAreas.Add(area);
        await db.SaveChangesAsync();
        return (user.Id, area.Id, email, password);
    }
}

[Collection(DatabaseCollection.Name)]
public sealed class Phase1IntegrationTests(TestDatabaseFixture database)
{
    [Fact]
    public async Task PrivateRoutesReturnJson401AndRegistrationDoesNotExist()
    {
        await using var application = database.CreateApplication();
        using var client = application.CreateClient();
        using var areas = await client.GetAsync("/api/v1/areas");
        Assert.Equal(HttpStatusCode.Unauthorized, areas.StatusCode);
        Assert.Equal("application/problem+json", areas.Content.Headers.ContentType?.MediaType);
        Assert.Contains("authentication_required", await areas.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/register", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/api/v1/auth/register", new { })).StatusCode);
    }

    [Fact]
    public async Task LoginRequiresCsrfAndAcceptsOnlyTheCorrectPassword()
    {
        await using var application = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(application, "login");
        using var client = application.CreateClient();
        using var missing = await client.PostAsJsonAsync("/api/v1/auth/login", new { owner.Email, Password = owner.Password });
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
        Assert.Contains("csrf_validation_failed", await missing.Content.ReadAsStringAsync());

        var token = await GetCsrfToken(client);
        using var wrongRequest = CreateJsonRequest(HttpMethod.Post, "/api/v1/auth/login",
            new { owner.Email, Password = "Wrong-Password!739" }, token);
        using var wrong = await client.SendAsync(wrongRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);

        using var rightRequest = CreateJsonRequest(HttpMethod.Post, "/api/v1/auth/login",
            new { owner.Email, Password = owner.Password }, token);
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(rightRequest)).StatusCode);
        var me = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/me");
        Assert.Equal(owner.UserId, me.GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task FiveBadPasswordsLockTheAccount()
    {
        await using var application = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(application, "locked");
        using var client = application.CreateClient();
        var token = await GetCsrfToken(client);
        HttpResponseMessage? last = null;
        for (var attempt = 0; attempt < 5; attempt++)
        {
            last?.Dispose();
            using var request = CreateJsonRequest(HttpMethod.Post, "/api/v1/auth/login",
                new { owner.Email, Password = "Wrong-Password!739" }, token);
            last = await client.SendAsync(request);
        }
        using (last)
        {
            Assert.Equal((HttpStatusCode)423, last!.StatusCode);
            Assert.Contains("account_locked", await last.Content.ReadAsStringAsync());
        }
    }

    [Fact]
    public async Task AuthenticatedOwnerCanReadAndUpdateOnlyOwnedDataThenLogout()
    {
        await using var application = database.CreateApplication();
        var ownerA = await database.CreateOwnerAsync(application, "owner-a");
        var ownerB = await database.CreateOwnerAsync(application, "owner-b");
        using var client = application.CreateClient();
        await SignIn(client, ownerA.Email, ownerA.Password);

        var areas = await client.GetFromJsonAsync<JsonElement[]>("/api/v1/areas");
        Assert.Single(areas!);
        Assert.Equal(ownerA.AreaId, areas![0].GetProperty("id").GetGuid());

        var token = await GetCsrfToken(client);
        using var foreignRequest = CreateJsonRequest(HttpMethod.Patch, $"/api/v1/areas/{ownerB.AreaId}",
            new { DisplayName = "Not allowed", IsActive = true, SortOrder = 1 }, token);
        Assert.Equal(HttpStatusCode.NotFound, (await client.SendAsync(foreignRequest)).StatusCode);

        using var ownRequest = CreateJsonRequest(HttpMethod.Patch, $"/api/v1/areas/{ownerA.AreaId}",
            new { DisplayName = "My private area", IsActive = false, SortOrder = 4 }, token);
        using var ownResponse = await client.SendAsync(ownRequest);
        Assert.Equal(HttpStatusCode.OK, ownResponse.StatusCode);
        Assert.Contains("My private area", await ownResponse.Content.ReadAsStringAsync());

        using var invalidSettings = CreateJsonRequest(HttpMethod.Patch, "/api/v1/settings",
            new { TimeZoneId = "Pacific Standard Time", Locale = "unknown" }, token);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.SendAsync(invalidSettings)).StatusCode);
        using var settingsRequest = CreateJsonRequest(HttpMethod.Patch, "/api/v1/settings",
            new { TimeZoneId = "Europe/Budapest", Locale = "hu-HU" }, token);
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(settingsRequest)).StatusCode);

        using var logoutRequest = CreateJsonRequest(HttpMethod.Post, "/api/v1/auth/logout", new { }, token);
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(logoutRequest)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
    }

    [Fact]
    public async Task WrongAndCrossOriginCsrfTokensAreRejected()
    {
        await using var application = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(application, "csrf");
        using var client = application.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        using var request = CreateJsonRequest(HttpMethod.Patch, $"/api/v1/areas/{owner.AreaId}",
            new { DisplayName = "Rejected", IsActive = true, SortOrder = 0 }, "wrong-token");
        request.Headers.Add("Origin", "https://attacker.example");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("csrf_validation_failed", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task LoginLimiterRejectsExcessAttempts()
    {
        await using var application = database.CreateApplication();
        using var client = application.CreateClient();
        var token = await GetCsrfToken(client);
        HttpResponseMessage? response = null;
        for (var attempt = 0; attempt < 11; attempt++)
        {
            response?.Dispose();
            using var request = CreateJsonRequest(HttpMethod.Post, "/api/v1/auth/login",
                new { Email = $"missing-{attempt}@example.test", Password = "Wrong-Password!739" }, token);
            response = await client.SendAsync(request);
        }
        using (response)
        {
            Assert.Equal(HttpStatusCode.TooManyRequests, response!.StatusCode);
            Assert.Contains("login_rate_limited", await response.Content.ReadAsStringAsync());
        }
    }

    private static async Task SignIn(HttpClient client, string email, string password)
    {
        var token = await GetCsrfToken(client);
        using var request = CreateJsonRequest(HttpMethod.Post, "/api/v1/auth/login", new { Email = email, Password = password }, token);
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(request)).StatusCode);
    }

    private static async Task<string> GetCsrfToken(HttpClient client)
    {
        var result = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf");
        return result.GetProperty("requestToken").GetString()!;
    }

    private static HttpRequestMessage CreateJsonRequest(HttpMethod method, string uri, object body, string token)
    {
        var request = new HttpRequestMessage(method, uri) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-CSRF-TOKEN", token);
        return request;
    }
}
