using Lifemaxing.Api.Common;

namespace Lifemaxing.Api.Features.Habits;

public sealed record ScheduleRequest(DateOnly EffectiveFromDate, string Pattern = "Daily", int[]? DaysOfWeek = null, int? WeeklyTarget = null);
public sealed record HabitRequest(string? Title, Guid? LifeAreaId = null, bool IsActive = true, ScheduleRequest? Schedule = null, int XpPerLog = 10);
public sealed record HabitEditRequest(string? Title, Guid? LifeAreaId, bool IsActive, int XpPerLog = 10);
public sealed record LogRequest(DateOnly LocalDate);
public sealed record ScheduleResponse(Guid Id, DateOnly EffectiveFromDate, DateOnly? EffectiveToDate,
    string TimeZoneId, string Pattern, int[]? DaysOfWeek, int? WeeklyTarget);
public sealed record HabitResponse(Guid Id, string Title, Guid? LifeAreaId, bool IsActive,
    DateTimeOffset CreatedAtUtc, DateTimeOffset? ArchivedAtUtc, IReadOnlyList<ScheduleResponse> Schedules, int XpPerLog);
public sealed record LogResponse(Guid Id, DateOnly LocalDate, string TimeZoneId, DateTimeOffset LoggedAtUtc, DateTimeOffset? ReversedAtUtc);

public static class HabitRules
{
    public static int IsoDay(DateOnly date) => date.DayOfWeek == DayOfWeek.Sunday ? 7 : (int)date.DayOfWeek;
    public static DateOnly WeekStart(DateOnly date) => date.AddDays(1 - IsoDay(date));
    public static bool Covers(HabitSchedulePeriod schedule, DateOnly date) =>
        schedule.EffectiveFromDate <= date && (schedule.EffectiveToDate == null || date < schedule.EffectiveToDate);
    public static bool Expected(HabitSchedulePeriod schedule, DateOnly date) => Covers(schedule, date) &&
        (schedule.Pattern != "SelectedWeekdays" || schedule.DaysOfWeek!.Contains(IsoDay(date)));
    public static IResult? Validate(ScheduleRequest request)
    {
        if (!Productivity.DateValid(request.EffectiveFromDate)) return Productivity.Invalid("effectiveFromDate", "Use dates between 1900 and 9998.");
        var valid = request.Pattern switch
        {
            "Daily" => request.DaysOfWeek is null && request.WeeklyTarget is null,
            "SelectedWeekdays" => request.WeeklyTarget is null && request.DaysOfWeek is { Length: >= 1 and <= 7 } days &&
                days.All(x => x is >= 1 and <= 7) && days.Distinct().Count() == days.Length,
            "WeeklyCount" => request.DaysOfWeek is null && request.WeeklyTarget is >= 1 and <= 7,
            _ => false
        };
        return valid ? null : Productivity.Invalid("schedule", "Choose Daily, distinct ISO weekdays (Monday=1 to Sunday=7), or WeeklyCount with a target of 1–7.");
    }
    public static HabitSchedulePeriod Create(Guid habitId, ScheduleRequest request, string zone) => new()
    {
        Id = Guid.NewGuid(), HabitId = habitId, EffectiveFromDate = request.EffectiveFromDate,
        TimeZoneId = zone, Pattern = request.Pattern, DaysOfWeek = request.DaysOfWeek?.Order().ToArray(), WeeklyTarget = request.WeeklyTarget
    };
    public static HabitResponse Response(Habit habit) => new(habit.Id, habit.Title, habit.LifeAreaId,
        habit.IsActive, habit.CreatedAtUtc, habit.ArchivedAtUtc, habit.Schedules.OrderBy(x => x.EffectiveFromDate)
            .Select(x => new ScheduleResponse(x.Id, x.EffectiveFromDate, x.EffectiveToDate, x.TimeZoneId, x.Pattern, x.DaysOfWeek, x.WeeklyTarget)).ToList(), habit.XpPerLog);
    public static LogResponse Response(HabitLog log) => new(log.Id, log.LocalDate, log.TimeZoneId, log.LoggedAtUtc, log.ReversedAtUtc);
}
