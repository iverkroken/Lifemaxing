using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class DevelopmentAccessTests(TestDatabaseFixture database)
{
    [Theory]
    [InlineData("Development", true, true, true)]
    [InlineData("Development", false, true, false)]
    [InlineData("Development", true, false, false)]
    [InlineData("Production", true, true, false)]
    [InlineData("Staging", true, true, false)]
    public async Task OnlyExplicitDevelopmentAccountIsExempt(string environment, bool enabled, bool matches, bool exempt)
    {
        await using var app = database.CreateApplication().WithWebHostBuilder(builder => builder.UseEnvironment(environment));
        var owner = await database.CreateOwnerAsync(app, "local-access");
        var configuration = app.Services.GetRequiredService<IConfiguration>();
        configuration["DevelopmentAccess:Email"] = matches ? owner.Email : "another-fictional-account@example.test";
        configuration["DevelopmentAccess:DisableAccountLockout"] = enabled.ToString();
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            var user = (await users.FindByIdAsync(owner.UserId.ToString()))!;
            Assert.True((await users.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddMinutes(5))).Succeeded);
            await users.AccessFailedAsync(user);
        }
        using var client = app.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        for (var attempt = 0; attempt < 6; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await Login(client, owner.Email, "incorrect fictional input")).StatusCode);
        using var login = await Login(client, owner.Email, owner.Password);
        Assert.Equal(exempt ? HttpStatusCode.NoContent : HttpStatusCode.Unauthorized, login.StatusCode);
        await using var check = app.Services.CreateAsyncScope();
        var manager = check.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var saved = (await manager.FindByIdAsync(owner.UserId.ToString()))!;
        Assert.True(saved.LockoutEnabled); // Never weakens the database account for other environments.
        Assert.Equal(!exempt, await manager.IsLockedOutAsync(saved));
        if (exempt)
        {
            Assert.Null(saved.LockoutEnd);
            Assert.Equal(0, saved.AccessFailedCount);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
        }
    }

    [Fact]
    public async Task DisabledExemptionStillLocksAfterFiveFailures()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "normal-lockout");
        var configuration = app.Services.GetRequiredService<IConfiguration>();
        configuration["DevelopmentAccess:Email"] = owner.Email;
        configuration["DevelopmentAccess:DisableAccountLockout"] = "false";
        using var client = app.CreateClient();
        for (var attempt = 0; attempt < 5; attempt++) await Login(client, owner.Email, "incorrect fictional input");
        Assert.Equal(HttpStatusCode.Unauthorized, (await Login(client, owner.Email, owner.Password)).StatusCode);
    }

    [Fact]
    public async Task RemovingRecoveryConfigurationPreservesLoginAndRestoresLockout()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "recovery-closed");
        var configuration = app.Services.GetRequiredService<IConfiguration>();
        configuration["DevelopmentAccess:Email"] = owner.Email;
        configuration["DevelopmentAccess:DisableAccountLockout"] = "true";
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            var user = (await users.FindByIdAsync(owner.UserId.ToString()))!;
            Assert.True((await users.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddMinutes(5))).Succeeded);
        }
        using (var recovery = app.CreateClient())
            Assert.Equal(HttpStatusCode.NoContent, (await Login(recovery, owner.Email, owner.Password)).StatusCode);

        configuration["DevelopmentAccess:Email"] = null;
        configuration["DevelopmentAccess:DisableAccountLockout"] = null;
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.NoContent, (await Login(client, owner.Email, owner.Password)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
        for (var attempt = 0; attempt < 5; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await Login(client, owner.Email, "incorrect fictional input")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Login(client, owner.Email, owner.Password)).StatusCode);
        await using var check = app.Services.CreateAsyncScope();
        var manager = check.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var saved = (await manager.FindByIdAsync(owner.UserId.ToString()))!;
        Assert.True(saved.LockoutEnabled);
        Assert.True(await manager.IsLockedOutAsync(saved));
    }

    private static async Task<HttpResponseMessage> Login(HttpClient client, string email, string password)
    {
        var csrf = (await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/csrf")).GetProperty("requestToken").GetString();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login") { Content = JsonContent.Create(new { email, password }) };
        request.Headers.Add("X-CSRF-TOKEN", csrf);
        return await client.SendAsync(request);
    }
}
