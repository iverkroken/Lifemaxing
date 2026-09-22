using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Progression;
using Lifemaxing.Api.Features.Tasks;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Focus;

public sealed record FocusRunStart(Guid ControllerId, FocusConfiguration? Configuration = null, FocusReference? Reference = null);
public sealed record FocusRunAction(string Action, Guid ControllerId, long Revision, bool Interrupted = false,
    FocusReference? Reference = null, bool CompleteTask = false);
public sealed record FocusRunResponse(Guid Id, FocusConfiguration Configuration, string State, string Phase, int PeriodIndex,
    int RemainingSeconds, int PeriodSeconds, int SessionNumber, DateTimeOffset? EndsAtUtc, DateTimeOffset LastObservedAtUtc,
    DateTimeOffset? InterruptedAtUtc, DateTimeOffset? EndedAtUtc, Guid ControllerId, long Revision, bool BlockAutoStart,
    FocusReference Reference, DateTimeOffset ServerNow, FocusPeriod? NextPeriod, FocusReference CurrentReference);

public sealed class FocusRunService(AppDbContext db, TimeProvider clock)
{
    public static async Task<FocusRunResponse> Response(FocusRun run, DateTimeOffset now, AppDbContext db, CancellationToken ct)
    {
        var currentReference = await db.FocusSessions.Where(x => x.FocusRunId == run.Id && x.UserId == run.UserId)
            .OrderByDescending(x => x.StartedAtUtc).ThenByDescending(x => x.Id)
            .Select(x => new FocusReference(x.TaskId, x.GoalId, x.HabitId)).FirstOrDefaultAsync(ct) ?? new();
        return new(run.Id, run.Configuration, run.State, run.Phase,
        run.PeriodIndex, run.RemainingSeconds, FocusRules.Period(run.Configuration, run.PeriodIndex)?.Seconds ?? 0,
        run.PeriodIndex / 2 + 1, run.EndsAtUtc, run.LastObservedAtUtc, run.InterruptedAtUtc, run.EndedAtUtc, run.ControllerId,
        run.Revision, run.BlockAutoStart, new(run.TaskId, run.GoalId, run.HabitId), now, FocusRules.Period(run.Configuration, run.PeriodIndex + 1), currentReference);
    }

    public async Task<IResult> Start(Guid owner, FocusRunStart request, CancellationToken ct)
    {
        if (request.ControllerId == Guid.Empty) return Productivity.Invalid("controllerId", "Choose a controller identity.");
        FocusConfiguration config;
        try { config = FocusRules.Normalize(request.Configuration ?? new()); }
        catch (ArgumentException e) { return Productivity.Invalid("configuration", e.Message); }
        var reference = request.Reference ?? new();
        var error = await ValidateReference(owner, reference, ct); if (error != null) return error;
        if (await db.Set<FocusRun>().AnyAsync(x => x.UserId == owner && x.EndedAtUtc == null, ct)
            || await db.FocusSessions.AnyAsync(x => x.UserId == owner && x.EndedAtUtc == null, ct))
            return Productivity.Conflict("End or continue your current focus first.");
        var now = clock.GetUtcNow();
        var run = new FocusRun { Id = Guid.NewGuid(), UserId = owner, Configuration = config, ControllerId = request.ControllerId,
            StartedAtUtc = now, TaskId = reference.TaskId, GoalId = reference.GoalId, HabitId = reference.HabitId };
        db.Add(run); await BeginPeriod(run, now, ct);
        await db.SaveChangesAsync(ct);
        return Results.Created("/api/v1/focus-runs/" + run.Id, await Response(run, now, db, ct));
    }

