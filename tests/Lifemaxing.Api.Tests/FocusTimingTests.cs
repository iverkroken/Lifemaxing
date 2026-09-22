using Lifemaxing.Api.Features.Focus;
using Xunit;

namespace Lifemaxing.Api.Tests;

public sealed class FocusTimingTests
{
    private static readonly DateTimeOffset Start = DateTimeOffset.Parse("2026-09-22T14:00:00Z");

    [Theory]
    [InlineData("Pomodoro", 1500, 300)]
    [InlineData("Balanced", 3000, 600)]
    [InlineData("Deep Work", 5400, 1200)]
    [InlineData("Quick Focus", 900, 180)]
    public void PresetsHaveExpectedDurations(string method, int focus, int rest)
    {
        var config = FocusRules.Normalize(new FocusConfiguration(Method: method));
        Assert.Equal(focus, FocusRules.Period(config, 0)!.Seconds);
        Assert.Equal(rest, FocusRules.Period(config, 1)!.Seconds);
    }

    [Fact]
    public void FourthPomodoroHasLongBreakAndFiniteCustomStopsAfterWork()
    {
        Assert.Equal(1200, FocusRules.Period(FocusRules.Normalize(new()), 7)!.Seconds);
        var custom = FocusRules.Normalize(new("Custom", 40, 8, 25, 3, 3));
        Assert.Equal(2400, FocusRules.Period(custom, 4)!.Seconds);
        Assert.Null(FocusRules.Period(custom, 5));
    }

    [Theory]
    [InlineData(30, 2, 1500)]
    [InlineData(60, 2, 3000)]
    [InlineData(120, 4, 3000)]
    [InlineData(180, 4, 4800)]
    public void SmartScheduleIncludesBreaksInExactTotal(int minutes, int count, int first)
    {
        var schedule = FocusRules.Schedule(FocusRules.Normalize(new("Smart Focus", SmartMinutes: minutes)));
        Assert.Equal(count, schedule.Count);
        Assert.Equal(first, schedule[0].Seconds);
        Assert.Equal(minutes * 60, schedule.Sum(x => x.Seconds));
    }

    [Fact]
    public void EverySupportedSmartTotalIsExactAndPositive()
    {
        for (var minutes = 5; minutes <= 720; minutes++)
        {
            var schedule = FocusRules.Schedule(FocusRules.Normalize(new("Smart Focus", SmartMinutes: minutes)));
            Assert.Equal(minutes * 60, schedule.Sum(x => x.Seconds));
            Assert.All(schedule, x => Assert.True(x.Seconds > 0));
        }
        Assert.Throws<ArgumentException>(() => FocusRules.Normalize(new("Custom", FocusMinutes: 0)));
        Assert.Throws<ArgumentException>(() => FocusRules.Normalize(new("Smart Focus", SmartMinutes: 721)));
    }

    [Fact]
    public void HealthyCheckpointsCompleteButSuspensionPreservesRemainingWork()
    {
        var run = Running(3000);
        for (var seconds = 60; seconds <= 1200; seconds += 60)
            FocusRules.Observe(run, Start.AddSeconds(seconds), false);
        Assert.Equal(1800, run.RemainingSeconds);
        FocusRules.Observe(run, Start.AddHours(1), false);
        Assert.Equal("Interrupted", run.State);
        Assert.Equal(1800, run.RemainingSeconds);
        Assert.Equal(Start.AddMinutes(20), run.InterruptedAtUtc);
    }

    [Fact]
    public void ShortBackgroundDelaysDoNotInterruptAndExpiryIsCapped()
    {
        var run = Running(120);
        Assert.Equal(65, FocusRules.Observe(run, Start.AddSeconds(65), false));
        Assert.Equal("Running", run.State);
        Assert.Equal(55, FocusRules.Observe(run, Start.AddSeconds(130), false));
        Assert.Equal("Ready", run.State);
        Assert.Equal(0, run.RemainingSeconds);
    }

    [Fact]
    public void FreezeIsAnInterruptionEvenBeforeTheGapThreshold()
    {
        var run = Running(1500);
        FocusRules.Observe(run, Start.AddSeconds(10), true);
        Assert.Equal("Interrupted", run.State);
        Assert.Equal(1500, run.RemainingSeconds);
    }

    [Fact]
    public void ConfirmedInactiveTimeCannotPassOriginalBoundary()
    {
        var run = Running(1800);
        run.State = "Interrupted";
        run.InterruptedAtUtc = Start;
        Assert.Equal(1800, FocusRules.CountInactive(run, Start.AddHours(1)));
        Assert.Equal(0, run.RemainingSeconds);
        Assert.Equal("Ready", run.State);
        Assert.True(run.BlockAutoStart);
    }

    private static FocusRun Running(int seconds) => new()
    {
        State = "Running", Phase = "Focus", RemainingSeconds = seconds,
        LastObservedAtUtc = Start, EndsAtUtc = Start.AddSeconds(seconds)
    };
}
