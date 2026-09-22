using System.Security.Claims;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Focus;

public sealed record FocusPreferencesDto(FocusConfiguration? Custom = null, bool SoundEnabled = true, string Sound = "Soft Alarm",
    int Volume = 25, bool FocusSound = true, bool BreakSound = true, bool Notifications = false, bool AutoBreak = false,
    bool AutoFocus = false, bool KeepAwake = false, int DailyGoalMinutes = 120, bool WorldClockInitialized = false);
public sealed record DailyFocusGoalRequest(int DailyGoalMinutes);
public sealed record WorldCityRequest(string Name, string TimeZoneId);
public sealed record WorldCityResponse(Guid Id, string Name, string TimeZoneId, int Position);
public sealed record CityOrder(Guid[] Ids);

public static class FocusHubEndpoints
{
    public static void MapFocusHub(this RouteGroupBuilder api)
    {
        api.MapGet("/focus-runs/active", async (ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            var run = await db.Set<FocusRun>().SingleOrDefaultAsync(x => x.UserId == owner && x.EndedAtUtc == null, ct);
            return Results.Ok(new { run = run == null ? null : await FocusRunService.Response(run, clock.GetUtcNow(), db, ct) });
        });
        api.MapPost("/focus-runs/preview", (FocusConfiguration config) =>
        {
            try { return Results.Ok(new { configuration = FocusRules.Normalize(config), periods = FocusRules.Schedule(FocusRules.Normalize(config)) }); }
            catch (ArgumentException e) { return Productivity.Invalid("configuration", e.Message); }
        });
        api.MapPost("/focus-runs", (FocusRunStart request, ClaimsPrincipal principal, FocusRunService service, CancellationToken ct) => service.Start(principal.GetUserId(), request, ct));
        api.MapPost("/focus-runs/{id:guid}/action", (Guid id, FocusRunAction request, ClaimsPrincipal principal, FocusRunService service, CancellationToken ct) => service.Change(principal.GetUserId(), id, request, ct));
        api.MapGet("/focus-preferences", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var prefs = await db.Set<FocusPreferences>().SingleOrDefaultAsync(x => x.UserId == principal.GetUserId(), ct);
            return Results.Ok(ToDto(prefs ?? new()));
        });
        api.MapPut("/focus-preferences", async (FocusPreferencesDto request, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            if (request.Volume is < 0 or > 100 || !new[] { "Soft Alarm", "Focus Bell", "Gentle Digital", "Rising Chime", "Ambient Alert", "Warm Gong", "Minimal Alarm", "Soft Chime", "Bell", "Digital", "Ambient", "Minimal" }.Contains(request.Sound))
                return Productivity.Invalid("sound", "Choose a sound and volume from 0 to 100.");
            FocusConfiguration custom;
            try { custom = FocusRules.Normalize((request.Custom ?? new("Custom")) with { Method = "Custom" }); }
            catch (ArgumentException e) { return Productivity.Invalid("custom", e.Message); }
            var owner = principal.GetUserId();
            var prefs = await db.Set<FocusPreferences>().SingleOrDefaultAsync(x => x.UserId == owner, ct);
            if (prefs == null) { prefs = new() { UserId = owner }; db.Add(prefs); }
            prefs.Custom = custom; prefs.Volume = request.Volume; prefs.Sound = request.Sound; prefs.SoundEnabled = request.SoundEnabled;
            prefs.FocusSound = request.FocusSound; prefs.BreakSound = request.BreakSound; prefs.Notifications = request.Notifications;
            prefs.AutoBreak = request.AutoBreak; prefs.AutoFocus = request.AutoFocus; prefs.KeepAwake = request.KeepAwake;
            await db.SaveChangesAsync(ct); return Results.Ok(ToDto(prefs));
        });
        api.MapPut("/focus-preferences/daily-goal", async (DailyFocusGoalRequest request, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            if (request.DailyGoalMinutes is < 15 or > 1440 || request.DailyGoalMinutes % 15 != 0)
                return Productivity.Invalid("dailyGoalMinutes", "Choose 15 minutes to 24 hours in 15-minute increments.");
            var owner = principal.GetUserId();
            var prefs = await db.Set<FocusPreferences>().SingleOrDefaultAsync(x => x.UserId == owner, ct);
            if (prefs == null) { prefs = new() { UserId = owner }; db.Add(prefs); }
            prefs.DailyGoalMinutes = request.DailyGoalMinutes;
            await db.SaveChangesAsync(ct); return Results.Ok(ToDto(prefs));
        });
        api.MapPost("/world-clock/initialize", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            // ProductivityWriteFilter serializes mutations per owner, including first initialization.
            var owner = principal.GetUserId();
            var prefs = await db.Set<FocusPreferences>().SingleOrDefaultAsync(x => x.UserId == owner, ct);
            if (prefs == null) { prefs = new() { UserId = owner }; db.Add(prefs); }
            if (!prefs.WorldClockInitialized)
            {
                if (!await db.Set<WorldClockCity>().AnyAsync(x => x.UserId == owner, ct))
                {
                    var defaults = new[] { ("London", "Europe/London"), ("New York", "America/New_York"), ("Tokyo", "Asia/Tokyo"), ("Sydney", "Australia/Sydney") };
                    for (var i = 0; i < defaults.Length; i++)
                        db.Add(new WorldClockCity { Id = Guid.NewGuid(), UserId = owner, Name = defaults[i].Item1, TimeZoneId = defaults[i].Item2, Position = i });
                }
                prefs.WorldClockInitialized = true;
                await db.SaveChangesAsync(ct);
            }
            return Results.Ok(new { initialized = true });
        });
        api.MapGet("/world-clock", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
            Results.Ok(await db.Set<WorldClockCity>().Where(x => x.UserId == principal.GetUserId()).OrderBy(x => x.Position).ThenBy(x => x.Id)
                .Select(x => new WorldCityResponse(x.Id, x.Name, x.TimeZoneId, x.Position)).ToListAsync(ct)));
        api.MapPost("/world-clock", async (WorldCityRequest request, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 100 || !Validation.IsIanaTimeZone(request.TimeZoneId))
                return Productivity.Invalid("city", "Choose a city with a valid IANA time zone.");
            var owner = principal.GetUserId(); var cities = db.Set<WorldClockCity>().Where(x => x.UserId == owner);
            if (await cities.CountAsync(ct) >= 100) return Productivity.Conflict("Remove a city before adding another.");
            if (await cities.AnyAsync(x => x.Name == request.Name.Trim() && x.TimeZoneId == request.TimeZoneId, ct)) return Productivity.Conflict("This city is already saved.");
            var city = new WorldClockCity { Id = Guid.NewGuid(), UserId = owner, Name = request.Name.Trim(), TimeZoneId = request.TimeZoneId,
                Position = (await cities.Select(x => (int?)x.Position).MaxAsync(ct) ?? -1) + 1 };
            db.Add(city); await db.SaveChangesAsync(ct);
            return Results.Created("/api/v1/world-clock/" + city.Id, new WorldCityResponse(city.Id, city.Name, city.TimeZoneId, city.Position));
        });
        api.MapDelete("/world-clock/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var city = await db.Set<WorldClockCity>().SingleOrDefaultAsync(x => x.Id == id && x.UserId == principal.GetUserId(), ct);
            if (city == null) return Productivity.NotFound(); db.Remove(city); await db.SaveChangesAsync(ct); return Results.NoContent();
        });
        api.MapPut("/world-clock/order", async (CityOrder request, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var cities = await db.Set<WorldClockCity>().Where(x => x.UserId == principal.GetUserId()).ToListAsync(ct);
            if (request.Ids == null || request.Ids.Length != cities.Count || request.Ids.Distinct().Count() != cities.Count || cities.Any(x => !request.Ids.Contains(x.Id)))
                return Productivity.Invalid("ids", "Include each saved city once.");
            foreach (var city in cities) city.Position = Array.IndexOf(request.Ids, city.Id);
            await db.SaveChangesAsync(ct); return Results.Ok(new { saved = true });
        });
        api.MapGet("/focus-summary", Summary);
    }

    private static FocusPreferencesDto ToDto(FocusPreferences prefs) => new(prefs.Custom, prefs.SoundEnabled, prefs.Sound, prefs.Volume,
        prefs.FocusSound, prefs.BreakSound, prefs.Notifications, prefs.AutoBreak, prefs.AutoFocus, prefs.KeepAwake, prefs.DailyGoalMinutes, prefs.WorldClockInitialized);

    private static async Task<IResult> Summary(ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var owner = principal.GetUserId(); var settings = await db.UserSettings.SingleAsync(x => x.UserId == owner, ct);
        var zone = TimeZoneInfo.FindSystemTimeZoneById(settings.TimeZoneId);
        var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.GetUtcNow(), zone).DateTime);
        var monday = date.AddDays(-((int)date.DayOfWeek + 6) % 7);
        DateTimeOffset Boundary(DateOnly day)
        {
            var local = day.ToDateTime(TimeOnly.MinValue);
            // Some IANA zones advance at midnight; use the first existing instant.
            while (zone.IsInvalidTime(local)) local = local.AddMinutes(1);
            var offset = zone.IsAmbiguousTime(local) ? zone.GetAmbiguousTimeOffsets(local).Max() : zone.GetUtcOffset(local);
            return new DateTimeOffset(local, offset).ToUniversalTime();
        }
        async Task<Dictionary<DateOnly, long>> ReadDays(DateOnly first, DateOnly last)
        {
            var from = Boundary(first); var until = Boundary(last.AddDays(1));
            var spans = await db.Set<FocusWorkSpan>().Where(x => x.UserId == owner && x.EndedAtUtc > from && x.StartedAtUtc < until
                && db.FocusSessions.Any(s => s.Id == x.FocusSessionId && s.Status != "Cancelled"))
                .Select(x => new { x.StartedAtUtc, x.EndedAtUtc }).ToListAsync(ct);
            // Untimed legacy records keep their existing start-date bucket, without invented spans.
            var legacy = await db.FocusSessions.Where(x => x.UserId == owner && x.FocusRunId == null && x.EndedAtUtc != null
                && x.Status != "Cancelled" && x.StartedAtUtc >= from && x.StartedAtUtc < until)
                .Select(x => new { x.StartedAtUtc, x.AccumulatedSeconds }).ToListAsync(ct);
            var totals = new Dictionary<DateOnly, long>();
            for (var day = first; day <= last; day = day.AddDays(1))
            {
                var start = Boundary(day); var end = Boundary(day.AddDays(1));
                totals[day] = (long)spans.Sum(x => Math.Max(0, ((x.EndedAtUtc < end ? x.EndedAtUtc : end) - (x.StartedAtUtc > start ? x.StartedAtUtc : start)).TotalSeconds))
                    + legacy.Where(x => x.StartedAtUtc >= start && x.StartedAtUtc < end).Sum(x => x.AccumulatedSeconds);
            }
            return totals;
        }
        // Fetch bounded windows, continuing backwards only while the streak remains unbroken.
        var firstDay = date.AddDays(-31); var days = await ReadDays(firstDay, date);
        var todaySeconds = days[date]; var yesterdaySeconds = days[date.AddDays(-1)];
        var weekSeconds = days.Where(x => x.Key >= monday).Sum(x => x.Value);
        var streakDays = 0; var cursor = todaySeconds >= 60 ? date : date.AddDays(-1);
        while (true)
        {
            if (cursor < firstDay) { var last = firstDay.AddDays(-1); firstDay = last.AddDays(-31); days = await ReadDays(firstDay, last); }
            if (days[cursor] < 60) break;
            streakDays++; cursor = cursor.AddDays(-1);
        }
        var today = Boundary(date); var tomorrow = Boundary(date.AddDays(1));
        var sessions = await db.FocusSessions.CountAsync(x => x.UserId == owner && x.Status == "Completed" && x.EndedAtUtc >= today && x.EndedAtUtc < tomorrow && x.AccumulatedSeconds > 0, ct);
        return Results.Ok(new { todaySeconds, yesterdaySeconds, streakDays, weekSeconds, sessions });
    }
}
