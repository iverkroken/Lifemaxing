using System.Security.Claims;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.DeletedContent;

public sealed record DeletedItemResponse(Guid Id, string Type, string Title, Guid? LifeAreaId, string? LifeAreaName,
    DateTimeOffset DeletedAtUtc, DateTimeOffset ExpiresAtUtc, string Path);

public static class DeletedContentEndpoints
{
    public static void MapDeletedContentEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/recently-deleted", async (string? type, int? page, int? pageSize, ClaimsPrincipal principal,
            AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var kind = string.IsNullOrWhiteSpace(type) ? null : DeletedContentService.Normalize(type);
            if (kind is not (null or "task" or "habit" or "goal" or "lifearea"))
                return Productivity.Invalid("type", "Choose task, habit, goal or lifeArea.");
            var owner = principal.GetUserId();
            var now = clock.GetUtcNow();
            var cutoff = now - DeletedContentPolicy.Retention;
            var items = new List<DeletedItemResponse>();
            var areas = await db.LifeAreas.IgnoreQueryFilters().AsNoTracking().Where(x => x.UserId == owner)
                .ToDictionaryAsync(x => x.Id, x => x.DisplayName, ct);

            if (kind is null or "task")
                items.AddRange(await db.Tasks.IgnoreQueryFilters().AsNoTracking()
                    .Where(x => x.UserId == owner && x.DeletedAtUtc > cutoff)
                    .Select(x => new DeletedItemResponse(x.Id, "task", x.Title, x.LifeAreaId, null,
                        x.DeletedAtUtc!.Value, x.DeletedAtUtc.Value + DeletedContentPolicy.Retention, $"/tasks/{x.Id}"))
                    .ToListAsync(ct));
            if (kind is null or "habit")
                items.AddRange(await db.Habits.IgnoreQueryFilters().AsNoTracking()
                    .Where(x => x.UserId == owner && x.DeletedAtUtc > cutoff)
                    .Select(x => new DeletedItemResponse(x.Id, "habit", x.Title, x.LifeAreaId, null,
                        x.DeletedAtUtc!.Value, x.DeletedAtUtc.Value + DeletedContentPolicy.Retention, $"/habits/{x.Id}"))
                    .ToListAsync(ct));
            if (kind is null or "goal")
                items.AddRange(await db.Goals.IgnoreQueryFilters().AsNoTracking()
                    .Where(x => x.UserId == owner && x.DeletedAtUtc > cutoff)
                    .Select(x => new DeletedItemResponse(x.Id, "goal", x.Title, x.LifeAreaId, null,
                        x.DeletedAtUtc!.Value, x.DeletedAtUtc.Value + DeletedContentPolicy.Retention, $"/goals/{x.Id}"))
                    .ToListAsync(ct));
            if (kind is null or "lifearea")
                items.AddRange(await db.LifeAreas.IgnoreQueryFilters().AsNoTracking()
                    .Where(x => x.UserId == owner && x.DeletedAtUtc > cutoff)
                    .Select(x => new DeletedItemResponse(x.Id, "lifeArea", x.DisplayName, null, null,
                        x.DeletedAtUtc!.Value, x.DeletedAtUtc.Value + DeletedContentPolicy.Retention, $"/areas/{x.Key}"))
                    .ToListAsync(ct));

            items = items.Select(x => x.LifeAreaId is { } areaId && areas.TryGetValue(areaId, out var name)
                    ? x with { LifeAreaName = name }
                    : x)
                .OrderByDescending(x => x.DeletedAtUtc).ThenBy(x => x.Title).ToList();
            var number = Math.Min(Productivity.Page(page), 1000000);
            var size = Productivity.PageSize(pageSize);
            return Results.Ok(new
            {
                items = items.Skip((number - 1) * size).Take(size),
                page = number,
                pageSize = size,
                total = items.Count,
                serverNowUtc = now,
                retentionDays = (int)DeletedContentPolicy.Retention.TotalDays
            });
        });

        api.MapPost("/recently-deleted/{type}/{id:guid}/restore", async (string type, Guid id,
            ClaimsPrincipal principal, DeletedContentService service, CancellationToken ct) =>
        {
            var result = await service.RestoreAsync(type, id, principal.GetUserId(), ct);
            return result switch
            {
                RestoreResult.Restored => Results.NoContent(),
                RestoreResult.Expired => Productivity.Conflict("This item has passed its 30-day recovery period."),
                _ => Productivity.NotFound()
            };
        });

        api.MapDelete("/recently-deleted/{type}/{id:guid}", async (string type, Guid id,
            ClaimsPrincipal principal, DeletedContentService service, CancellationToken ct) =>
            await service.PurgeAsync(type, id, principal.GetUserId(), ct) ? Results.NoContent() : Productivity.NotFound());
    }
}
