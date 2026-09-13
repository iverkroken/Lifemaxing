using System.Security.Claims;
using System.Text.Json;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Progression;

public sealed record RewardRequest(string? Title, int RequiredLevel = 1);
public sealed record RewardResponse(Guid Id, string Title, int RequiredLevel, DateTimeOffset? ArchivedAtUtc, DateTimeOffset? ClaimedAtUtc, bool Eligible);
public sealed record ActivityResponse(Guid Id, string Kind, string SubjectKind, Guid SubjectId, Guid? LifeAreaId, DateTimeOffset OccurredAtUtc, string Summary, int SchemaVersion);

public static class ProgressionEndpoints
{
    public static void MapProgressionEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/progress", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            var progress = ProgressionRules.Calculate(await ProgressionRules.Total(db, owner, ct));
            var tasksCompleted = await db.TaskCompletions.CountAsync(x => x.UserId == owner && x.ReversedAtUtc == null, ct);
            var habitCompletions = await db.HabitLogs.CountAsync(x => x.UserId == owner && x.ReversedAtUtc == null, ct);
            var focusSeconds = await db.FocusSessions.Where(x => x.UserId == owner && x.EndedAtUtc != null && x.Status != "Cancelled").SumAsync(x => x.AccumulatedSeconds, ct);
            return Results.Ok(new { progress, tasksCompleted, habitCompletions, focusSeconds });
        });
        api.MapGet("/activity", async (ClaimsPrincipal principal, AppDbContext db, int? page, int? pageSize, string? kind, CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            var query = db.ActivityEvents.Where(x => x.UserId == owner);
            if (!string.IsNullOrWhiteSpace(kind)) query = query.Where(x => x.Kind == kind);
            var number = Math.Min(Productivity.Page(page), 1000000); var size = Productivity.PageSize(pageSize);
            var total = await query.CountAsync(ct);
            var items = await query.OrderByDescending(x => x.OccurredAtUtc).ThenByDescending(x => x.Id).Skip((number - 1) * size).Take(size)
                .Select(x => new ActivityResponse(x.Id, x.Kind, x.SubjectKind, x.SubjectId, x.LifeAreaId, x.OccurredAtUtc, x.Summary, x.SchemaVersion)).ToListAsync(ct);
            return Results.Ok(new PageResponse<ActivityResponse>(items, number, size, total));
        });
        api.MapGet("/progress/ledger", async (ClaimsPrincipal principal, AppDbContext db, int? page, int? pageSize, CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            var query = db.XpEntries.Where(x => x.UserId == owner);
            var number = Math.Min(Productivity.Page(page), 1000000); var size = Productivity.PageSize(pageSize);
            var total = await query.CountAsync(ct);
            var items = await query.OrderByDescending(x => x.OccurredAtUtc).ThenByDescending(x => x.Id).Skip((number - 1) * size).Take(size)
                .Select(x => new { x.Id, x.AmountSigned, x.Kind, x.SourceKind, x.SourceId, x.RelatedEntryId, x.LocalDate, x.TimeZoneId, x.Category, x.RuleVersion, x.OccurredAtUtc }).ToListAsync(ct);
            return Results.Ok(new { items, page = number, pageSize = size, total });
        });
        api.MapGet("/rewards", async (ClaimsPrincipal principal, AppDbContext db, bool? archived, int? page, int? pageSize, CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            var level = ProgressionRules.Calculate(await ProgressionRules.Total(db, owner, ct)).Level;
            var query = db.Rewards.Where(x => x.UserId == owner && (archived == true ? x.ArchivedAtUtc != null : x.ArchivedAtUtc == null));
            var number = Math.Min(Productivity.Page(page), 1000000); var size = Productivity.PageSize(pageSize);
            var total = await query.CountAsync(ct);
            var items = await query.OrderBy(x => x.RequiredLevel).ThenBy(x => x.Id).Skip((number - 1) * size).Take(size)
                .Select(x => new RewardResponse(x.Id, x.Title, x.RequiredLevel, x.ArchivedAtUtc,
                    db.RewardClaims.Where(c => c.UserId == owner && c.RewardId == x.Id).Select(c => (DateTimeOffset?)c.ClaimedAtUtc).SingleOrDefault(),
                    x.ArchivedAtUtc == null && x.RequiredLevel <= level && !db.RewardClaims.Any(c => c.UserId == owner && c.RewardId == x.Id))).ToListAsync(ct);
            return Results.Ok(new PageResponse<RewardResponse>(items, number, size, total));
        });
        api.MapGet("/rewards/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            var reward = await db.Rewards.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
            return reward is null ? Productivity.NotFound() : Results.Ok(await Response(db, reward, ct));
        });
        api.MapPost("/rewards", async (RewardRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var error = Validate(request); if (error is not null) return error;
            var reward = new Reward { Id = Guid.NewGuid(), UserId = principal.GetUserId(), Title = request.Title!.Trim(), RequiredLevel = request.RequiredLevel, CreatedAtUtc = clock.GetUtcNow() };
            db.Rewards.Add(reward); await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/rewards/{reward.Id}", await Response(db, reward, ct));
        });
        api.MapPatch("/rewards/{id:guid}", async (Guid id, JsonElement patch, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            var reward = await db.Rewards.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
            if (reward is null) return Productivity.NotFound();
            if (reward.ArchivedAtUtc != null || await db.RewardClaims.AnyAsync(x => x.UserId == owner && x.RewardId == id, ct)) return Productivity.Conflict("Claimed or archived rewards retain their original definition.");
            var request = Productivity.Patch(new RewardRequest(reward.Title, reward.RequiredLevel), patch);
            var error = Validate(request); if (error is not null) return error;
            reward.Title = request.Title!.Trim(); reward.RequiredLevel = request.RequiredLevel;
            await db.SaveChangesAsync(ct); return Results.Ok(await Response(db, reward, ct));
        });
        api.MapDelete("/rewards/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var owner = principal.GetUserId(); var reward = await db.Rewards.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
            if (reward is null) return Productivity.NotFound();
            reward.ArchivedAtUtc ??= clock.GetUtcNow(); await db.SaveChangesAsync(ct); return Results.NoContent();
        });
        api.MapPost("/rewards/{id:guid}/claim", async (Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var owner = principal.GetUserId(); var reward = await db.Rewards.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
            if (reward is null) return Productivity.NotFound();
            var response = await Response(db, reward, ct);
            if (!response.Eligible) return Productivity.Conflict("This reward is locked, archived, or already claimed.");
            var claim = new RewardClaim { Id = Guid.NewGuid(), UserId = owner, RewardId = id, ClaimedAtUtc = clock.GetUtcNow() };
            db.RewardClaims.Add(claim);
            ProgressionRules.Record(db, owner, "RewardClaimed", "Reward", id, null, claim.ClaimedAtUtc, $"Claimed: {reward.Title}", claim.Id);
            await db.SaveChangesAsync(ct); return Results.Ok(await Response(db, reward, ct));
        });
    }
    private static IResult? Validate(RewardRequest request) => !Productivity.TitleValid(request.Title) ? Productivity.Invalid("title", "Enter a title of 1–200 characters.")
        : request.RequiredLevel is < 1 or > 100000 ? Productivity.Invalid("requiredLevel", "Use a level from 1 to 100000.") : null;
    private static async Task<RewardResponse> Response(AppDbContext db, Reward reward, CancellationToken ct)
    {
        var claimed = await db.RewardClaims.Where(x => x.UserId == reward.UserId && x.RewardId == reward.Id).Select(x => (DateTimeOffset?)x.ClaimedAtUtc).SingleOrDefaultAsync(ct);
        var level = ProgressionRules.Calculate(await ProgressionRules.Total(db, reward.UserId, ct)).Level;
        return new(reward.Id, reward.Title, reward.RequiredLevel, reward.ArchivedAtUtc, claimed, reward.ArchivedAtUtc == null && claimed == null && level >= reward.RequiredLevel);
    }
}
