using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Lifemaxing.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class AccountLifecycleTests(TestDatabaseFixture database) : IDisposable
{
    private const string Password = "fictional mountain lantern river";
    private readonly string mailbox = Path.Combine(Path.GetTempPath(), "lifemaxing-account-tests", Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(mailbox)) Directory.Delete(mailbox, recursive: true);
    }

    private WebApplicationFactory<Program> Application(string provider = "Disabled") =>
        database.CreateApplication().WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AllowedHosts"] = "localhost;accounts.example.test",
                ["Authentication:Accounts:PublicOrigin"] = "https://accounts.example.test",
                ["Authentication:Accounts:Email:Provider"] = provider,
                ["Authentication:Accounts:Email:MailboxDirectory"] = mailbox,
                ["Authentication:Google:ClientId"] = "",
                ["Authentication:Google:ClientSecret"] = ""
            })));

    private static async Task<HttpResponseMessage> Post(HttpClient client, string path, object body)
    {
        var token = (await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf")).GetProperty("requestToken").GetString();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/" + path) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-CSRF-TOKEN", token);
        return await client.SendAsync(request);
    }

    [Fact]
    public async Task UnconfiguredDeliveryRejectsRegistrationAndRecoveryHonestly()
    {
        await using var app = Application();
        using var client = app.CreateClient();
        foreach (var path in new[] { "register", "forgot-password", "resend-verification" })
        {
            var response = await Post(client, path, new { email = "unavailable@example.test", password = Password });
            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
            Assert.Contains("email_unavailable", await response.Content.ReadAsStringAsync());
        }
        await using var scope = app.Services.CreateAsyncScope();
        Assert.Null(await scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>().FindByEmailAsync("unavailable@example.test"));
        var providers = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/providers");
        Assert.False(providers.GetProperty("googleEnabled").GetBoolean());
        Assert.False(providers.GetProperty("appleEnabled").GetBoolean());
    }

    [Theory]
    [InlineData("Production", "https://accounts.example.test")]
    [InlineData("Development", "http://accounts.example.test")]
    [InlineData("Development", "https://accounts.example.test/untrusted-path")]
    public async Task DevelopmentMailboxCannotEnableDeliveryOutsideDevelopmentOrWithoutTrustedOrigin(string environment, string origin)
    {
        await using var app = Application("Development").WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Authentication:Accounts:PublicOrigin"] = origin
            }));
        });
        using var client = app.CreateClient();
        var providers = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/providers");
        Assert.False(providers.GetProperty("emailAvailable").GetBoolean());
        Assert.Equal("disabled", providers.GetProperty("emailDelivery").GetString());
        Assert.False(Directory.Exists(mailbox));
    }

    [Fact]
    public async Task EveryPublicAccountMutationRequiresCsrf()
    {
        await using var app = Application();
        using var client = app.CreateClient();
        foreach (var path in new[] { "register", "forgot-password", "resend-verification", "confirm-email", "reset-password", "external/google" })
        {
            var response = await client.PostAsJsonAsync("/api/v1/auth/" + path,
                new { email = "csrf@example.test", password = Password, userId = Guid.NewGuid(), token = "invalid" });
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains("csrf_validation_failed", await response.Content.ReadAsStringAsync());
        }
    }

    [Fact]
    public async Task RegistrationCreatesWorkspaceAndRequiresDeliberateConfirmation()
    {
        await using var app = Application("Development");
        using var client = app.CreateClient();
        var email = $"signup-{Guid.NewGuid():N}@example.test";
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "register", new { email, password = "short" })).StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, (await Post(client, "register", new { email, password = Password })).StatusCode);
        var message = JsonDocument.Parse(await File.ReadAllTextAsync(Directory.GetFiles(mailbox).Single())).RootElement;
        var link = new Uri(message.GetProperty("Link").GetString()!);
        Assert.Equal("accounts.example.test", link.Host);
        Assert.Equal("/verify-email", link.AbsolutePath);
        Assert.Empty(link.Query);
        Assert.Contains("token=", link.Fragment);
        Assert.Equal(HttpStatusCode.Conflict, (await Post(client, "register", new { email, password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(client, "login", new { email, password = Password })).StatusCode);
        await using var scope = app.Services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = (await users.FindByEmailAsync(email))!;
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(user.EmailConfirmed);
        Assert.Equal(10, await db.LifeAreas.CountAsync(area => area.UserId == user.Id));
        Assert.Equal("UTC", (await db.UserSettings.SingleAsync(settings => settings.UserId == user.Id)).TimeZoneId);
        var token = await users.GenerateEmailConfirmationTokenAsync(user);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "reset-password", new { userId = user.Id, token, password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "confirm-email", new { userId = user.Id, token })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "confirm-email", new { userId = user.Id, token })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "login", new { email, password = Password })).StatusCode);
    }

    [Fact]
    public async Task ResetIsAccountBoundSingleUseAndEnforcesPasswordPolicy()
    {
        await using var app = Application("Development");
        var owner = await database.CreateOwnerAsync(app, "reset-api");
        var other = await database.CreateOwnerAsync(app, "reset-other");
        using var client = app.CreateClient();
        await using var scope = app.Services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = (await users.FindByIdAsync(owner.UserId.ToString()))!;
        var token = await users.GeneratePasswordResetTokenAsync(user);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "reset-password", new { userId = other.UserId, token, password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "reset-password", new { userId = user.Id, token, password = "short" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "reset-password", new { userId = user.Id, token, password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "reset-password", new { userId = user.Id, token, password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(client, "login", new { owner.Email, owner.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "login", new { owner.Email, password = Password })).StatusCode);
    }

    [Fact]
    public async Task ChangeRequiresCurrentPasswordAndRevokesBothBrowserSessions()
    {
        await using var app = Application().WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.Configure<SecurityStampValidatorOptions>(options => options.ValidationInterval = TimeSpan.Zero)));
        var owner = await database.CreateOwnerAsync(app, "change-api");
        using var first = app.CreateClient();
        using var second = app.CreateClient();
        await Post(first, "login", new { owner.Email, owner.Password });
        await Post(second, "login", new { owner.Email, owner.Password });
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(first, "change-password", new { currentPassword = "wrong", password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(first, "change-password", new { currentPassword = owner.Password, password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await first.GetAsync("/api/v1/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await second.GetAsync("/api/v1/auth/me")).StatusCode);
    }

    [Fact]
    public async Task ExpiredTokensAreRejected()
    {
        await using var app = Application().WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.Configure<DataProtectionTokenProviderOptions>(options => options.TokenLifespan = TimeSpan.FromSeconds(-1))));
        var owner = await database.CreateOwnerAsync(app, "expired-api");
        await using var scope = app.Services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = (await users.FindByIdAsync(owner.UserId.ToString()))!;
        var token = await users.GeneratePasswordResetTokenAsync(user);
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "reset-password", new { userId = user.Id, token, password = Password })).StatusCode);
    }

    [Fact]
    public async Task FailedEmailProviderKeepsRecoveryNeutralAndRegistrationHonest()
    {
        await using var app = Application("Resend").WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Authentication:Accounts:Email:ApiKey"] = "fictional-test-only-key",
                ["Authentication:Accounts:Email:From"] = "test@example.test"
            }));
            builder.ConfigureServices(services => services.AddHttpClient("AccountEmail")
                .ConfigurePrimaryHttpMessageHandler(() => new UnavailableEmailHandler()));
        });
        var owner = await database.CreateOwnerAsync(app, "neutral-reset");
        using var client = app.CreateClient();
        var known = await Post(client, "forgot-password", new { owner.Email });
        var unknown = await Post(client, "forgot-password", new { email = "unknown@example.test" });
        Assert.Equal(HttpStatusCode.Accepted, known.StatusCode);
        Assert.Equal(known.StatusCode, unknown.StatusCode);
        Assert.Equal(await known.Content.ReadAsStringAsync(), await unknown.Content.ReadAsStringAsync());
        var email = $"failed-send-{Guid.NewGuid():N}@example.test";
        var registered = await Post(client, "register", new { email, password = Password });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, registered.StatusCode);
        Assert.Contains("email_delivery_failed", await registered.Content.ReadAsStringAsync());
        var resend = await Post(client, "resend-verification", new { email });
        Assert.Equal(HttpStatusCode.Accepted, resend.StatusCode);
        Assert.Equal(await unknown.Content.ReadAsStringAsync(), await resend.Content.ReadAsStringAsync());
        await using var scope = app.Services.CreateAsyncScope();
        var user = await scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>().FindByEmailAsync(email);
        Assert.NotNull(user);
        Assert.False(user.EmailConfirmed);
    }

    [Theory]
    [InlineData(true, false, "/login?external=complete")]
    [InlineData(false, false, "/login?error=external_login_failed")]
    [InlineData(true, true, "/login?error=external_account_exists")]
    public async Task GoogleRequiresVerifiedEmailAndNeverAutoLinksExistingAccounts(bool verified, bool existing, string destination)
    {
        var email = $"google-{Guid.NewGuid():N}@example.test";
        await using var app = Application().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Authentication:Accounts:PublicOrigin", "https://accounts.example.test");
            builder.UseSetting("Authentication:Google:ClientId", "fictional-client");
            builder.UseSetting("Authentication:Google:ClientSecret", "fictional-secret");
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Authentication:Google:ClientId"] = "fictional-client",
                ["Authentication:Google:ClientSecret"] = "fictional-secret"
            }));
            builder.ConfigureServices(services => services.Configure<GoogleOptions>("Google", options =>
                options.Backchannel = new HttpClient(new GoogleBackchannel(email, verified))));
        });
        if (existing)
        {
            await using var scope = app.Services.CreateAsyncScope();
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            Assert.True((await users.CreateAsync(new AppUser { Id = Guid.NewGuid(), UserName = email, Email = email, EmailConfirmed = true }, Password)).Succeeded);
        }
        using var client = app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false, BaseAddress = new Uri("https://accounts.example.test") });
        var challenge = await Post(client, "external/google", new { });
        Assert.Equal(HttpStatusCode.Redirect, challenge.StatusCode);
        var query = QueryHelpers.ParseQuery(challenge.Headers.Location!.Query);
        Assert.Equal("https://accounts.example.test/api/v1/auth/external/google/complete", query["redirect_uri"].ToString());
        var callback = await client.GetAsync("/api/v1/auth/external/google/complete?code=fictional-code&state=" + Uri.EscapeDataString(query["state"].ToString()));
        Assert.Equal(HttpStatusCode.Redirect, callback.StatusCode);
        var finish = await client.GetAsync(callback.Headers.Location);
        Assert.Equal(destination, finish.Headers.Location?.ToString());
        await using var finalScope = app.Services.CreateAsyncScope();
        var db = finalScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.SingleOrDefaultAsync(user => user.Email == email);
        if (verified && !existing)
        {
            Assert.NotNull(user);
            Assert.Equal(10, await db.LifeAreas.CountAsync(area => area.UserId == user.Id));
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
            Assert.Single(await db.UserLogins.Where(login => login.UserId == user.Id).ToListAsync());
        }
        else
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
            if (existing) Assert.Empty(await db.UserLogins.Where(login => login.UserId == user!.Id).ToListAsync());
            else Assert.Null(user);
        }
    }

    private sealed class UnavailableEmailHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
    }

    private sealed class GoogleBackchannel(string email, bool verified) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = request.RequestUri!.AbsolutePath.Contains("token")
                    ? JsonContent.Create(new { access_token = "fictional-access-token", token_type = "Bearer", expires_in = 3600 })
                    : JsonContent.Create(new { sub = "fictional-provider-" + email, email, email_verified = verified, name = "Fictional User" })
            });
    }
}