    public async Task<IResult> Change(Guid owner, Guid id, FocusRunAction command, CancellationToken ct)
    {
        var run = await db.Set<FocusRun>().SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
        if (run == null) return Productivity.NotFound();
        if (run.EndedAtUtc != null) return Productivity.Conflict("This focus run has ended.");
        if (run.Revision != command.Revision) return Productivity.Conflict("Focus changed in another window. Refresh and try again.");
        if (command.ControllerId == Guid.Empty || (command.Action != "takeover" && run.ControllerId != command.ControllerId))
            return Productivity.Conflict("Continue on this device before controlling focus.");
        if (!new[] { "checkpoint", "pause", "resume", "stop", "cancel", "next", "skip", "reference", "takeover", "recover-resume", "recover-count", "recover-end" }.Contains(command.Action))
            return Productivity.Invalid("action", "Choose a supported focus action.");
        var now = clock.GetUtcNow();
        var session = await db.FocusSessions.SingleOrDefaultAsync(x => x.FocusRunId == id && x.EndedAtUtc == null, ct);
        var wasRunning = run.State == "Running";
        var from = run.LastObservedAtUtc;
        var credit = FocusRules.Observe(run, now, command.Interrupted || command.Action == "takeover");
        await Credit(session, from, credit, ct);
        if (session != null && run.State != "Running") { session.Status = "Paused"; session.RunningSinceUtc = null; }
        if (run.State == "Ready" && session != null) { await Finish(session, "Completed", now, ct); session = null; }

        // A newly discovered interruption must be resolved explicitly, even if the arriving command was Stop/Next.
        if (run.State == "Interrupted" && wasRunning && command.Action != "takeover")
        {
            run.Revision++; await db.SaveChangesAsync(ct); return Results.Ok(await Response(run, now, db, ct));
        }
        if (run.State == "Interrupted" && command.Action is not ("checkpoint" or "takeover" or "recover-resume" or "recover-count" or "recover-end"))
            return Productivity.Conflict("Resolve the interruption before continuing.");
        if (command.Action.StartsWith("recover-", StringComparison.Ordinal) && run.State != "Interrupted")
            return Productivity.Conflict("There is no interruption to resolve.");
        switch (command.Action)
        {
            case "takeover":
                run.ControllerId = command.ControllerId;
                break;
            case "pause" when run.State == "Running":
                run.State = "Paused"; run.EndsAtUtc = null;
                if (session != null) { session.Status = "Paused"; session.RunningSinceUtc = null; }
                break;
            case "resume" when run.State == "Paused":
            case "recover-resume" when run.State == "Interrupted":
                Resume(run, session, now); break;
            case "recover-count" when run.State == "Interrupted":
                var interruptedAt = run.InterruptedAtUtc!.Value;
                await Credit(session, interruptedAt, FocusRules.CountInactive(run, now), ct);
                if (run.State == "Ready" && session != null) await Finish(session, "Completed", now, ct);
                break;
            case "stop": case "cancel": case "recover-end":
                if (command.CompleteTask)
                {
                    var taskId = session?.TaskId ?? await db.FocusSessions.Where(x => x.FocusRunId == run.Id && x.UserId == owner).OrderByDescending(x => x.StartedAtUtc).Select(x => x.TaskId).FirstOrDefaultAsync(ct);
                    if (command.Action != "stop" || !taskId.HasValue) return Productivity.Invalid("completeTask", "Choose a linked task to complete.");
                    var result = await TaskEndpoints.Complete(taskId.Value, false, owner, db, clock, ct);
                    if (result is IStatusCodeHttpResult { StatusCode: >= 400 }) return result;
                }
                if (session != null) await Finish(session, command.Action == "cancel" ? "Cancelled" : command.CompleteTask ? "Completed" : "Stopped",
                    command.Action == "recover-end" ? run.InterruptedAtUtc!.Value : now, ct);
                run.State = "Ended"; run.EndedAtUtc = now; run.EndsAtUtc = null; break;
            case "reference":
                var reference = command.Reference ?? new();
                var error = await ValidateReference(owner, reference, ct); if (error != null) return error;
                run.TaskId = reference.TaskId; run.GoalId = reference.GoalId; run.HabitId = reference.HabitId;
                break;
            case "next": case "skip":
                if (command.Action == "skip" && run.Phase != "Break") return Productivity.Conflict("Only a break can be skipped.");
                if (command.Action == "next" && run.State != "Ready") return Productivity.Conflict("Finish the current interval first.");
                run.PeriodIndex++;
                if (FocusRules.Period(run.Configuration, run.PeriodIndex) == null)
                { run.State = "Ended"; run.EndedAtUtc = now; run.EndsAtUtc = null; }
                else
                {
                    if (run.PeriodIndex % 2 == 0)
                    {
                        var invalid = await ValidateReference(owner, new(run.TaskId, run.GoalId, run.HabitId), ct);
                        if (invalid != null) return invalid;
                    }
                    await BeginPeriod(run, now, ct);
                }
                break;
        }
        run.Revision++; await db.SaveChangesAsync(ct);
        return Results.Ok(await Response(run, now, db, ct));
    }

    private static void Resume(FocusRun run, FocusSession? session, DateTimeOffset now)
    {
        run.State = "Running"; run.LastObservedAtUtc = now; run.EndsAtUtc = now.AddSeconds(run.RemainingSeconds);
        run.InterruptedAtUtc = null; run.BlockAutoStart = false;
        if (session != null) { session.Status = "Running"; session.RunningSinceUtc = now; }
    }

