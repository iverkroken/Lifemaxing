using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Progression;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Focus;

public sealed record FocusConfiguration(string Method = "Pomodoro", int FocusMinutes = 25, int BreakMinutes = 5,
    int LongBreakMinutes = 20, int SessionsBeforeLongBreak = 4, int? TotalSessions = null, int SmartMinutes = 120);
public sealed record FocusPeriod(string Phase, int Seconds, int SessionNumber);
public sealed record FocusReference(Guid? TaskId = null, Guid? GoalId = null, Guid? HabitId = null);

public sealed class FocusRun
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public FocusConfiguration Configuration { get; set; } = new();
    public int RuleVersion { get; set; } = 1;
    public string State { get; set; } = "Running";
    public string Phase { get; set; } = "Focus";
    public int PeriodIndex { get; set; }
    public int RemainingSeconds { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset? EndedAtUtc { get; set; }
    public DateTimeOffset LastObservedAtUtc { get; set; }
    public DateTimeOffset? EndsAtUtc { get; set; }
    public DateTimeOffset? InterruptedAtUtc { get; set; }
    public Guid ControllerId { get; set; }
    public long Revision { get; set; }
    public bool BlockAutoStart { get; set; }
    public Guid? TaskId { get; set; }
    public Guid? GoalId { get; set; }
    public Guid? HabitId { get; set; }
}

public sealed class FocusWorkSpan
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid FocusSessionId { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset EndedAtUtc { get; set; }
}

public sealed class FocusPreferences
{
    public Guid UserId { get; set; }
    public FocusConfiguration Custom { get; set; } = new("Custom");
    public bool SoundEnabled { get; set; } = true;
    public string Sound { get; set; } = "Soft Alarm";
    public int Volume { get; set; } = 25;
    public bool FocusSound { get; set; } = true;
    public bool BreakSound { get; set; } = true;
    public bool Notifications { get; set; }
    public bool AutoBreak { get; set; }
    public bool AutoFocus { get; set; }
    public bool KeepAwake { get; set; }
    public int DailyGoalMinutes { get; set; } = 120;
    public bool WorldClockInitialized { get; set; }
}

public sealed class WorldClockCity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public string TimeZoneId { get; set; } = "";
    public int Position { get; set; }
}

public static class FocusModel
{
    public static void Configure(ModelBuilder model)
    {
        var run = model.Entity<FocusRun>();
        run.ToTable("FocusRuns", t => t.HasCheckConstraint("CK_FocusRun_State", "\"RemainingSeconds\" >= 0 AND \"PeriodIndex\" >= 0 AND \"State\" IN ('Running','Paused','Interrupted','Ready','Ended') AND \"Phase\" IN ('Focus','Break')"));
        run.Property(x => x.State).HasMaxLength(20); run.Property(x => x.Phase).HasMaxLength(10);
        run.HasIndex(x => x.UserId).IsUnique().HasFilter("\"EndedAtUtc\" IS NULL");
        run.OwnsOne(x => x.Configuration);
        var span = model.Entity<FocusWorkSpan>();
        span.ToTable("FocusWorkSpans", t => t.HasCheckConstraint("CK_FocusSpan_Time", "\"EndedAtUtc\" >= \"StartedAtUtc\""));
        span.HasOne<FocusSession>().WithMany().HasForeignKey(x => x.FocusSessionId).OnDelete(DeleteBehavior.Restrict);
        span.HasIndex(x => new { x.UserId, x.StartedAtUtc });
        var prefs = model.Entity<FocusPreferences>();
        prefs.ToTable("FocusPreferences", t => {
            t.HasCheckConstraint("CK_FocusPreferences_Volume", "\"Volume\" BETWEEN 0 AND 100");
            t.HasCheckConstraint("CK_FocusPreferences_DailyGoal", "\"DailyGoalMinutes\" BETWEEN 15 AND 1440 AND \"DailyGoalMinutes\" % 15 = 0");
        });
        prefs.Property(x => x.DailyGoalMinutes).HasDefaultValue(120);
        prefs.HasKey(x => x.UserId); prefs.Property(x => x.Sound).HasMaxLength(30); prefs.OwnsOne(x => x.Custom);
        var city = model.Entity<WorldClockCity>();
        city.ToTable("WorldClockCities"); city.Property(x => x.Name).HasMaxLength(100); city.Property(x => x.TimeZoneId).HasMaxLength(100);
        city.HasIndex(x => new { x.UserId, x.Name, x.TimeZoneId }).IsUnique();
        model.Entity<FocusSession>().HasOne<FocusRun>().WithMany().HasForeignKey(x => x.FocusRunId).OnDelete(DeleteBehavior.Restrict);
        foreach (var type in new[] { typeof(FocusRun), typeof(FocusWorkSpan), typeof(FocusPreferences), typeof(WorldClockCity) })
            model.Entity(type).HasOne(typeof(AppUser)).WithMany().HasForeignKey("UserId").OnDelete(DeleteBehavior.Restrict);
    }
}
