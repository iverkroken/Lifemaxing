namespace Lifemaxing.Api.Features.Habits;

public sealed class Habit
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? LifeAreaId { get; set; }
    public string Title { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? ArchivedAtUtc { get; set; }
    public List<HabitSchedulePeriod> Schedules { get; set; } = [];
}

public sealed class HabitSchedulePeriod
{
    public Guid Id { get; set; }
    public Guid HabitId { get; set; }
    public DateOnly EffectiveFromDate { get; set; }
    // Exclusive end: the next schedule starts on this date.
    public DateOnly? EffectiveToDate { get; set; }
    public string TimeZoneId { get; set; } = "";
    public string Pattern { get; set; } = "Daily";
    public int[]? DaysOfWeek { get; set; }
    public int? WeeklyTarget { get; set; }
}

public sealed class HabitLog
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid HabitId { get; set; }
    public DateOnly LocalDate { get; set; }
    public string TimeZoneId { get; set; } = "";
    public DateTimeOffset LoggedAtUtc { get; set; }
    public DateTimeOffset? ReversedAtUtc { get; set; }
}
