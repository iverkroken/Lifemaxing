using System.Linq.Expressions;
using System.Security.Claims;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Finance;

public sealed record SubscriptionRequest(string? Name, string? Category, decimal? Price, string? Currency,
    string? BillingInterval, DateOnly NextBillingDate, DateOnly StartDate, string? Notes = null);
public sealed record SubscriptionStatusRequest(string? Status);
public sealed record SubscriptionResponse(Guid Id, string Name, string Category, decimal Price, string Currency,
    string BillingInterval, DateOnly NextBillingDate, DateOnly StartDate, string? Notes, string Status,
    DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc)
{
    public static readonly Expression<Func<Subscription, SubscriptionResponse>> Projection = value => new(value.Id,
        value.Name, value.Category, value.Price, value.Currency, value.BillingInterval, value.NextBillingDate,
        value.StartDate, value.Notes, value.Status, value.CreatedAtUtc, value.UpdatedAtUtc);
}
public sealed record SubscriptionCost(string Currency, decimal Monthly, decimal Annual, int Count);
public sealed record SubscriptionCategoryCost(string Currency, string Category, decimal Monthly, decimal Annual, int Count);
public sealed record SubscriptionListResponse(IReadOnlyList<SubscriptionResponse> Items, int Page, int PageSize, int Total,
    DateOnly LocalDate, IReadOnlyList<SubscriptionCost> Totals, IReadOnlyList<SubscriptionCategoryCost> Categories,
    IReadOnlyList<SubscriptionResponse> Upcoming, int OverdueCount);

public static class SubscriptionEndpoints
{
    // Explicit supported ISO 4217 currencies. Estimates never convert between them.
    private static readonly HashSet<string> Currencies = ["NOK", "SEK", "DKK", "EUR", "GBP", "USD", "CHF", "CAD", "AUD", "NZD", "PLN", "CZK", "HUF"];

