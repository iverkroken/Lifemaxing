using System.Security.Claims;
using Lifemaxing.Api.Features.Progression;
using System.Text.Json;
using System.Linq.Expressions;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;
using Lifemaxing.Api.Features.DeletedContent;

namespace Lifemaxing.Api.Features.Goals;

public sealed record GoalRequest(string? Title, string? Description = null, Guid? LifeAreaId = null,
    string State = "Active", decimal? TargetValue = null, decimal? BaselineValue = null,
    string? Unit = null, string? Direction = null, DateOnly? TargetDate = null);
public sealed record ProgressRequest(decimal? Value = null, string? Note = null);
public sealed record ProgressResponse(Guid Id, DateTimeOffset RecordedAtUtc, decimal? Value, string? Note);
public sealed record GoalResponse(Guid Id, string Title, string? Description, Guid? LifeAreaId, string State,
    decimal? TargetValue, decimal? BaselineValue, string? Unit, string? Direction, DateOnly? TargetDate,
    DateTimeOffset CreatedAtUtc, DateTimeOffset? CompletedAtUtc, DateTimeOffset? ArchivedAtUtc)
{
    public static readonly Expression<Func<Goal, GoalResponse>> Projection = x => new GoalResponse(x.Id, x.Title,
        x.Description, x.LifeAreaId, x.State, x.TargetValue, x.BaselineValue, x.Unit, x.Direction, x.TargetDate,
        x.CreatedAtUtc, x.CompletedAtUtc, x.ArchivedAtUtc);
}

