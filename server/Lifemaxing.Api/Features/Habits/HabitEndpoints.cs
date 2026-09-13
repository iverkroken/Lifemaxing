using Lifemaxing.Api.Features.Progression;
using System.Security.Claims;
using System.Text.Json;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Habits;

public static class HabitEndpoints
{
    public static void MapHabitEndpoints(this RouteGroupBuilder api)
    {
        var habits = api.MapGroup("/habits");
        habits.MapHabitWeek();
        habits.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, Guid? areaId, bool? archived, int? page, int? pageSize, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var query = db.Habits.AsNoTracking().Where(x => x.UserId == userId && (archived == true ? x.ArchivedAtUtc != null : x.ArchivedAtUtc == null));
            if (areaId.HasValue) query = query.Where(x => x.LifeAreaId == areaId);
            var number = Math.Min(Productivity.Page(page), 1000000); var size = Productivity.PageSize(pageSize);
            var total = await query.CountAsync(ct);
            var items = await query.OrderByDescending(x => x.CreatedAtUtc).ThenBy(x => x.Id).Skip((number - 1) * size).Take(size).Include(x => x.Schedules).ToListAsync(ct);
            return Results.Ok(new PageResponse<HabitResponse>(items.Select(HabitRules.Response).ToList(), number, size, total));
        });
        habits.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var habit = await db.Habits.AsNoTracking().Include(x => x.Schedules).SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            return habit is null ? Productivity.NotFound() : Results.Ok(HabitRules.Response(habit));
        });
        habits.MapPost("/", async (HabitRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            if (request.XpPerLog is < 1 or > 25) return Productivity.Invalid("xpPerLog", "Use 1 to 25 XP per completion.");
            if (!Productivity.TitleValid(request.Title)) return Productivity.Invalid("title", "Enter a title of 1–200 characters.");
            if (!await Productivity.OwnsArea(db, userId, request.LifeAreaId, ct)) return Productivity.NotFound();
            var day = await Productivity.Day(db, userId, clock, ct);
            var schedule = request.Schedule ?? new ScheduleRequest(day.Date);
            var error = HabitRules.Validate(schedule);
            if (error is not null) return error;
            if (schedule.EffectiveFromDate < day.Date) return Productivity.Invalid("effectiveFromDate", "A new habit starts today or later.");
            var habit = new Habit { Id = Guid.NewGuid(), UserId = userId, Title = request.Title!.Trim(),
                LifeAreaId = request.LifeAreaId, IsActive = request.IsActive, XpPerLog = request.XpPerLog, CreatedAtUtc = day.Now };
            habit.Schedules.Add(HabitRules.Create(habit.Id, schedule, day.TimeZoneId));
            db.Habits.Add(habit);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/habits/{habit.Id}", HabitRules.Response(habit));
        });
        habits.MapPatch("/{id:guid}", async (Guid id, JsonElement patch, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var habit = await db.Habits.Include(x => x.Schedules).SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (habit is null) return Productivity.NotFound();
            if (habit.ArchivedAtUtc is not null) return Productivity.Conflict("Archived habits cannot be edited.");
            var request = Productivity.Patch(new HabitEditRequest(habit.Title, habit.LifeAreaId, habit.IsActive, habit.XpPerLog), patch);
            if (request.XpPerLog is < 1 or > 25) return Productivity.Invalid("xpPerLog", "Use 1 to 25 XP per completion.");
            if (!Productivity.TitleValid(request.Title)) return Productivity.Invalid("title", "Enter a title of 1–200 characters.");
            if (!await Productivity.OwnsArea(db, userId, request.LifeAreaId, ct)) return Productivity.NotFound();
            habit.Title = request.Title!.Trim(); habit.LifeAreaId = request.LifeAreaId; habit.IsActive = request.IsActive; habit.XpPerLog = request.XpPerLog;
            await db.SaveChangesAsync(ct);
            return Results.Ok(HabitRules.Response(habit));
        });
        habits.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var habit = await db.Habits.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (habit is null) return Productivity.NotFound();
            habit.ArchivedAtUtc ??= clock.GetUtcNow(); habit.IsActive = false;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        habits.MapPut("/{id:guid}/schedule", async (Guid id, ScheduleRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var habit = await db.Habits.Include(x => x.Schedules).SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (habit is null) return Productivity.NotFound();
            if (habit.ArchivedAtUtc is not null) return Productivity.Conflict("Archived habits cannot change schedules.");
            var error = HabitRules.Validate(request);
            if (error is not null) return error;
            var day = await Productivity.Day(db, userId, clock, ct);
            var last = habit.Schedules.MaxBy(x => x.EffectiveFromDate)!;
            // Append after the latest scheduled period; never rewrite an already-started day.
            if (request.EffectiveFromDate <= day.Date || request.EffectiveFromDate <= last.EffectiveFromDate)
                return Productivity.Invalid("effectiveFromDate", "Choose a future date after the latest schedule starts.");
            last.EffectiveToDate = request.EffectiveFromDate;
            var next = HabitRules.Create(id, request, day.TimeZoneId);
            db.HabitSchedulePeriods.Add(next);
            habit.Schedules.Add(next);
            await db.SaveChangesAsync(ct);
            return Results.Ok(HabitRules.Response(habit));
        });
        habits.MapGet("/{id:guid}/logs", async (Guid id, ClaimsPrincipal principal, AppDbContext db,
            DateOnly? from, DateOnly? to, int? page, int? pageSize, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            if (!await db.Habits.AnyAsync(x => x.Id == id && x.UserId == userId, ct)) return Productivity.NotFound();
            if (!Productivity.DateValid(from) || !Productivity.DateValid(to))
                return Productivity.Invalid("from", "Use dates between 1900 and 9998.");
            if (from > to) return Productivity.Invalid("from", "Start date must not be after the end date.");
            var query = db.HabitLogs.Where(x => x.HabitId == id && x.UserId == userId);
            if (from.HasValue) query = query.Where(x => x.LocalDate >= from);
            if (to.HasValue) query = query.Where(x => x.LocalDate <= to);
            var number = Math.Min(Productivity.Page(page), 1000000); var size = Productivity.PageSize(pageSize);
            var total = await query.CountAsync(ct);
            var logs = await query.OrderByDescending(x => x.LocalDate).ThenByDescending(x => x.LoggedAtUtc).ThenBy(x => x.Id)
                .Skip((number - 1) * size).Take(size).ToListAsync(ct);
            return Results.Ok(new PageResponse<LogResponse>(logs.Select(HabitRules.Response).ToList(), number, size, total));
        });
        habits.MapPost("/{id:guid}/logs", async (Guid id, LogRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var habit = await db.Habits.Include(x => x.Schedules).SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (habit is null) return Productivity.NotFound();
            if (habit.ArchivedAtUtc is not null || !habit.IsActive) return Productivity.Conflict("Activate the habit before logging it.");
            var day = await Productivity.Day(db, userId, clock, ct);
            var schedule = habit.Schedules.SingleOrDefault(x => HabitRules.Covers(x, request.LocalDate));
            if (schedule is null || !Productivity.DateValid(request.LocalDate) || request.LocalDate > day.Date || !HabitRules.Expected(schedule, request.LocalDate))
                return Productivity.Invalid("localDate", "Choose an expected date between the habit's start and today.");
            if (await db.HabitLogs.AnyAsync(x => x.UserId == userId && x.HabitId == id && x.LocalDate == request.LocalDate && x.ReversedAtUtc == null, ct))
                return Productivity.Conflict("This habit is already logged for that date.");
            var log = new HabitLog { Id = Guid.NewGuid(), UserId = userId, HabitId = id, LocalDate = request.LocalDate,
                TimeZoneId = schedule.TimeZoneId, LoggedAtUtc = day.Now };
            db.HabitLogs.Add(log);
            var xp = await ProgressionRules.Award(db, userId, "HabitLog", log.Id, habit.LifeAreaId, "Habits", habit.XpPerLog,
                new OwnerDay(day.Now, log.LocalDate, log.TimeZoneId), ct);
            ProgressionRules.Record(db, userId, "HabitCompleted", "Habit", id, habit.LifeAreaId, day.Now, $"Completed: {habit.Title} on {log.LocalDate} (+{xp} XP)", log.Id);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/habits/{id}/logs", HabitRules.Response(log));
        });
        habits.MapPost("/{id:guid}/logs/{logId:guid}/revoke", async (Guid id, Guid logId, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var log = await db.HabitLogs.SingleOrDefaultAsync(x => x.Id == logId && x.HabitId == id && x.UserId == userId, ct);
            if (log is null) return Productivity.NotFound();
            if (log.ReversedAtUtc is null)
            {
                log.ReversedAtUtc = clock.GetUtcNow();
                var habit = await db.Habits.SingleAsync(x => x.Id == id && x.UserId == userId, ct);
                var xp = await ProgressionRules.Reverse(db, userId, "HabitLog", log.Id, log.ReversedAtUtc.Value, ct);
                ProgressionRules.Record(db, userId, "HabitReversed", "Habit", id, habit.LifeAreaId, log.ReversedAtUtc.Value, $"Removed completion: {habit.Title} on {log.LocalDate} ({xp} XP)", log.Id);
            }
            await db.SaveChangesAsync(ct);
            return Results.Ok(HabitRules.Response(log));
        });
    }
}
