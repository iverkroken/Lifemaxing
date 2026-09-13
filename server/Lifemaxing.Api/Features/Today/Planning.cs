using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Today;

public static class Planning
{
    public static async Task<DailyCommitment> Commit(AppDbContext db, Guid userId, Guid taskId,
        DateOnly date, OwnerDay day, CancellationToken ct)
    {
        var commitment = db.DailyCommitments.Local.SingleOrDefault(x => x.UserId == userId && x.TaskId == taskId && x.LocalDate == date)
            ?? await db.DailyCommitments.SingleOrDefaultAsync(
            x => x.UserId == userId && x.TaskId == taskId && x.LocalDate == date, ct);
        if (commitment is null)
        {
            commitment = new DailyCommitment { Id = Guid.NewGuid(), UserId = userId, TaskId = taskId,
                LocalDate = date, TimeZoneId = day.TimeZoneId, CommittedAtUtc = day.Now };
            db.DailyCommitments.Add(commitment);
        }
        else if (commitment.RemovedAtUtc is not null)
        {
            // A future plan removed before its day started may be intentionally planned again.
            // Preserve original timestamp for same-day cancellation/restoration.
            if (Productivity.LocalDate(commitment.RemovedAtUtc.Value, commitment.TimeZoneId) < date)
                commitment.CommittedAtUtc = day.Now;
            commitment.RemovedAtUtc = null;
        }
        return commitment;
    }

    public static async Task Move(AppDbContext db, Guid userId, Guid taskId, DateOnly? previous,
        DateOnly? next, OwnerDay day, CancellationToken ct)
    {
        if (previous == next) return;
        if (previous is not null)
        {
            var old = await db.DailyCommitments.SingleOrDefaultAsync(
                x => x.UserId == userId && x.TaskId == taskId && x.LocalDate == previous, ct);
            if (old is not null && old.LocalDate > Productivity.LocalDate(day.Now, old.TimeZoneId))
            {
                old.RemovedAtUtc = day.Now;
                await db.DailyMissions.Where(x => x.UserId == userId && x.TaskId == taskId && x.LocalDate == previous)
                    .ExecuteDeleteAsync(ct);
            }
        }
        if (next is not null) await Commit(db, userId, taskId, next.Value, day, ct);
    }
}
