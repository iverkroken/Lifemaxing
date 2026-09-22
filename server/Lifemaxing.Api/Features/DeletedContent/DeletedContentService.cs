using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Progression;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.DeletedContent;

public static class DeletedContentPolicy
{
    public static readonly TimeSpan Retention = TimeSpan.FromDays(30);
    public const int CleanupBatchSize = 100;
}

public sealed class DeletedContentService(AppDbContext db, TimeProvider clock)
{
    public async Task<bool> SoftDeleteAsync(string type, Guid id, Guid userId, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        string? title = null;
        switch (Normalize(type))
        {
            case "task":
            {
                var item = await db.Tasks.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
                if (item is null) return false;
                if (item.DeletedAtUtc is not null) return true;
                item.DeletedAtUtc = now;
                item.UpdatedAtUtc = now;
                title = item.Title;
                break;
            }
            case "habit":
            {
                var item = await db.Habits.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
                if (item is null) return false;
                if (item.DeletedAtUtc is not null) return true;
                item.DeletedAtUtc = now;
                title = item.Title;
                break;
            }
            case "goal":
            {
                var item = await db.Goals.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
                if (item is null) return false;
                if (item.DeletedAtUtc is not null) return true;
                item.DeletedAtUtc = now;
                title = item.Title;
                break;
            }
            case "lifearea":
            {
                var item = await db.LifeAreas.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
                if (item is null) return false;
                if (item.DeletedAtUtc is not null) return true;
                item.DeletedAtUtc = now;
                title = item.DisplayName;
                break;
            }
            default:
                return false;
        }

        await StopMatchingFocusAsync(Normalize(type), id, userId, title!, now, ct);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<RestoreResult> RestoreAsync(string type, Guid id, Guid userId, CancellationToken ct)
    {
        DateTimeOffset? deletedAt;
        switch (Normalize(type))
        {
            case "task":
            {
                var item = await db.Tasks.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
                if (item is null || item.DeletedAtUtc is null) return RestoreResult.NotFound;
                deletedAt = item.DeletedAtUtc;
                if (Expired(deletedAt.Value)) return RestoreResult.Expired;
                item.DeletedAtUtc = null;
                item.UpdatedAtUtc = clock.GetUtcNow();
                break;
            }
            case "habit":
            {
                var item = await db.Habits.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
                if (item is null || item.DeletedAtUtc is null) return RestoreResult.NotFound;
                deletedAt = item.DeletedAtUtc;
                if (Expired(deletedAt.Value)) return RestoreResult.Expired;
                item.DeletedAtUtc = null;
                break;
            }
            case "goal":
            {
                var item = await db.Goals.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
                if (item is null || item.DeletedAtUtc is null) return RestoreResult.NotFound;
                deletedAt = item.DeletedAtUtc;
                if (Expired(deletedAt.Value)) return RestoreResult.Expired;
                item.DeletedAtUtc = null;
                break;
            }
            case "lifearea":
            {
                var item = await db.LifeAreas.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
                if (item is null || item.DeletedAtUtc is null) return RestoreResult.NotFound;
                deletedAt = item.DeletedAtUtc;
                if (Expired(deletedAt.Value)) return RestoreResult.Expired;
                item.DeletedAtUtc = null;
                break;
            }
            default:
                return RestoreResult.NotFound;
        }

        await db.SaveChangesAsync(ct);
        return RestoreResult.Restored;
    }

    public async Task<bool> PurgeAsync(string type, Guid id, Guid userId, CancellationToken ct) =>
        await PurgeInternalAsync(Normalize(type), id, userId, null, ct);

    public async Task<int> PurgeExpiredAsync(CancellationToken ct)
    {
        var cutoff = clock.GetUtcNow() - DeletedContentPolicy.Retention;
        var candidates = new List<(string Type, Guid Id, Guid UserId)>();
        candidates.AddRange(await db.Tasks.IgnoreQueryFilters().Where(x => x.DeletedAtUtc <= cutoff)
            .OrderBy(x => x.DeletedAtUtc).Take(DeletedContentPolicy.CleanupBatchSize)
            .Select(x => new ValueTuple<string, Guid, Guid>("task", x.Id, x.UserId)).ToListAsync(ct));
        candidates.AddRange(await db.Habits.IgnoreQueryFilters().Where(x => x.DeletedAtUtc <= cutoff)
            .OrderBy(x => x.DeletedAtUtc).Take(DeletedContentPolicy.CleanupBatchSize)
            .Select(x => new ValueTuple<string, Guid, Guid>("habit", x.Id, x.UserId)).ToListAsync(ct));
        candidates.AddRange(await db.Goals.IgnoreQueryFilters().Where(x => x.DeletedAtUtc <= cutoff)
            .OrderBy(x => x.DeletedAtUtc).Take(DeletedContentPolicy.CleanupBatchSize)
            .Select(x => new ValueTuple<string, Guid, Guid>("goal", x.Id, x.UserId)).ToListAsync(ct));
        candidates.AddRange(await db.LifeAreas.IgnoreQueryFilters().Where(x => x.DeletedAtUtc <= cutoff)
            .OrderBy(x => x.DeletedAtUtc).Take(DeletedContentPolicy.CleanupBatchSize)
            .Select(x => new ValueTuple<string, Guid, Guid>("lifearea", x.Id, x.UserId)).ToListAsync(ct));

        var removed = 0;
        foreach (var candidate in candidates.OrderBy(x => x.Type == "lifearea" ? 1 : 0)
                     .Take(DeletedContentPolicy.CleanupBatchSize))
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            // Serialize with restore and other owner writes, then recheck the deadline.
            // One owner per transaction also avoids cross-owner lock ordering deadlocks.
            await db.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM \"UserSettings\" WHERE \"UserId\" = {candidate.UserId} FOR UPDATE", ct);
            if (await PurgeInternalAsync(candidate.Type, candidate.Id, candidate.UserId, cutoff, ct)) removed++;
            await transaction.CommitAsync(ct);
        }
        return removed;
    }

    private bool Expired(DateTimeOffset deletedAt) => deletedAt + DeletedContentPolicy.Retention <= clock.GetUtcNow();

    private async Task StopMatchingFocusAsync(string type, Guid id, Guid userId, string title, DateTimeOffset now, CancellationToken ct)
    {
        var session = await db.FocusSessions.SingleOrDefaultAsync(x => x.UserId == userId && x.EndedAtUtc == null &&
            (type == "task" && x.TaskId == id || type == "habit" && x.HabitId == id || type == "goal" && x.GoalId == id), ct);
        var run = await db.Set<Lifemaxing.Api.Features.Focus.FocusRun>().SingleOrDefaultAsync(x => x.UserId == userId && x.EndedAtUtc == null &&
            (type == "task" && x.TaskId == id || type == "habit" && x.HabitId == id || type == "goal" && x.GoalId == id || x.Id == (session == null ? null : session.FocusRunId)), ct);
        if (run != null)
        {
            session ??= await db.FocusSessions.SingleOrDefaultAsync(x => x.UserId == userId && x.EndedAtUtc == null && x.FocusRunId == run.Id, ct);
            run.State = "Ended"; run.EndedAtUtc = now; run.EndsAtUtc = null; run.Revision++;
        }
        if (session is null) return;
        session.AccumulatedSeconds = FocusEndpoints.Elapsed(session, now);
        session.RunningSinceUtc = null;
        session.EndedAtUtc = now;
        session.Status = "Stopped";
        ProgressionRules.Record(db, userId, "FocusStopped", "FocusSession", session.Id, null, now,
            $"Stopped focus because {title} was deleted ({session.AccumulatedSeconds / 60} min)", session.Id);
    }

    private async Task<bool> PurgeInternalAsync(string type, Guid id, Guid userId, DateTimeOffset? expiredBefore, CancellationToken ct)
    {
        switch (type)
        {
            case "task":
                var tasks = db.Tasks.IgnoreQueryFilters().Where(x => x.Id == id && x.UserId == userId && x.DeletedAtUtc != null && (expiredBefore == null || x.DeletedAtUtc <= expiredBefore));
                if (!await tasks.AnyAsync(ct)) return false;
                await db.FocusSessions.Where(x => x.UserId == userId && x.TaskId == id).ExecuteUpdateAsync(x => x.SetProperty(v => v.TaskId, (Guid?)null), ct);
                await db.DailyMissions.Where(x => x.UserId == userId && x.TaskId == id).ExecuteDeleteAsync(ct);
                await db.DailyCommitments.Where(x => x.UserId == userId && x.TaskId == id).ExecuteDeleteAsync(ct);
                await db.TaskCompletions.Where(x => x.UserId == userId && x.TaskId == id).ExecuteDeleteAsync(ct);
                return await tasks.ExecuteDeleteAsync(ct) == 1;
            case "habit":
                var habits = db.Habits.IgnoreQueryFilters().Where(x => x.Id == id && x.UserId == userId && x.DeletedAtUtc != null && (expiredBefore == null || x.DeletedAtUtc <= expiredBefore));
                if (!await habits.AnyAsync(ct)) return false;
                await db.FocusSessions.Where(x => x.UserId == userId && x.HabitId == id).ExecuteUpdateAsync(x => x.SetProperty(v => v.HabitId, (Guid?)null), ct);
                await db.HabitLogs.Where(x => x.UserId == userId && x.HabitId == id).ExecuteDeleteAsync(ct);
                await db.HabitSchedulePeriods.Where(x => x.HabitId == id).ExecuteDeleteAsync(ct);
                return await habits.ExecuteDeleteAsync(ct) == 1;
            case "goal":
                var goals = db.Goals.IgnoreQueryFilters().Where(x => x.Id == id && x.UserId == userId && x.DeletedAtUtc != null && (expiredBefore == null || x.DeletedAtUtc <= expiredBefore));
                if (!await goals.AnyAsync(ct)) return false;
                await db.FocusSessions.Where(x => x.UserId == userId && x.GoalId == id).ExecuteUpdateAsync(x => x.SetProperty(v => v.GoalId, (Guid?)null), ct);
                await db.Tasks.IgnoreQueryFilters().Where(x => x.UserId == userId && x.GoalId == id).ExecuteUpdateAsync(x => x.SetProperty(v => v.GoalId, (Guid?)null), ct);
                await db.DailyGoalSelections.Where(x => x.UserId == userId && x.GoalId == id).ExecuteDeleteAsync(ct);
                await db.GoalProgressEntries.Where(x => x.UserId == userId && x.GoalId == id).ExecuteDeleteAsync(ct);
                return await goals.ExecuteDeleteAsync(ct) == 1;
            case "lifearea":
                var areas = db.LifeAreas.IgnoreQueryFilters().Where(x => x.Id == id && x.UserId == userId && x.DeletedAtUtc != null && (expiredBefore == null || x.DeletedAtUtc <= expiredBefore));
                if (!await areas.AnyAsync(ct)) return false;
                await db.Tasks.IgnoreQueryFilters().Where(x => x.UserId == userId && x.LifeAreaId == id).ExecuteUpdateAsync(x => x.SetProperty(v => v.LifeAreaId, (Guid?)null), ct);
                await db.Habits.IgnoreQueryFilters().Where(x => x.UserId == userId && x.LifeAreaId == id).ExecuteUpdateAsync(x => x.SetProperty(v => v.LifeAreaId, (Guid?)null), ct);
                await db.Goals.IgnoreQueryFilters().Where(x => x.UserId == userId && x.LifeAreaId == id).ExecuteUpdateAsync(x => x.SetProperty(v => v.LifeAreaId, (Guid?)null), ct);
                return await areas.ExecuteDeleteAsync(ct) == 1;
            default:
                return false;
        }
    }

    public static string Normalize(string type) => type.Trim().ToLowerInvariant() switch
    {
        "tasks" => "task",
        "habits" => "habit",
        "goals" => "goal",
        "lifeareas" or "life-areas" or "areas" => "lifearea",
        var value => value
    };
}

public enum RestoreResult { Restored, NotFound, Expired }