public static class GoalEndpoints
{
    public static void MapGoalEndpoints(this RouteGroupBuilder api)
    {
        var goals = api.MapGroup("/goals");
        goals.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, Guid? areaId, bool? archived, string? state, string? search,
            int? page, int? pageSize, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var query = db.Goals.Where(x => x.UserId == userId && (archived == true ? x.ArchivedAtUtc != null : x.ArchivedAtUtc == null));
            if (areaId.HasValue) query = query.Where(x => x.LifeAreaId == areaId);
            if (state is not (null or "Active" or "Paused" or "Completed")) return Productivity.Invalid("state", "Choose Active, Paused or Completed.");
            if (state != null) query = query.Where(x => x.State == state);
            if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.Title.Contains(search.Trim()));
            var number = Math.Min(Productivity.Page(page), 1000000); var size = Productivity.PageSize(pageSize);
            var total = await query.CountAsync(ct);
            var items = await query.OrderByDescending(x => x.CreatedAtUtc).ThenBy(x => x.Id)
                .Skip((number - 1) * size).Take(size).Select(GoalResponse.Projection).ToListAsync(ct);
            return Results.Ok(new PageResponse<GoalResponse>(items, number, size, total));
        });
        goals.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var goal = await db.Goals.Where(x => x.Id == id && x.UserId == userId).Select(GoalResponse.Projection).SingleOrDefaultAsync(ct);
            return goal is null ? Productivity.NotFound() : Results.Ok(goal);
        });
        goals.MapPost("/", async (GoalRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var error = await Validate(request, userId, db, ct);
            if (error is not null) return error;
            var goal = new Goal { Id = Guid.NewGuid(), UserId = userId, CreatedAtUtc = clock.GetUtcNow() };
            if (goal.State != "Completed" && request.State == "Completed")
                ProgressionRules.Record(db, userId, "GoalCompleted", "Goal", goal.Id, request.LifeAreaId, clock.GetUtcNow(), $"Completed goal: {request.Title!.Trim()}");
            Apply(goal, request, clock.GetUtcNow());
            db.Goals.Add(goal);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/goals/{goal.Id}", await Response(db, goal.Id, userId, ct));
        });
        goals.MapPatch("/{id:guid}", async (Guid id, JsonElement patch, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var goal = await db.Goals.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (goal is null) return Productivity.NotFound();
            if (goal.ArchivedAtUtc is not null) return Productivity.Conflict("Archived goals cannot be edited.");
            var request = Productivity.Patch(new GoalRequest(goal.Title, goal.Description, goal.LifeAreaId, goal.State,
                goal.TargetValue, goal.BaselineValue, goal.Unit, goal.Direction, goal.TargetDate), patch);
            var error = await Validate(request, userId, db, ct, goal.LifeAreaId);
            if (error is not null) return error;
            if ((request.Unit?.Trim() != goal.Unit || request.Direction != goal.Direction || request.BaselineValue != goal.BaselineValue ||
                 request.TargetValue.HasValue != goal.TargetValue.HasValue) &&
                await db.GoalProgressEntries.AnyAsync(x => x.GoalId == id && x.UserId == userId, ct))
                return Productivity.Conflict("Progress already exists. Keep the goal type, unit, direction and baseline so its history remains meaningful.");
            if (goal.State != "Completed" && request.State == "Completed")
                ProgressionRules.Record(db, userId, "GoalCompleted", "Goal", id, request.LifeAreaId, clock.GetUtcNow(), $"Completed goal: {request.Title!.Trim()}");
            Apply(goal, request, clock.GetUtcNow());
            await db.SaveChangesAsync(ct);
            return Results.Ok(await Response(db, id, userId, ct));
        });
        goals.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, DeletedContentService deleted, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            return await deleted.SoftDeleteAsync("goal", id, userId, ct) ? Results.NoContent() : Productivity.NotFound();
        });
        goals.MapGet("/{id:guid}/progress", async (Guid id, ClaimsPrincipal principal, AppDbContext db, int? page, int? pageSize, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            if (!await db.Goals.AnyAsync(x => x.Id == id && x.UserId == userId, ct)) return Productivity.NotFound();
            var query = db.GoalProgressEntries.Where(x => x.GoalId == id && x.UserId == userId);
            var number = Math.Min(Productivity.Page(page), 1000000); var size = Productivity.PageSize(pageSize);
            var total = await query.CountAsync(ct);
            var items = await query.OrderByDescending(x => x.RecordedAtUtc).ThenByDescending(x => x.Id)
                .Skip((number - 1) * size).Take(size).Select(x => new ProgressResponse(x.Id, x.RecordedAtUtc, x.Value, x.Note)).ToListAsync(ct);
            return Results.Ok(new PageResponse<ProgressResponse>(items, number, size, total));
        });
        goals.MapPost("/{id:guid}/progress", async (Guid id, ProgressRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var goal = await db.Goals.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (goal is null) return Productivity.NotFound();
            if (goal.ArchivedAtUtc is not null) return Productivity.Conflict("Archived goals cannot receive progress.");
            if (request.Note?.Length > 5000) return Productivity.Invalid("note", "Use at most 5000 characters.");
            if (!Productivity.NumberValid(request.Value)) return Productivity.Invalid("value", "Use a number with at most 14 integer and 4 decimal digits.");
            if (goal.TargetValue.HasValue && !request.Value.HasValue) return Productivity.Invalid("value", "A measured goal needs a numeric progress value.");
            if (!goal.TargetValue.HasValue && (request.Value.HasValue || string.IsNullOrWhiteSpace(request.Note)))
                return Productivity.Invalid("note", "A qualitative goal needs a progress note and no numeric value.");
            var entry = new GoalProgressEntry { Id = Guid.NewGuid(), UserId = userId, GoalId = id,
                RecordedAtUtc = clock.GetUtcNow(), Value = request.Value, Note = request.Note?.Trim() };
            db.GoalProgressEntries.Add(entry);
            var note = entry.Note ?? "";
            var detail = entry.Value.HasValue ? $"{entry.Value} {goal.Unit}" : note[..Math.Min(300, note.Length)];
            ProgressionRules.Record(db, userId, "GoalProgressRecorded", "Goal", id, goal.LifeAreaId, entry.RecordedAtUtc,
                $"Progress on {goal.Title}: {detail}", entry.Id);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/goals/{id}/progress", new ProgressResponse(entry.Id, entry.RecordedAtUtc, entry.Value, entry.Note));
        });
    }

    private static Task<GoalResponse> Response(AppDbContext db, Guid id, Guid userId, CancellationToken ct) =>
        db.Goals.Where(x => x.Id == id && x.UserId == userId).Select(GoalResponse.Projection).SingleAsync(ct);
    private static async Task<IResult?> Validate(GoalRequest request, Guid userId, AppDbContext db, CancellationToken ct,
        Guid? retainedAreaId = null)
    {
        if (!Productivity.TitleValid(request.Title)) return Productivity.Invalid("title", "Enter a title of 1–200 characters.");
        if (request.Description?.Length > 10000) return Productivity.Invalid("description", "Use at most 10000 characters.");
        if (request.State is not ("Active" or "Paused" or "Completed")) return Productivity.Invalid("state", "Choose Active, Paused or Completed.");
        if (!Productivity.DateValid(request.TargetDate)) return Productivity.Invalid("targetDate", "Use dates between 1900 and 9998.");
        if (!Productivity.NumberValid(request.TargetValue) || !Productivity.NumberValid(request.BaselineValue))
            return Productivity.Invalid("targetValue", "Use numbers with at most 14 integer and 4 decimal digits.");
        if (request.TargetValue.HasValue)
        {
            if (request.BaselineValue is null || string.IsNullOrWhiteSpace(request.Unit) || request.Unit.Length > 50 || request.Direction is not ("Increase" or "Decrease"))
                return Productivity.Invalid("targetValue", "Measured goals require a baseline, unit and Increase or Decrease direction.");
            if (request.Direction == "Increase" && request.TargetValue <= request.BaselineValue || request.Direction == "Decrease" && request.TargetValue >= request.BaselineValue)
                return Productivity.Invalid("targetValue", "Target must be beyond the baseline in the selected direction.");
        }
        else if (request.BaselineValue is not null || request.Unit is not null || request.Direction is not null)
            return Productivity.Invalid("targetValue", "Qualitative goals have no baseline, unit or direction.");
        return await Productivity.OwnsAreaOrRetains(db, userId, request.LifeAreaId, retainedAreaId, ct) ? null : Productivity.NotFound();
    }
    private static void Apply(Goal goal, GoalRequest request, DateTimeOffset now)
    {
        goal.Title = request.Title!.Trim(); goal.Description = request.Description?.Trim(); goal.LifeAreaId = request.LifeAreaId;
        goal.State = request.State; goal.TargetValue = request.TargetValue; goal.BaselineValue = request.BaselineValue;
        goal.Unit = request.Unit?.Trim(); goal.Direction = request.Direction; goal.TargetDate = request.TargetDate;
        goal.CompletedAtUtc = request.State == "Completed" ? goal.CompletedAtUtc ?? now : null;
    }
}