    public static void MapSubscriptionEndpoints(this RouteGroupBuilder api)
    {
        var subscriptions = api.MapGroup("/finance/subscriptions");
        subscriptions.MapGet("/", List);
        subscriptions.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var response = await Owned(db, userId).Where(value => value.Id == id).Select(SubscriptionResponse.Projection).SingleOrDefaultAsync(ct);
            return response is null ? Productivity.NotFound() : Results.Ok(response);
        });
        subscriptions.MapPost("/", async (SubscriptionRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var invalid = Validate(request);
            if (invalid is not null) return invalid;
            var now = clock.GetUtcNow();
            var subscription = new Subscription { Id = Guid.NewGuid(), UserId = principal.GetUserId(), CreatedAtUtc = now };
            Apply(subscription, request, now);
            db.Set<Subscription>().Add(subscription);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/finance/subscriptions/{subscription.Id}", await Response(db, subscription, ct));
        });
        subscriptions.MapPut("/{id:guid}", async (Guid id, SubscriptionRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var subscription = await Owned(db, principal.GetUserId()).SingleOrDefaultAsync(value => value.Id == id, ct);
            if (subscription is null) return Productivity.NotFound();
            var invalid = Validate(request);
            if (invalid is not null) return invalid;
            Apply(subscription, request, clock.GetUtcNow());
            await db.SaveChangesAsync(ct);
            return Results.Ok(await Response(db, subscription, ct));
        });
        subscriptions.MapPut("/{id:guid}/status", async (Guid id, SubscriptionStatusRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var subscription = await Owned(db, principal.GetUserId()).SingleOrDefaultAsync(value => value.Id == id, ct);
            if (subscription is null) return Productivity.NotFound();
            if (request.Status is not ("Active" or "Cancelled")) return Productivity.Invalid("status", "Choose Active or Cancelled.");
            subscription.Status = request.Status;
            subscription.UpdatedAtUtc = clock.GetUtcNow();
            await db.SaveChangesAsync(ct);
            return Results.Ok(await Response(db, subscription, ct));
        });
    }

    private static async Task<IResult> List(ClaimsPrincipal principal, AppDbContext db, TimeProvider clock,
        string? status, int? page, int? pageSize, CancellationToken ct)
    {
        if (status is not (null or "Active" or "Cancelled")) return Productivity.Invalid("status", "Choose Active or Cancelled.");
        var userId = principal.GetUserId();
        var owned = Owned(db, userId).AsNoTracking();
        var visible = owned.Where(value => value.Status == (status ?? "Active"));
        var number = Math.Min(Productivity.Page(page), 1000000);
        var size = Productivity.PageSize(pageSize);
        var total = await visible.CountAsync(ct);
        var items = await visible.OrderBy(value => value.NextBillingDate).ThenBy(value => value.Id)
            .Skip((number - 1) * size).Take(size).Select(SubscriptionResponse.Projection).ToListAsync(ct);
        var active = owned.Where(value => value.Status == "Active");
        // Aggregate decimal prices in SQL before computing cadence estimates. List pagination
        // and the cancelled view never change these owner-wide active cost summaries.
        var groups = await active.GroupBy(value => new { value.Currency, value.Category, value.BillingInterval })
            .Select(group => new { group.Key.Currency, group.Key.Category, group.Key.BillingInterval, Price = group.Sum(value => value.Price), Count = group.Count() })
            .ToListAsync(ct);
        var annual = groups.Select(group => new { group.Currency, group.Category, group.Count,
            Annual = group.Price * (group.BillingInterval switch { "Weekly" => 52m, "Monthly" => 12m, "Quarterly" => 4m, _ => 1m }) }).ToArray();
        var totals = annual.GroupBy(value => value.Currency).OrderBy(group => group.Key)
            .Select(group => new SubscriptionCost(group.Key, group.Sum(value => value.Annual) / 12m, group.Sum(value => value.Annual), group.Sum(value => value.Count))).ToArray();
        var categories = annual.GroupBy(value => new { value.Currency, value.Category }).OrderBy(group => group.Key.Currency).ThenBy(group => group.Key.Category)
            .Select(group => new SubscriptionCategoryCost(group.Key.Currency, group.Key.Category, group.Sum(value => value.Annual) / 12m, group.Sum(value => value.Annual), group.Sum(value => value.Count))).ToArray();
        var day = await Productivity.Day(db, userId, clock, ct);
        var overdue = await active.CountAsync(value => value.NextBillingDate < day.Date, ct);
        var upcoming = await active.OrderBy(value => value.NextBillingDate).ThenBy(value => value.Id).Take(6).Select(SubscriptionResponse.Projection).ToListAsync(ct);
        return Results.Ok(new SubscriptionListResponse(items, number, size, total, day.Date, totals, categories, upcoming, overdue));
    }

    private static IQueryable<Subscription> Owned(AppDbContext db, Guid userId) => db.Set<Subscription>().Where(value => value.UserId == userId);
    private static Task<SubscriptionResponse> Response(AppDbContext db, Subscription subscription, CancellationToken ct) =>
        Owned(db, subscription.UserId).Where(value => value.Id == subscription.Id).Select(SubscriptionResponse.Projection).SingleAsync(ct);
    private static IResult? Validate(SubscriptionRequest request)
    {
        if (!Productivity.TitleValid(request.Name)) return Productivity.Invalid("name", "Enter a name of 1–200 characters.");
        if (request.Category?.Length > 80) return Productivity.Invalid("category", "Use at most 80 characters.");
        if (request.Price is null or < 0 or > 999999999.99m || decimal.Round(request.Price.Value, 2) != request.Price)
            return Productivity.Invalid("price", "Enter a nonnegative price up to 999999999.99 with at most two decimals.");
        if (request.Currency is null || !Currencies.Contains(request.Currency)) return Productivity.Invalid("currency", "Choose a supported currency.");
        if (request.BillingInterval is not ("Weekly" or "Monthly" or "Quarterly" or "Yearly")) return Productivity.Invalid("billingInterval", "Choose Weekly, Monthly, Quarterly or Yearly.");
        if (!Productivity.DateValid(request.StartDate)) return Productivity.Invalid("startDate", "Use a date between 1900 and 9998.");
        if (!Productivity.DateValid(request.NextBillingDate) || request.NextBillingDate < request.StartDate)
            return Productivity.Invalid("nextBillingDate", "Use a date on or after the start date, between 1900 and 9998.");
        if (request.Notes?.Length > 2000) return Productivity.Invalid("notes", "Use at most 2000 characters.");
        return null;
    }
    private static void Apply(Subscription subscription, SubscriptionRequest request, DateTimeOffset now)
    {
        subscription.Name = request.Name!.Trim(); subscription.Category = request.Category?.Trim() ?? "";
        subscription.Price = request.Price!.Value; subscription.Currency = request.Currency!; subscription.BillingInterval = request.BillingInterval!;
        subscription.StartDate = request.StartDate; subscription.NextBillingDate = request.NextBillingDate;
        subscription.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(); subscription.UpdatedAtUtc = now;
    }
}
