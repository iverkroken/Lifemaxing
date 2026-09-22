using System.Security.Claims;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Tasks;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Progression;

public sealed record FocusStart(Guid? TaskId = null, Guid? GoalId = null, Guid? HabitId = null);
public sealed record FocusStop(string Outcome = "Stopped", bool CompleteTask = false);
public sealed record FocusResponse(Guid Id, Guid? TaskId, string Status, DateTimeOffset StartedAtUtc, DateTimeOffset? RunningSinceUtc,
    long AccumulatedSeconds, long ElapsedSeconds, DateTimeOffset? EndedAtUtc, DateTimeOffset ServerNow, Guid? GoalId, Guid? HabitId);

public static class FocusEndpoints
{
    public static void MapFocusEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/focus-sessions/active", async (ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            var session = await db.FocusSessions.SingleOrDefaultAsync(x => x.UserId == owner && x.EndedAtUtc == null, ct);
            return Results.Ok(new { session = session is null ? null : Response(session, clock.GetUtcNow()) });
        });
        api.MapGet("/focus-sessions", async (ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, int? page, int? pageSize, CancellationToken ct) =>
        {
            var owner = principal.GetUserId(); var number = Math.Min(Productivity.Page(page), 1000000); var size = Productivity.PageSize(pageSize);
            var query = db.FocusSessions.Where(x => x.UserId == owner);
            var total = await query.CountAsync(ct);
            var sessions = await query.OrderByDescending(x => x.StartedAtUtc).ThenBy(x => x.Id).Skip((number - 1) * size).Take(size).ToListAsync(ct);
            return Results.Ok(new PageResponse<FocusResponse>(sessions.Select(x => Response(x, clock.GetUtcNow())).ToList(), number, size, total));
        });
        api.MapPost("/focus-sessions", async (FocusStart request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var owner = principal.GetUserId();
            if (new[] { request.TaskId, request.GoalId, request.HabitId }.Count(x => x.HasValue) > 1)
                return Productivity.Invalid("reference", "Choose only one task, goal or habit.");
            if (request.GoalId.HasValue)
            {
                var goal = await db.Goals.SingleOrDefaultAsync(x => x.Id == request.GoalId && x.UserId == owner, ct);
                if (goal == null) return Productivity.NotFound();
                if (goal.ArchivedAtUtc != null || goal.State != "Active") return Productivity.Conflict("Choose an active goal.");
            }
            if (request.HabitId.HasValue)
            {
                var habit = await db.Habits.SingleOrDefaultAsync(x => x.Id == request.HabitId && x.UserId == owner, ct);
                if (habit == null) return Productivity.NotFound();
                if (habit.ArchivedAtUtc != null || !habit.IsActive) return Productivity.Conflict("Choose an active habit.");
            }
            if (request.TaskId.HasValue)
            {
                var task = await db.Tasks.SingleOrDefaultAsync(x => x.Id == request.TaskId && x.UserId == owner, ct);
                if (task is null) return Productivity.NotFound();
                if (task.ArchivedAtUtc != null || await db.TaskCompletions.AnyAsync(x => x.UserId == owner && x.TaskId == task.Id && x.ReversedAtUtc == null, ct)) return Productivity.Conflict("Choose an unfinished task.");
            }
            if (await db.FocusSessions.AnyAsync(x => x.UserId == owner && x.EndedAtUtc == null, ct)) return Productivity.Conflict("End your current focus session first.");
            var now = clock.GetUtcNow();
            var session = new FocusSession { Id = Guid.NewGuid(), UserId = owner, TaskId = request.TaskId, GoalId = request.GoalId, HabitId = request.HabitId, StartedAtUtc = now, RunningSinceUtc = now };
            db.FocusSessions.Add(session); await db.SaveChangesAsync(ct);
            return Results.Created("/api/v1/focus-sessions", Response(session, now));
        });
        api.MapPost("/focus-sessions/{id:guid}/pause", (Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) => Change(id, "pause", null, principal.GetUserId(), db, clock, ct));
        api.MapPost("/focus-sessions/{id:guid}/resume", (Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) => Change(id, "resume", null, principal.GetUserId(), db, clock, ct));
        api.MapPost("/focus-sessions/{id:guid}/stop", (Guid id, FocusStop request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) => Change(id, "stop", request, principal.GetUserId(), db, clock, ct));
    }

    private static async Task<IResult> Change(Guid id, string operation, FocusStop? request, Guid owner, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var session = await db.FocusSessions.SingleOrDefaultAsync(x => x.Id == id && x.UserId == owner, ct);
        if (session is null) return Productivity.NotFound();
        if (session.EndedAtUtc != null) return Productivity.Conflict("This session has already ended.");
        var now = clock.GetUtcNow();
        if (operation == "pause")
        {
            if (session.Status == "Running") { Accumulate(session, now); session.Status = "Paused"; }
        }
        else if (operation == "resume")
        {
            if (session.Status == "Paused") { session.RunningSinceUtc = now; session.Status = "Running"; }
        }
        else
        {
            if (request!.Outcome is not ("Stopped" or "Completed" or "Cancelled")) return Productivity.Invalid("outcome", "Choose Stopped, Completed or Cancelled.");
            if (request.CompleteTask)
            {
                if (request.Outcome != "Completed" || !session.TaskId.HasValue) return Productivity.Invalid("completeTask", "Only a completed task-linked session can complete its task.");
                var result = await TaskEndpoints.Complete(session.TaskId.Value, false, owner, db, clock, ct);
                if (result is IStatusCodeHttpResult { StatusCode: >= 400 }) return result;
            }
            Accumulate(session, now); session.EndedAtUtc = now; session.Status = request.Outcome;
            var title = session.TaskId.HasValue ? await db.Tasks.Where(x => x.Id == session.TaskId && x.UserId == owner).Select(x => x.Title).SingleAsync(ct)
                : session.GoalId.HasValue ? await db.Goals.Where(x => x.Id == session.GoalId && x.UserId == owner).Select(x => x.Title).SingleAsync(ct)
                : session.HabitId.HasValue ? await db.Habits.Where(x => x.Id == session.HabitId && x.UserId == owner).Select(x => x.Title).SingleAsync(ct) : "Unstructured focus";
            ProgressionRules.Record(db, owner, "Focus" + session.Status, "FocusSession", id, null, now, $"{session.Status} focus: {title} ({session.AccumulatedSeconds / 60} min)", id);
        }
        await db.SaveChangesAsync(ct); return Results.Ok(Response(session, now));
    }
    public static long Elapsed(FocusSession session, DateTimeOffset now) => session.AccumulatedSeconds + (session.RunningSinceUtc.HasValue ? Math.Max(0, (long)(now - session.RunningSinceUtc.Value).TotalSeconds) : 0);
    private static void Accumulate(FocusSession session, DateTimeOffset now) { session.AccumulatedSeconds = Elapsed(session, now); session.RunningSinceUtc = null; }
    private static FocusResponse Response(FocusSession x, DateTimeOffset now) => new(x.Id, x.TaskId, x.Status, x.StartedAtUtc, x.RunningSinceUtc, x.AccumulatedSeconds, Elapsed(x, now), x.EndedAtUtc, now, x.GoalId, x.HabitId);
}
