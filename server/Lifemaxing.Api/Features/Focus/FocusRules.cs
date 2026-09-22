namespace Lifemaxing.Api.Features.Focus;

public static class FocusRules
{
    public const int SuspensionSeconds = 180;
    public static FocusConfiguration Normalize(FocusConfiguration config)
    {
        config = config.Method switch
        {
            "Pomodoro" => new(), "Balanced" => new("Balanced", 50, 10),
            "Deep Work" => new("Deep Work", 90, 20), "Quick Focus" => new("Quick Focus", 15, 3),
            "Custom" or "Smart Focus" => config,
            _ => throw new ArgumentException("Choose a supported focus method.")
        };
        if (config.FocusMinutes is < 1 or > 240 || config.BreakMinutes is < 1 or > 120 || config.LongBreakMinutes is < 1 or > 120
            || config.SessionsBeforeLongBreak is < 1 or > 12 || config.TotalSessions is < 1 or > 48 || config.SmartMinutes is < 5 or > 720)
            throw new ArgumentException("Use work 1–240 min, breaks 1–120 min, cycles 1–12, sessions 1–48 and Smart total 5–720 min.");
        return config;
    }

    public static List<FocusPeriod> Schedule(FocusConfiguration config)
    {
        if (config.Method != "Smart Focus")
        {
            var periods = new List<FocusPeriod>();
            for (var i = 0; i < (config.TotalSessions ?? config.SessionsBeforeLongBreak) * 2; i++)
                if (Period(config, i) is { } period) periods.Add(period);
            return periods;
        }
        var total = config.SmartMinutes;
        if (total < 20) return [new("Focus", total * 60, 1)];
        var rest = total <= 45 ? 5 : 10;
        var work = total <= 45 ? 25 : total <= 150 ? 50 : 80;
        var cycles = Math.Max(1, (int)Math.Round((double)total / (work + rest), MidpointRounding.AwayFromZero));
        var workTotal = total - cycles * rest;
        var result = new List<FocusPeriod>();
        for (var i = 0; i < cycles; i++)
        {
            result.Add(new("Focus", (workTotal / cycles + (i < workTotal % cycles ? 1 : 0)) * 60, i + 1));
            result.Add(new("Break", rest * 60, i + 1));
        }
        return result;
    }

    public static FocusPeriod? Period(FocusConfiguration config, int index)
    {
        if (config.Method == "Smart Focus") return Schedule(config).ElementAtOrDefault(index);
        if (config.TotalSessions is { } count && index >= count * 2 - 1) return null;
        var session = index / 2 + 1;
        var longBreak = config.Method is "Pomodoro" or "Custom" && session % config.SessionsBeforeLongBreak == 0;
        return index % 2 == 0 ? new("Focus", config.FocusMinutes * 60, session)
            : new("Break", (longBreak ? config.LongBreakMinutes : config.BreakMinutes) * 60, session);
    }

    // A deadline alone never proves continuous work. Call before any phase transition.
    public static int Observe(FocusRun run, DateTimeOffset now, bool interrupted)
    {
        if (run.State != "Running") return 0;
        var gap = (now - run.LastObservedAtUtc).TotalSeconds;
        if (interrupted || gap > SuspensionSeconds || gap < -2)
        {
            run.State = "Interrupted"; run.InterruptedAtUtc = run.LastObservedAtUtc;
            run.EndsAtUtc = null; run.BlockAutoStart = true;
            return 0;
        }
        var elapsed = Math.Min(run.RemainingSeconds, Math.Max(0, (int)gap));
        run.RemainingSeconds -= elapsed;
        run.LastObservedAtUtc = run.LastObservedAtUtc.AddSeconds(elapsed);
        if (run.RemainingSeconds == 0) { run.State = "Ready"; run.EndsAtUtc = null; }
        return run.Phase == "Focus" ? elapsed : 0;
    }

    public static int CountInactive(FocusRun run, DateTimeOffset now)
    {
        if (run.State != "Interrupted") throw new ArgumentException("Resolve an interrupted session first.");
        var seconds = Math.Min(run.RemainingSeconds, Math.Max(0, (int)(now - run.InterruptedAtUtc!.Value).TotalSeconds));
        run.RemainingSeconds -= seconds; run.LastObservedAtUtc = now;
        run.State = run.RemainingSeconds == 0 ? "Ready" : "Paused";
        run.BlockAutoStart = true; run.EndsAtUtc = null;
        return run.Phase == "Focus" ? seconds : 0;
    }
}
