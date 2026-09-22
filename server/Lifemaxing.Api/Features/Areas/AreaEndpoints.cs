using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Lifemaxing.Api.Features.DeletedContent;

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
                        task.ArchivedAtUtc == null && !task.Completions.Any(completion => completion.ReversedAtUtc == null)),
                    Goals = db.Goals.Count(goal => goal.UserId == userId && goal.LifeAreaId == area.Id &&
                        goal.ArchivedAtUtc == null && goal.State == "Active"),
                    Habits = db.Habits.Count(habit => habit.UserId == userId && habit.LifeAreaId == area.Id &&
                        habit.ArchivedAtUtc == null && habit.IsActive)
                }).ToListAsync(ct));
        });

        areas.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var userId = principal.GetUserId();
            var rows = await db.LifeAreas.AsNoTracking()
                .Where(area => area.UserId == userId)
                .OrderBy(area => area.SortOrder)
                .ThenBy(area => area.Key)
                .Select(area => new
                {
                    area.Id, area.Key, area.DisplayName, area.IsActive, area.SortOrder,
                    HasCustomImage = area.CustomImage != null, area.CustomImageUpdatedAtUtc,
                    area.ImageFocalX, area.ImageFocalY
                })
                .ToListAsync(cancellationToken);
            return Results.Ok(rows.Select(area => new AreaResponse(area.Id, area.Key, area.DisplayName, area.IsActive,
                area.SortOrder, ImageUrl(area.Id, area.HasCustomImage, area.CustomImageUpdatedAtUtc), area.ImageFocalX, area.ImageFocalY)));
        });

        areas.MapPost("/", async (CreateAreaRequest request, ClaimsPrincipal principal, AppDbContext db,
            CancellationToken ct) =>
        {
            var displayName = request.DisplayName?.Trim();
            var error = Validate(displayName, request.ImageFocalX, request.ImageFocalY);
            if (error is not null) return error;
            var userId = principal.GetUserId();
            var id = Guid.NewGuid();
            var nextOrder = (await db.LifeAreas.Where(x => x.UserId == userId)
                .Select(x => (int?)x.SortOrder).MaxAsync(ct) ?? -1) + 1;
            var area = new LifeArea
            {
                Id = id,
                UserId = userId,
                Key = $"custom-{id:N}",
                DisplayName = displayName!,
                IsActive = true,
                SortOrder = nextOrder,
                ImageFocalX = request.ImageFocalX ?? 50,
                ImageFocalY = request.ImageFocalY ?? 50
            };
            db.LifeAreas.Add(area);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/areas/{id}", Response(area));
        }).ValidateAntiforgery();

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
                Response(area)));
        }).ValidateAntiforgery();

        areas.MapPatch("/{id:guid}", async (Guid id, UpdateAreaRequest request, ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var displayName = request.DisplayName?.Trim();
            var errors = ValidateErrors(displayName, request.ImageFocalX, request.ImageFocalY,
                requireName: request.DisplayName is not null);
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

            if (request.DisplayName is not null) area.DisplayName = displayName!;
            if (request.SortOrder is { } sortOrder) area.SortOrder = sortOrder;
            if (request.IsActive is { } active) area.IsActive = active;
            if (request.ImageFocalX is { } focalX) area.ImageFocalX = focalX;
            if (request.ImageFocalY is { } focalY) area.ImageFocalY = focalY;
            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(Response(area));
        }).ValidateAntiforgery();

        areas.MapGet("/{id:guid}/delete-impact", async (Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            if (!await db.LifeAreas.AnyAsync(x => x.Id == id && x.UserId == owner, ct)) return Productivity.NotFound();
            return Results.Ok(new
            {
                tasks = await db.Tasks.CountAsync(x => x.UserId == owner && x.LifeAreaId == id, ct),
                habits = await db.Habits.CountAsync(x => x.UserId == owner && x.LifeAreaId == id, ct),
                goals = await db.Goals.CountAsync(x => x.UserId == owner && x.LifeAreaId == id, ct)
            });
        });

        areas.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, DeletedContentService deleted,
            CancellationToken ct) => await deleted.SoftDeleteAsync("lifeArea", id, principal.GetUserId(), ct)
                ? Results.NoContent() : Productivity.NotFound()).ValidateAntiforgery();

        areas.MapGet("/{id:guid}/image", async (Guid id, ClaimsPrincipal principal, AppDbContext db,
            HttpContext http, CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            var image = await db.LifeAreas.AsNoTracking().Where(x => x.Id == id && x.UserId == owner && x.CustomImage != null)
                .Select(x => new { x.CustomImage, x.CustomImageContentType }).SingleOrDefaultAsync(ct);
            if (image is null) return Productivity.NotFound();
            http.Response.Headers.CacheControl = "private, no-store";
            return Results.File(image.CustomImage!, image.CustomImageContentType!);
        });

        areas.MapPut("/{id:guid}/image", async (Guid id, ClaimsPrincipal principal, AppDbContext db,
            HttpRequest request, TimeProvider clock, CancellationToken ct) =>
        {
            if (!request.HasFormContentType) return Productivity.Invalid("image", "Choose a JPEG, PNG or WebP image.");
            var form = await request.ReadFormAsync(ct);
            var file = form.Files.GetFile("image");
            if (file is null || file.Length is <= 0 or > 5 * 1024 * 1024)
                return Productivity.Invalid("image", "Choose an image no larger than 5 MB.");
            await using var stream = file.OpenReadStream();
            using var memory = new MemoryStream();
            await stream.CopyToAsync(memory, ct);
            var bytes = memory.ToArray();
            var contentType = AreaImageValidation.ContentType(bytes);
            if (contentType is null || !string.Equals(contentType, file.ContentType, StringComparison.OrdinalIgnoreCase))
                return Productivity.Invalid("image", "The file must be a valid JPEG, PNG or WebP image.");
            var owner = principal.GetUserId();
            var area = await db.LifeAreas.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
            if (area is null) return Productivity.NotFound();
            area.CustomImage = bytes;
            area.CustomImageContentType = contentType;
            area.CustomImageUpdatedAtUtc = clock.GetUtcNow();
            await db.SaveChangesAsync(ct);
            return Results.Ok(Response(area));
        }).ValidateAntiforgery();

        areas.MapDelete("/{id:guid}/image", async (Guid id, ClaimsPrincipal principal, AppDbContext db,
            CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            var area = await db.LifeAreas.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
            if (area is null) return Productivity.NotFound();
            area.CustomImage = null;
            area.CustomImageContentType = null;
            area.CustomImageUpdatedAtUtc = null;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).ValidateAntiforgery();
    }

    private static AreaResponse Response(LifeArea area) => new(area.Id, area.Key, area.DisplayName, area.IsActive,
        area.SortOrder, ImageUrl(area.Id, area.CustomImage is not null, area.CustomImageUpdatedAtUtc),
        area.ImageFocalX, area.ImageFocalY);
    private static string? ImageUrl(Guid id, bool hasImage, DateTimeOffset? updatedAt) =>
        hasImage ? $"/api/v1/areas/{id}/image?v={updatedAt?.UtcTicks}" : null;

    private static IResult? Validate(string? displayName, decimal? focalX, decimal? focalY)
    {
        var errors = ValidateErrors(displayName, focalX, focalY, true);
        return errors.Count == 0 ? null : Results.ValidationProblem(errors,
            extensions: new Dictionary<string, object?> { ["code"] = "validation_failed" });
    }

    private static Dictionary<string, string[]> ValidateErrors(string? displayName, decimal? focalX, decimal? focalY,
        bool requireName)
    {
        var errors = new Dictionary<string, string[]>();
        if (requireName && (string.IsNullOrWhiteSpace(displayName) || displayName.Length > 100))
            errors["displayName"] = ["Display name must contain between 1 and 100 characters."];
        if (focalX is < 0 or > 100) errors["imageFocalX"] = ["Focal position must be between 0 and 100."];
        if (focalY is < 0 or > 100) errors["imageFocalY"] = ["Focal position must be between 0 and 100."];
        return errors;
    }

}

public sealed record AreaResponse(Guid Id, string Key, string DisplayName, bool IsActive, int SortOrder,
    string? CustomImageUrl, decimal ImageFocalX, decimal ImageFocalY);
public sealed record CreateAreaRequest(string? DisplayName, decimal? ImageFocalX = null, decimal? ImageFocalY = null);
public sealed record UpdateAreaRequest(string? DisplayName, bool? IsActive, int? SortOrder,
    decimal? ImageFocalX = null, decimal? ImageFocalY = null);
public sealed record UpdateAreaOrderRequest(Guid[]? AreaIds);
