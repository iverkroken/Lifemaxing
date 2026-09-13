using System.Security.Claims;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Habits;

public static class HabitWeek
{
    public static void MapHabitWeek(this RouteGroupBuilder habits)
    {
        habits.MapGet("/week", async (ClaimsPrincipal principal, AppDbContext db, TimeProvider clock,
            DateOnly? date, Guid? areaId, int? page, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var today = await Productivity.Day(db, userId, clock, ct);
            if (!Productivity.DateValid(date)) return Productivity.Invalid("date", "Use dates between 1900 and 9998.");
            var start = HabitRules.WeekStart(date ?? today.Date);
            var end = start.AddDays(6);
            var query = db.Habits.AsNoTracking().Where(habit => habit.UserId == userId && habit.ArchivedAtUtc == null);
            if (areaId.HasValue) query = query.Where(habit => habit.LifeAreaId == areaId);
            var number = Math.Min(Productivity.Page(page), 1000000);
            const int size = 12;
            var total = await query.CountAsync(ct);
            var items = await query.OrderBy(habit => habit.Title).ThenBy(habit => habit.Id)
                .Skip((number - 1) * size).Take(size)
                .Include(habit => habit.Schedules.Where(schedule => schedule.EffectiveFromDate <= end &&
                    (schedule.EffectiveToDate == null || schedule.EffectiveToDate > start))).ToListAsync(ct);
            var ids = items.Select(habit => habit.Id).ToArray();
            // Aggregate corrections in SQL: repeated corrections do not grow the response or fabricate missed days.
            var logs = await db.HabitLogs.AsNoTracking().Where(log => log.UserId == userId && ids.Contains(log.HabitId) &&
                    log.LocalDate >= start && log.LocalDate <= end)
                .GroupBy(log => new { log.HabitId, log.LocalDate })
                .Select(group => new { group.Key.HabitId, group.Key.LocalDate,
                    Completed = group.Any(log => log.ReversedAtUtc == null), Corrected = group.Any(log => log.ReversedAtUtc != null) }).ToListAsync(ct);
            var rows = items.Select(habit => new
            {
                habit.Id, habit.Title, habit.IsActive,
                Days = Enumerable.Range(0, 7).Select(offset =>
                {
                    var localDate = start.AddDays(offset);
                    var schedule = habit.Schedules.SingleOrDefault(value => HabitRules.Covers(value, localDate));
                    var log = logs.SingleOrDefault(value => value.HabitId == habit.Id && value.LocalDate == localDate);
                    var state = log?.Completed == true ? "completed" : log?.Corrected == true ? "corrected" :
                        schedule is null || !HabitRules.Expected(schedule, localDate) ? "notPlanned" :
                        localDate > today.Date ? "future" : schedule.Pattern == "WeeklyCount" ? "flexible" : "planned";
                    return new { LocalDate = localDate, State = state, WasCorrected = log?.Corrected == true,
                        schedule?.WeeklyTarget };
                }).ToArray()
            }).ToArray();
            return Results.Ok(new { Start = start, CurrentLocalDate = today.Date, Items = rows, Page = number, PageSize = size, Total = total });
        });
    }
}
