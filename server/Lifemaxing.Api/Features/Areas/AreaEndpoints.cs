using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Lifemaxing.Api.Features.Areas;

public static class AreaEndpoints
{
    public static void MapAreaEndpoints(this WebApplication app)
    {
        var areas = app.MapGroup("/api/v1/areas").RequireAuthorization();

        areas.MapGet("/counts", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            return Results.Ok(await db.LifeAreas.AsNoTracking().Where(area => area.UserId == userId)
                .Select(area => new
                {
                    area.Id,
                    Tasks = db.Tasks.Count(task => task.UserId == userId && task.LifeAreaId == area.Id &&
                        task.DeletedAtUtc == null && !task.Completions.Any(completion => completion.ReversedAtUtc == null)),
                    Goals = db.Goals.Count(goal => goal.UserId == userId && goal.LifeAreaId == area.Id &&
                        goal.ArchivedAtUtc == null && goal.State == "Active"),
                    Habits = db.Habits.Count(habit => habit.UserId == userId && habit.LifeAreaId == area.Id &&
                        habit.ArchivedAtUtc == null && habit.IsActive)
                }).ToListAsync(ct));
        });

        areas.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var userId = principal.GetUserId();
            var response = await db.LifeAreas
                .Where(area => area.UserId == userId)
                .OrderBy(area => area.SortOrder)
                .ThenBy(area => area.Key)
                .Select(area => new AreaResponse(area.Id, area.Key, area.DisplayName, area.IsActive, area.SortOrder))
                .ToListAsync(cancellationToken);
            return Results.Ok(response);
        });

        areas.MapPut("/order", async (UpdateAreaOrderRequest request, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var owned = await db.LifeAreas.Where(area => area.UserId == userId).ToListAsync(ct);
            var ids = request.AreaIds;
            if (ids is null || ids.Length != owned.Count || ids.Distinct().Count() != ids.Length ||
                !ids.ToHashSet().SetEquals(owned.Select(area => area.Id)))
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["areaIds"] = ["Supply each of your Life Areas exactly once."]
                }, extensions: new Dictionary<string, object?> { ["code"] = "validation_failed" });

            var byId = owned.ToDictionary(area => area.Id);
            // Mark every position modified: a concurrent complete order must never produce a hybrid.
            for (var index = 0; index < ids.Length; index++)
            {
                byId[ids[index]].SortOrder = index;
                db.Entry(byId[ids[index]]).Property(area => area.SortOrder).IsModified = true;
            }
            // EF saves all updates in a single transaction; no names or activation flags are changed.
            await db.SaveChangesAsync(ct);
            return Results.Ok(ids.Select(id => byId[id]).Select(area =>
                new AreaResponse(area.Id, area.Key, area.DisplayName, area.IsActive, area.SortOrder)));
        }).ValidateAntiforgery();

        areas.MapPatch("/{id:guid}", async (Guid id, UpdateAreaRequest request, ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var displayName = request.DisplayName?.Trim();
            var errors = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(displayName) || displayName.Length > 100)
            {
                errors["displayName"] = ["Display name must contain between 1 and 100 characters."];
            }
            if (request.SortOrder is < 0 or > 999)
            {
                errors["sortOrder"] = ["Sort order must be between 0 and 999."];
            }
            if (errors.Count > 0)
            {
                return Results.ValidationProblem(errors,
                    extensions: new Dictionary<string, object?> { ["code"] = "validation_failed" });
            }

            var userId = principal.GetUserId();
            var area = await db.LifeAreas.SingleOrDefaultAsync(
                value => value.Id == id && value.UserId == userId, cancellationToken);
            if (area is null)
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Life Area not found.",
                    extensions: new Dictionary<string, object?> { ["code"] = "area_not_found" });
            }

            area.DisplayName = displayName!;
            if (request.SortOrder is { } sortOrder) area.SortOrder = sortOrder;
            area.IsActive = request.IsActive;
            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(new AreaResponse(area.Id, area.Key, area.DisplayName, area.IsActive, area.SortOrder));
        }).ValidateAntiforgery();
    }
}

public sealed record AreaResponse(Guid Id, string Key, string DisplayName, bool IsActive, int SortOrder);
public sealed record UpdateAreaRequest(string? DisplayName, bool IsActive, int? SortOrder);
public sealed record UpdateAreaOrderRequest(Guid[]? AreaIds);
