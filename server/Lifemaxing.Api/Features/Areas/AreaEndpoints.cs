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
            area.SortOrder = request.SortOrder;
            area.IsActive = request.IsActive;
            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(new AreaResponse(area.Id, area.Key, area.DisplayName, area.IsActive, area.SortOrder));
        }).ValidateAntiforgery();
    }
}

public sealed record AreaResponse(Guid Id, string Key, string DisplayName, bool IsActive, int SortOrder);
public sealed record UpdateAreaRequest(string? DisplayName, bool IsActive, int SortOrder);
