using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Lifemaxing.Api.Features.System;
using Xunit;

namespace Lifemaxing.Api.Tests;

public sealed class FoundationTests
{
    private static WebApplicationFactory<Program> CreateApplication(string connectionString = "") =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?> { ["ConnectionStrings:Database"] = connectionString }));
        });

    [Fact]
    public async Task LivenessDoesNotDependOnDatabase()
    {
        await using var application = CreateApplication();
        using var client = application.CreateClient();
        using var response = await client.GetAsync("/health/live");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("alive", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task MissingDatabaseConfigurationIsReportedHonestly()
    {
        await using var application = CreateApplication();
        using var client = application.CreateClient();
        var status = await client.GetFromJsonAsync<SystemStatusResponse>("/api/v1/system/status");
        Assert.Equal(new SystemStatusResponse("available", "not_configured"), status);
    }

    [Theory]
    [InlineData("/api/v1/missing")]
    [InlineData("/api/v1/missing.json")]
    [InlineData("/health/missing")]
    [InlineData("/api")]
    public async Task UnknownServiceRoutesReturnProblemDetails(string path)
    {
        await using var application = CreateApplication();
        using var client = application.CreateClient();
        using var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(404, problem?.Status);
        Assert.True(problem?.Extensions.ContainsKey("code"));
    }

    [Fact]
    public async Task UnreachableDatabaseReturnsSafeProblemDetailsWhileLivenessWorks()
    {
        await using var application = CreateApplication("Host=127.0.0.1;Port=1;Database=fictional;Username=fictional;Timeout=1");
        using var client = application.CreateClient();
        using var response = await client.GetAsync("/api/v1/system/status");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("database_unavailable", body);
        Assert.DoesNotContain("fictional", body);
        Assert.DoesNotContain("127.0.0.1", body);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/live")).StatusCode);
    }
}
