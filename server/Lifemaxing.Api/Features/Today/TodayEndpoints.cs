using Lifemaxing.Api.Features.Progression;
using System.Security.Claims;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Habits;
using Lifemaxing.Api.Features.Tasks;
using Lifemaxing.Api.Features.Goals;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Today;

public sealed record CommitmentRequest(Guid TaskId, DateOnly LocalDate);
public sealed record MissionRequest(Guid TaskId);
public sealed record CommitmentResponse(Guid Id, Guid TaskId, DateOnly LocalDate, string TimeZoneId,
    DateTimeOffset CommittedAtUtc, DateTimeOffset? RemovedAtUtc, bool PlannedSameDay);
public sealed record MissionResponse(Guid Id, Guid TaskId, DateOnly LocalDate, DateTimeOffset SelectedAtUtc);
public sealed record TodayHabitResponse(Guid Id, string Title, string Pattern, int? WeeklyTarget,
    int WeekCompletions, Guid? ActiveLogId, bool TargetReached, Guid? LifeAreaId, int XpPerLog, int? AwardedXp);
public sealed record TodayGoalResponse(GoalResponse Goal, bool ManuallySelected, int PlannedTaskCount, ProgressResponse? LatestProgress);
public sealed record TodayResponse(DateOnly LocalDate, DateOnly CurrentLocalDate, string TimeZoneId,
    IReadOnlyList<TaskResponse> Tasks, IReadOnlyList<CommitmentResponse> Commitments, MissionResponse? Mission,
    IReadOnlyList<TodayHabitResponse> Habits, int InboxCount, IReadOnlyList<TaskResponse> AttentionTasks,
    IReadOnlyList<TaskResponse> PlanHistory, IReadOnlyList<TodayGoalResponse> Goals);

