using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Auth;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Xunit;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class AuthUsabilityTests(TestDatabaseFixture database)
{
    private sealed class Clock : TimeProvider
    {
        private DateTimeOffset now = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => now;
        public void Advance(TimeSpan duration) => now += duration;
    }

    private WebApplicationFactory<Program> Application(Clock clock) => database.CreateApplication().WithWebHostBuilder(builder =>
        builder.ConfigureServices(services =>
        {
            services.Configure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme, options => options.TimeProvider = clock);
            services.Configure<SecurityStampValidatorOptions>(options => options.TimeProvider = clock);
        }));

    private static async Task<HttpResponseMessage> Post(HttpClient client, string path, object body)
    {
        var token = (await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf")).GetProperty("requestToken").GetString();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/" + path) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-CSRF-TOKEN", token);
        return await client.SendAsync(request);
    }

    [Theory]
    [InlineData(false, 12)]
    [InlineData(true, 720)]
    public async Task SessionChoiceHasAbsoluteExpiryIncludingStampRenewal(bool rememberMe, int hours)
    {
        var clock = new Clock();
        await using var app = Application(clock);
        var owner = await database.CreateOwnerAsync(app, "expiry");
        using var client = app.CreateClient();
        using var login = await Post(client, "login", new { owner.Email, owner.Password, rememberMe });
        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);
        var cookie = login.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("Lifemaxing.Auth="));
        Assert.Contains("httponly", cookie);
        Assert.Contains("samesite=strict", cookie);
        Assert.Equal(rememberMe, cookie.Contains("expires="));
        var options = app.Services.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>().Get(IdentityConstants.ApplicationScheme);
        var ticket = options.TicketDataFormat.Unprotect(cookie.Split(';')[0]["Lifemaxing.Auth=".Length..])!;
        Assert.Equal(TimeSpan.FromHours(hours), ticket.Properties.ExpiresUtc - ticket.Properties.IssuedUtc);
        clock.Advance(TimeSpan.FromMinutes(2));
        using var refreshed = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, refreshed.StatusCode);
        var refreshedCookie = refreshed.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("Lifemaxing.Auth="));
        var refreshedTicket = options.TicketDataFormat.Unprotect(refreshedCookie.Split(';')[0]["Lifemaxing.Auth=".Length..])!;
        Assert.Equal(ticket.Properties.ExpiresUtc, refreshedTicket.Properties.ExpiresUtc);
        clock.Advance(TimeSpan.FromHours(hours) - TimeSpan.FromMinutes(2) - TimeSpan.FromSeconds(2));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
        clock.Advance(TimeSpan.FromSeconds(3));
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
    }

    [Fact]
    public async Task PasswordSelectionAllowsUnicodeSpacesAndUsesSameRulesForCreateChangeAndReset()
    {
        await using var app = database.CreateApplication();
        await using var scope = app.Services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = new AppUser { UserName = $"phrase-{Guid.NewGuid():N}@example.test" };
        user.Email = user.UserName;
        var shortResult = await users.CreateAsync(user, "too short");
        Assert.False(shortResult.Succeeded);
        Assert.False((await users.CreateAsync(user, new string('a', 129))).Succeeded);
        // Known long entry from the pinned public list; not an application credential.
        using var resource = typeof(PasswordPolicy).Assembly.GetManifestResourceStream("Lifemaxing.Api.Features.Auth.common-passwords.txt")!;
        using var reader = new StreamReader(resource);
        var common = (await reader.ReadToEndAsync()).Split('\n').Select(line => line.TrimEnd('\r')).First(line => line.Length >= 15);
        Assert.Contains((await users.CreateAsync(user, common)).Errors, error => error.Code == "PasswordCommon");
        const string phrase = "  fjell skog blåbær kveld  ";
        Assert.True((await users.CreateAsync(user, phrase)).Succeeded);
        Assert.True(await users.CheckPasswordAsync(user, phrase));
        Assert.False(await users.CheckPasswordAsync(user, phrase.Trim()));
        Assert.False((await users.ChangePasswordAsync(user, phrase, "too short")).Succeeded);
        Assert.True((await users.ChangePasswordAsync(user, phrase, new string('å', 128))).Succeeded);
        var token = await users.GeneratePasswordResetTokenAsync(user);
        Assert.Contains((await users.ResetPasswordAsync(user, token, common)).Errors, error => error.Code == "PasswordCommon");
        Assert.False((await users.ResetPasswordAsync(user, token, string.Concat(Enumerable.Repeat("😀", 14)))).Succeeded);
        Assert.True((await users.ResetPasswordAsync(user, token, string.Concat(Enumerable.Repeat("😀", 15)))).Succeeded);
    }

    [Fact]
    public async Task ExistingShortPasswordStillSignsInWithoutBeingRevalidated()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "legacy");
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            var user = (await users.FindByIdAsync(owner.UserId.ToString()))!;
            user.PasswordHash = users.PasswordHasher.HashPassword(user, "Old!Pass12345");
            Assert.True((await users.UpdateAsync(user)).Succeeded);
        }
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "login", new { owner.Email, Password = "Old!Pass12345" })).StatusCode);
    }

    [Fact]
    public async Task RecoveryPreservesAccountAndDataUnlocksAndRevokesOldCookiesWithinOneMinute()
    {
        var clock = new Clock();
        await using var app = Application(clock);
        var owner = await database.CreateOwnerAsync(app, "recovery");
        var taskId = Guid.NewGuid();
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "login", new { owner.Email, owner.Password, RememberMe = true })).StatusCode);
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var fixtureDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            fixtureDb.Tasks.Add(new Lifemaxing.Api.Features.Tasks.TaskItem { Id = taskId, UserId = owner.UserId,
                LifeAreaId = owner.AreaId, Title = "Fictional recovery fixture", CreatedAtUtc = clock.GetUtcNow(), UpdatedAtUtc = clock.GetUtcNow() });
            await fixtureDb.SaveChangesAsync();
        }
        var csrf = (await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf")).GetProperty("requestToken").GetString();
        using var complete = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/tasks/{taskId}/complete") { Content = JsonContent.Create(new { }) };
        complete.Headers.Add("X-CSRF-TOKEN", csrf);
        complete.Headers.Add("ClientActionId", Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(complete)).StatusCode);
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            var user = (await users.FindByIdAsync(owner.UserId.ToString()))!;
            await users.SetLockoutEndDateAsync(user, clock.GetUtcNow().AddMinutes(5));
        }
        const string phrase = "winter birch quiet meadow";
        var environment = app.Services.GetRequiredService<IHostEnvironment>();
        Assert.False((await OwnerPasswordRecovery.ResetAsync(app.Services, environment, owner.Email, "too short")).Succeeded);
        Assert.True((await OwnerPasswordRecovery.ResetAsync(app.Services, environment, owner.Email, phrase)).Succeeded);
        clock.Advance(TimeSpan.FromSeconds(59));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
        clock.Advance(TimeSpan.FromSeconds(2));
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(client, "login", new { owner.Email, owner.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "login", new { owner.Email, Password = phrase })).StatusCode);
        var me = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/me");
        Assert.Equal(owner.UserId, me.GetProperty("id").GetGuid());
        await using var check = app.Services.CreateAsyncScope();
        var db = check.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.True(await db.LifeAreas.AnyAsync(area => area.Id == owner.AreaId && area.UserId == owner.UserId));
        Assert.True(await db.UserSettings.AnyAsync(settings => settings.UserId == owner.UserId));
        Assert.True(await db.Tasks.AnyAsync(task => task.Id == taskId && task.UserId == owner.UserId));
        Assert.Single(await db.TaskCompletions.Where(item => item.UserId == owner.UserId).ToListAsync());
        Assert.Equal(25, await db.XpEntries.Where(item => item.UserId == owner.UserId).SumAsync(item => item.AmountSigned));
        Assert.Single(await db.ActivityEvents.Where(item => item.UserId == owner.UserId).ToListAsync());
        Assert.Single(await db.CommandReceipts.Where(item => item.UserId == owner.UserId).ToListAsync());
        var manager = check.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        Assert.False(await manager.IsLockedOutAsync((await manager.FindByIdAsync(owner.UserId.ToString()))!));
    }

    [Fact]
    public async Task LogoutEverywhereRequiresCsrfAndRevokesAnotherDeviceButOrdinaryLogoutDoesNot()
    {
        var clock = new Clock();
        await using var app = Application(clock);
        var owner = await database.CreateOwnerAsync(app, "devices");
        using var first = app.CreateClient();
        using var second = app.CreateClient();
        Assert.Equal(HttpStatusCode.NoContent, (await Post(first, "login", new { owner.Email, owner.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(second, "login", new { owner.Email, owner.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await first.PostAsJsonAsync("/api/v1/auth/logout-everywhere", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(first, "logout", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await second.GetAsync("/api/v1/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(first, "login", new { owner.Email, owner.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(first, "logout-everywhere", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await first.GetAsync("/api/v1/auth/me")).StatusCode);
        clock.Advance(TimeSpan.FromSeconds(61));
        Assert.Equal(HttpStatusCode.Unauthorized, (await second.GetAsync("/api/v1/auth/me")).StatusCode);
    }

    [Fact]
    public async Task RecoveryRefusesProductionAndNonInteractiveInvocation()
    {
        await using var app = database.CreateApplication();
        var production = new Microsoft.Extensions.Hosting.Internal.HostingEnvironment { EnvironmentName = "Production" };
        Assert.Equal(1, await OwnerPasswordRecovery.RunAsync(app.Services, production, ["--reset-owner-password"]));
        Assert.False((await OwnerPasswordRecovery.ResetAsync(app.Services, production, "fictional@example.test", "fictional phrase only")).Succeeded);
        Assert.Equal(1, await OwnerPasswordRecovery.RunAsync(app.Services, app.Services.GetRequiredService<IHostEnvironment>(), ["--reset-owner-password", "--extra"]));
    }

    [Fact]
    public async Task ProductionUsesSecureHostCookiesAndProtectsLogoutEverywhereWithCsrf()
    {
        await using var app = database.CreateApplication().WithWebHostBuilder(builder => builder.UseEnvironment("Production"));
        var owner = await database.CreateOwnerAsync(app, "secure");
        using var client = app.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        using var response = await Post(client, "login", new { owner.Email, owner.Password, RememberMe = true });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var cookie = response.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("__Host-Lifemaxing.Auth="));
        Assert.Contains("; secure", cookie);
        Assert.Contains("; httponly", cookie);
        Assert.Contains("; path=/", cookie);
        Assert.Contains("; samesite=strict", cookie);
        Assert.DoesNotContain("domain=", cookie);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/auth/logout-everywhere", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
    }
}
