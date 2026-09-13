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
                .Select(value => new SettingsResponse(value.TimeZoneId, value.Locale, value.UiLanguage, value.Theme, value.Density))
                .SingleAsync(cancellationToken);
            return Results.Ok(response);
        });

        settings.MapPatch("/", async (UpdateSettingsRequest request, ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var errors = new Dictionary<string, string[]>();
            if (request.TimeZoneId is not null && !Validation.IsIanaTimeZone(request.TimeZoneId))
            {
                errors["timeZoneId"] = ["Enter a valid IANA time zone, such as Europe/Oslo."];
            }
            if (request.Locale is not null && !Validation.IsLocale(request.Locale))
            {
                errors["locale"] = ["Enter a valid specific locale, such as nb-NO."];
            }
            if (request.UiLanguage is not null and not ("en" or "nb" or "sv" or "da"))
                errors["uiLanguage"] = ["Choose a supported interface language."];
            if (request.Theme is not null and not ("light" or "dark" or "system"))
                errors["theme"] = ["Choose light, dark or system."];
            if (request.Density is not null and not ("normal" or "compact"))
                errors["density"] = ["Choose normal or compact density."];
            if (errors.Count > 0)
            {
                return Results.ValidationProblem(errors,
                    extensions: new Dictionary<string, object?> { ["code"] = "validation_failed" });
            }

            var userId = principal.GetUserId();
            var value = await db.UserSettings.SingleAsync(item => item.UserId == userId, cancellationToken);
            if (request.TimeZoneId is not null) value.TimeZoneId = request.TimeZoneId;
            if (request.Locale is not null) value.Locale = request.Locale;
            if (request.UiLanguage is not null) value.UiLanguage = request.UiLanguage;
            if (request.Theme is not null) value.Theme = request.Theme;
            if (request.Density is not null) value.Density = request.Density;
            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(new SettingsResponse(value.TimeZoneId, value.Locale, value.UiLanguage, value.Theme, value.Density));
        }).ValidateAntiforgery();
    }
}

public sealed record SettingsResponse(string TimeZoneId, string Locale, string UiLanguage, string Theme, string Density);
public sealed record UpdateSettingsRequest(string? TimeZoneId = null, string? Locale = null,
    string? UiLanguage = null, string? Theme = null, string? Density = null);