public static class TodayEndpoints
{
    public static void MapTodayEndpoints(this RouteGroupBuilder api)
    {
        api.MapDailyGoalEndpoints();
        api.MapGet("/today", async (DateOnly? date, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var day = await Productivity.Day(db, userId, clock, ct);
            var localDate = date ?? day.Date;
            if (!Productivity.DateValid(localDate)) return Productivity.Invalid("date", "Use dates between 1900 and 9998.");
            var plans = await db.DailyCommitments.AsNoTracking().Where(x => x.UserId == userId && x.LocalDate == localDate &&
                db.Tasks.Any(task => task.Id == x.TaskId && task.UserId == userId && task.ArchivedAtUtc == null)).ToListAsync(ct);
            var mission = await db.DailyMissions.Where(x => x.UserId == userId && x.LocalDate == localDate &&
                    db.Tasks.Any(task => task.Id == x.TaskId && task.UserId == userId && task.ArchivedAtUtc == null))
                .Select(x => new MissionResponse(x.Id, x.TaskId, x.LocalDate, x.SelectedAtUtc)).SingleOrDefaultAsync(ct);
            var plannedIds = plans.Select(x => x.TaskId).ToArray();
            var missionId = mission?.TaskId;
            var tasks = await db.Tasks.Where(x => x.UserId == userId && x.ArchivedAtUtc == null && x.PlannedDate == localDate)
                .OrderBy(x => x.Priority == "High" ? 0 : x.Priority == "Normal" ? 1 : 2).ThenBy(x => x.DueDate).ThenBy(x => x.Id)
                .Select(TaskResponse.Projection).ToListAsync(ct);
            var attention = await db.Tasks.Where(x => x.UserId == userId && x.ArchivedAtUtc == null && x.PlannedDate != localDate &&
                    (x.PlannedDate < localDate || x.DueDate <= localDate) && !x.Completions.Any(c => c.ReversedAtUtc == null))
                .OrderBy(x => x.DueDate).ThenBy(x => x.Id).Select(TaskResponse.Projection).ToListAsync(ct);
            var taskIds = tasks.Select(x => x.Id).ToArray();
            var history = await db.Tasks.Where(x => x.UserId == userId && !taskIds.Contains(x.Id) && (plannedIds.Contains(x.Id) || x.Id == missionId))
                .OrderBy(x => x.Title).ThenBy(x => x.Id).Select(TaskResponse.Projection).ToListAsync(ct);
            var selections = await db.DailyGoalSelections.Where(x => x.UserId == userId && x.LocalDate == localDate && x.RemovedAtUtc == null)
                .Select(x => x.GoalId).ToListAsync(ct);
            var goalIds = selections.Concat(tasks.Where(x => x.GoalId != null).Select(x => x.GoalId!.Value)).Distinct().ToArray();
            var goals = await db.Goals.Where(x => x.UserId == userId && x.ArchivedAtUtc == null && goalIds.Contains(x.Id))
                .OrderBy(x => x.Title).ThenBy(x => x.Id).Select(GoalResponse.Projection).ToListAsync(ct);
            var latest = await db.GoalProgressEntries.Where(x => x.UserId == userId && goalIds.Contains(x.GoalId))
                .GroupBy(x => x.GoalId).Select(group => group.OrderByDescending(x => x.RecordedAtUtc).ThenByDescending(x => x.Id).First()).ToListAsync(ct);
            var goalRows = goals.Select(goal => {
                var entry = latest.SingleOrDefault(x => x.GoalId == goal.Id);
                return new TodayGoalResponse(goal, selections.Contains(goal.Id), tasks.Count(x => x.GoalId == goal.Id),
                    entry == null ? null : new ProgressResponse(entry.Id, entry.RecordedAtUtc, entry.Value, entry.Note));
            }).ToList();
            var habits = await db.Habits.AsNoTracking().Include(x => x.Schedules)
                .Where(x => x.UserId == userId && x.IsActive && x.ArchivedAtUtc == null).OrderBy(x => x.Title).ToListAsync(ct);
            var weekStart = HabitRules.WeekStart(localDate);
            var weekEnd = weekStart.AddDays(7);
            var logs = await db.HabitLogs.AsNoTracking().Where(x => x.UserId == userId && x.LocalDate >= weekStart && x.LocalDate < weekEnd && x.ReversedAtUtc == null).ToListAsync(ct);
            var logIds = logs.Select(x => x.Id).ToArray();
            var awards = await db.XpEntries.Where(x => x.UserId == userId && x.SourceKind == "HabitLog" && x.Kind == "Award" && logIds.Contains(x.SourceId))
                .ToDictionaryAsync(x => x.SourceId, x => x.AmountSigned, ct);
            var habitRows = new List<TodayHabitResponse>();
            foreach (var habit in habits)
            {
                var schedule = habit.Schedules.SingleOrDefault(x => HabitRules.Expected(x, localDate));
                if (schedule is null) continue;
                var count = logs.Count(x => x.HabitId == habit.Id && HabitRules.Covers(schedule, x.LocalDate));
                var active = logs.SingleOrDefault(x => x.HabitId == habit.Id && x.LocalDate == localDate);
                habitRows.Add(new TodayHabitResponse(habit.Id, habit.Title, schedule.Pattern, schedule.WeeklyTarget,
                    count, active?.Id, schedule.Pattern == "WeeklyCount" && count >= schedule.WeeklyTarget,
                    habit.LifeAreaId, habit.XpPerLog, active == null ? null : awards.GetValueOrDefault(active.Id)));
            }
            var inbox = await db.Tasks.CountAsync(x => x.UserId == userId && x.ArchivedAtUtc == null && x.PlannedDate == null && !x.Completions.Any(c => c.ReversedAtUtc == null), ct);
            return Results.Ok(new TodayResponse(localDate, day.Date, day.TimeZoneId, tasks, plans.Select(Response).ToList(), mission, habitRows, inbox, attention, history, goalRows));
        });

        api.MapPost("/daily-commitments", async (CommitmentRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            if (!Productivity.DateValid(request.LocalDate)) return Productivity.Invalid("localDate", "Use dates between 1900 and 9998.");
            var task = await db.Tasks.SingleOrDefaultAsync(x => x.Id == request.TaskId && x.UserId == userId, ct);
            if (task is null) return Productivity.NotFound();
            if (task.ArchivedAtUtc is not null || await db.TaskCompletions.AnyAsync(x => x.UserId == userId && x.TaskId == task.Id && x.ReversedAtUtc == null, ct))
                return Productivity.Conflict("Choose an active, unfinished task.");
            var day = await Productivity.Day(db, userId, clock, ct);
            await Planning.Move(db, userId, task.Id, task.PlannedDate, request.LocalDate, day, ct);
            var commitment = await Planning.Commit(db, userId, task.Id, request.LocalDate, day, ct);
            task.PlannedDate = request.LocalDate; task.UpdatedAtUtc = day.Now;
            await db.SaveChangesAsync(ct);
            return Results.Ok(Response(commitment));
        });
        api.MapDelete("/daily-commitments/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var commitment = await db.DailyCommitments.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (commitment is null) return Productivity.NotFound();
            var task = await db.Tasks.SingleOrDefaultAsync(x => x.Id == commitment.TaskId && x.UserId == userId, ct);
            if (task is null) return Productivity.NotFound();
            commitment.RemovedAtUtc ??= clock.GetUtcNow();
            if (task.PlannedDate == commitment.LocalDate) { task.PlannedDate = null; task.UpdatedAtUtc = clock.GetUtcNow(); }
            await db.DailyMissions.Where(x => x.UserId == userId && x.TaskId == task.Id && x.LocalDate == commitment.LocalDate).ExecuteDeleteAsync(ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        api.MapPut("/daily-mission/{date}", async (DateOnly date, MissionRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            if (!Productivity.DateValid(date)) return Productivity.Invalid("date", "Use dates between 1900 and 9998.");
            var task = await db.Tasks.SingleOrDefaultAsync(x => x.Id == request.TaskId && x.UserId == userId, ct);
            if (task is null) return Productivity.NotFound();
            if (task.ArchivedAtUtc is not null || await db.TaskCompletions.AnyAsync(x => x.UserId == userId && x.TaskId == task.Id && x.ReversedAtUtc == null, ct))
                return Productivity.Conflict("Choose an active, unfinished task as your mission.");
            if (task.PlannedDate != date) return Productivity.Conflict("Plan this task for the selected date before choosing it as your daily priority.");
            var day = await Productivity.Day(db, userId, clock, ct);
            var mission = await db.DailyMissions.SingleOrDefaultAsync(x => x.UserId == userId && x.LocalDate == date, ct);
            var changed = mission is not null && mission.TaskId != task.Id;
            if (mission is null)
            {
                mission = new DailyMission { Id = Guid.NewGuid(), UserId = userId, LocalDate = date };
                db.DailyMissions.Add(mission);
            }
            if (changed) ProgressionRules.Record(db, userId, "MissionChanged", "Task", task.Id, task.LifeAreaId, day.Now, $"Daily Mission for {date}: {task.Title}");
            mission.TaskId = task.Id; mission.SelectedAtUtc = day.Now;
            await Planning.Commit(db, userId, task.Id, date, day, ct);
            // Selecting a mission adds a daily commitment without moving another intentional plan.
            await db.SaveChangesAsync(ct);
            return Results.Ok(new MissionResponse(mission.Id, task.Id, date, mission.SelectedAtUtc));
        });
        api.MapDelete("/daily-mission/{date}", async (DateOnly date, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            if (!Productivity.DateValid(date)) return Productivity.Invalid("date", "Use dates between 1900 and 9998.");
            await db.DailyMissions.Where(x => x.UserId == userId && x.LocalDate == date).ExecuteDeleteAsync(ct);
            return Results.NoContent();
        });
    }
    private static CommitmentResponse Response(DailyCommitment x) => new(x.Id, x.TaskId, x.LocalDate,
        x.TimeZoneId, x.CommittedAtUtc, x.RemovedAtUtc, Productivity.LocalDate(x.CommittedAtUtc, x.TimeZoneId) == x.LocalDate);
}
