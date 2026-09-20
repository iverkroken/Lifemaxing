using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class SubscriptionTests(TestDatabaseFixture database)
{
    private const string Path = "/api/v1/finance/subscriptions";
    private static object Record(string name = "Fictional journal", decimal price = 12m,
        string currency = "EUR", string interval = "Monthly", string start = "2024-02-29", string next = "2026-01-01") =>
        new { name, category = "Reading", price, currency, billingInterval = interval, startDate = start, nextBillingDate = next, notes = "A fictional subscription." };

    [Fact]
    public async Task OwnedCrudRequiresCsrfAndCancellationRetainsIdentity()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "subscription-owner");
        var other = await database.CreateOwnerAsync(app, "subscription-other");
        using var client = app.CreateClient();
        using var stranger = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(Path)).StatusCode);
        await SignIn(client, owner.Email, owner.Password);
        await SignIn(stranger, other.Email, other.Password);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync(Path, Record())).StatusCode);
        using var created = await Send(client, HttpMethod.Post, Path, new { name = "Fictional journal", category = "Reading", price = 12m,
            currency = "EUR", billingInterval = "Monthly", startDate = "2024-02-29", nextBillingDate = "2026-01-01", userId = other.UserId });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var initial = await created.Content.ReadFromJsonAsync<JsonElement>();
        var id = initial.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"{Path}/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(stranger, HttpMethod.Put, $"{Path}/{id}", Record("Foreign edit"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(stranger, HttpMethod.Put, $"{Path}/{id}/status", new { status = "Cancelled" })).StatusCode);
        var foreign = await stranger.GetFromJsonAsync<JsonElement>(Path);
        Assert.Empty(foreign.GetProperty("items").EnumerateArray());
        Assert.Empty(foreign.GetProperty("totals").EnumerateArray());
        Assert.Equal(HttpStatusCode.OK, (await Send(client, HttpMethod.Put, $"{Path}/{id}", Record("Edited journal", 15))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Send(client, HttpMethod.Put, $"{Path}/{id}/status", new { status = "Cancelled" })).StatusCode);
        var active = await client.GetFromJsonAsync<JsonElement>(Path);
        Assert.Empty(active.GetProperty("items").EnumerateArray());
        Assert.Empty(active.GetProperty("totals").EnumerateArray());
        var cancelled = await client.GetFromJsonAsync<JsonElement>(Path + "?status=Cancelled");
        Assert.Equal(id, cancelled.GetProperty("items")[0].GetProperty("id").GetGuid());
        Assert.Equal("Edited journal", cancelled.GetProperty("items")[0].GetProperty("name").GetString());
        Assert.Equal(HttpStatusCode.OK, (await Send(client, HttpMethod.Put, $"{Path}/{id}/status", new { status = "Active" })).StatusCode);
        var restored = await client.GetFromJsonAsync<JsonElement>($"{Path}/{id}");
        Assert.Equal(initial.GetProperty("createdAtUtc").GetDateTimeOffset(), restored.GetProperty("createdAtUtc").GetDateTimeOffset());
        Assert.Equal("2026-01-01", restored.GetProperty("nextBillingDate").GetString());
        Assert.Equal("Active", restored.GetProperty("status").GetString());
    }

    [Fact]
    public async Task CostsUseAllActiveRowsAndKeepCurrenciesSeparateWithoutRescheduling()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "subscription-costs");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        foreach (var record in new[] { Record("Weekly", 3m, interval: "Weekly"), Record("Quarterly", 9m, interval: "Quarterly"),
                     Record("Annual", 24m, interval: "Yearly"), Record("Monthly", 2m), Record("Free", 0m), Record("Other currency", 10m, "NOK"),
                     Record("Small annual one", .06m, "GBP", "Yearly"), Record("Small annual two", .06m, "GBP", "Yearly") })
            Assert.Equal(HttpStatusCode.Created, (await Send(client, HttpMethod.Post, Path, record)).StatusCode);
        var data = await client.GetFromJsonAsync<JsonElement>(Path + "?page=1&pageSize=1");
        Assert.Single(data.GetProperty("items").EnumerateArray());
        Assert.Equal(8, data.GetProperty("total").GetInt32());
        var totals = data.GetProperty("totals").EnumerateArray().ToArray();
        Assert.Equal(3, totals.Length);
        var euro = totals.Single(row => row.GetProperty("currency").GetString() == "EUR");
        Assert.Equal(240m, euro.GetProperty("annual").GetDecimal());
        Assert.Equal(20m, euro.GetProperty("monthly").GetDecimal());
        Assert.Equal(5, euro.GetProperty("count").GetInt32());
        Assert.Equal(120m, totals.Single(row => row.GetProperty("currency").GetString() == "NOK").GetProperty("annual").GetDecimal());
        Assert.Equal(.01m, totals.Single(row => row.GetProperty("currency").GetString() == "GBP").GetProperty("monthly").GetDecimal());
        Assert.Equal(3, data.GetProperty("categories").GetArrayLength());
        Assert.Equal(8, data.GetProperty("overdueCount").GetInt32());
        Assert.Equal(6, data.GetProperty("upcoming").GetArrayLength());
        Assert.All(data.GetProperty("upcoming").EnumerateArray(), row => Assert.Equal("2026-01-01", row.GetProperty("nextBillingDate").GetString()));
        var bounded = await client.GetFromJsonAsync<JsonElement>(Path + "?page=-1&pageSize=9999");
        Assert.Equal(1, bounded.GetProperty("page").GetInt32());
        Assert.Equal(100, bounded.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task ValidationRejectsInvalidAmountsCurrenciesDatesAndStrings()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "subscription-validation");
        using var client = app.CreateClient();
        await SignIn(client, owner.Email, owner.Password);
        foreach (var record in new[] { Record(" "), Record(new string('x', 201)), Record(price: -1), Record(price: 1.001m),
                     Record(price: 1000000000m), Record(currency: "XYZ"), Record(interval: "Daily"),
                     Record(start: "2026-02-02", next: "2026-02-01"), Record(start: "0001-01-01") })
            Assert.Equal(HttpStatusCode.BadRequest, (await Send(client, HttpMethod.Post, Path, record)).StatusCode);
        var missingPrice = new { name = "Missing price", currency = "EUR", billingInterval = "Monthly", startDate = "2026-01-01", nextBillingDate = "2026-02-01" };
        Assert.Equal(HttpStatusCode.BadRequest, (await Send(client, HttpMethod.Post, Path, missingPrice)).StatusCode);
        var empty = await client.GetFromJsonAsync<JsonElement>(Path);
        Assert.Equal(0, empty.GetProperty("total").GetInt32());
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync(Path + "?status=Unknown")).StatusCode);
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
