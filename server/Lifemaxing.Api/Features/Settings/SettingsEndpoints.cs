using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Lifemaxing.Api.Features.Settings;

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this WebApplication app)
    {
        var settings = app.MapGroup("/api/v1/settings").RequireAuthorization();

        settings.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var userId = principal.GetUserId();
            var response = await db.UserSettings
                .Where(value => value.UserId == userId)
                .Select(value => new SettingsResponse(value.TimeZoneId, value.Locale))
                .SingleAsync(cancellationToken);
            return Results.Ok(response);
        });

        settings.MapPatch("/", async (UpdateSettingsRequest request, ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var errors = new Dictionary<string, string[]>();
            if (!Validation.IsIanaTimeZone(request.TimeZoneId))
            {
                errors["timeZoneId"] = ["Enter a valid IANA time zone, such as Europe/Oslo."];
            }
            if (!Validation.IsLocale(request.Locale))
            {
                errors["locale"] = ["Enter a valid specific locale, such as nb-NO."];
            }
            if (errors.Count > 0)
            {
                return Results.ValidationProblem(errors,
                    extensions: new Dictionary<string, object?> { ["code"] = "validation_failed" });
            }

            var userId = principal.GetUserId();
            var value = await db.UserSettings.SingleAsync(item => item.UserId == userId, cancellationToken);
            value.TimeZoneId = request.TimeZoneId;
            value.Locale = request.Locale;
            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(new SettingsResponse(value.TimeZoneId, value.Locale));
        }).ValidateAntiforgery();
    }
}

public sealed record SettingsResponse(string TimeZoneId, string Locale);
public sealed record UpdateSettingsRequest(string TimeZoneId, string Locale);