    private async Task BeginPeriod(FocusRun run, DateTimeOffset now, CancellationToken ct)
    {
        var period = FocusRules.Period(run.Configuration, run.PeriodIndex)!;
        run.Phase = period.Phase; run.RemainingSeconds = period.Seconds;
        Resume(run, null, now);
        if (period.Phase == "Focus")
        {
            // Save the previous interval before adding its successor under the one-active-session index.
            await db.SaveChangesAsync(ct);
            db.FocusSessions.Add(new FocusSession { Id = Guid.NewGuid(), UserId = run.UserId, FocusRunId = run.Id,
                PlannedSeconds = period.Seconds, TaskId = run.TaskId, GoalId = run.GoalId, HabitId = run.HabitId,
                StartedAtUtc = now, RunningSinceUtc = now });
        }
    }

    private async Task Credit(FocusSession? session, DateTimeOffset from, int seconds, CancellationToken ct)
    {
        if (session == null || seconds <= 0) return;
        seconds = Math.Min(seconds, (session.PlannedSeconds ?? int.MaxValue) - (int)session.AccumulatedSeconds);
        if (seconds <= 0) return;
        var last = await db.Set<FocusWorkSpan>().Where(x => x.FocusSessionId == session.Id).OrderByDescending(x => x.EndedAtUtc).FirstOrDefaultAsync(ct);
        if (last != null && last.EndedAtUtc == from) last.EndedAtUtc = from.AddSeconds(seconds);
        else db.Add(new FocusWorkSpan { Id = Guid.NewGuid(), UserId = session.UserId, FocusSessionId = session.Id, StartedAtUtc = from, EndedAtUtc = from.AddSeconds(seconds) });
        session.AccumulatedSeconds += seconds;
    }

    private async Task Finish(FocusSession session, string outcome, DateTimeOffset now, CancellationToken ct)
    {
        session.RunningSinceUtc = null; session.Status = outcome; session.EndedAtUtc = now < session.StartedAtUtc ? session.StartedAtUtc : now;
        var title = session.TaskId.HasValue ? await db.Tasks.Where(x => x.Id == session.TaskId && x.UserId == session.UserId).Select(x => x.Title).SingleOrDefaultAsync(ct)
            : session.GoalId.HasValue ? await db.Goals.Where(x => x.Id == session.GoalId && x.UserId == session.UserId).Select(x => x.Title).SingleOrDefaultAsync(ct)
            : session.HabitId.HasValue ? await db.Habits.Where(x => x.Id == session.HabitId && x.UserId == session.UserId).Select(x => x.Title).SingleOrDefaultAsync(ct) : null;
        ProgressionRules.Record(db, session.UserId, "Focus" + outcome, "FocusSession", session.Id, null, session.EndedAtUtc.Value,
            $"{outcome} focus: {title ?? "Unstructured focus"} ({session.AccumulatedSeconds / 60} min)", session.Id);
    }

    public async Task<IResult?> ValidateReference(Guid owner, FocusReference reference, CancellationToken ct)
    {
        if (new[] { reference.TaskId, reference.GoalId, reference.HabitId }.Count(x => x.HasValue) > 1)
            return Productivity.Invalid("reference", "Choose only one task, goal or habit.");
        if (reference.TaskId is { } taskId)
        {
            var task = await db.Tasks.SingleOrDefaultAsync(x => x.Id == taskId && x.UserId == owner, ct);
            if (task == null) return Productivity.NotFound();
            if (task.ArchivedAtUtc != null || await db.TaskCompletions.AnyAsync(x => x.UserId == owner && x.TaskId == taskId && x.ReversedAtUtc == null, ct))
                return Productivity.Conflict("Choose an unfinished task.");
        }
        if (reference.GoalId is { } goalId)
        {
            var goal = await db.Goals.SingleOrDefaultAsync(x => x.Id == goalId && x.UserId == owner, ct);
            if (goal == null) return Productivity.NotFound();
            if (goal.ArchivedAtUtc != null || goal.State != "Active") return Productivity.Conflict("Choose an active goal.");
        }
        if (reference.HabitId is { } habitId)
        {
            var habit = await db.Habits.SingleOrDefaultAsync(x => x.Id == habitId && x.UserId == owner, ct);
            if (habit == null) return Productivity.NotFound();
            if (habit.ArchivedAtUtc != null || !habit.IsActive) return Productivity.Conflict("Choose an active habit.");
        }
        return null;
    }
}
