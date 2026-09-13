using Lifemaxing.Api.Features.Progression;
using System.Security.Claims;
using System.Text.Json;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Today;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Tasks;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this RouteGroupBuilder api)
    {
        var tasks = api.MapGroup("/tasks");
        tasks.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, bool? inbox, string? status,
            Guid? areaId, Guid? goalId, DateOnly? plannedDate, DateOnly? dueBefore, string? search,
            int? page, int? pageSize, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            if (!Productivity.DateValid(plannedDate) || !Productivity.DateValid(dueBefore))
                return Productivity.Invalid("plannedDate", "Use dates between 1900 and 9998.");
            if (status is not (null or "active" or "completed" or "archived" or "all"))
                return Productivity.Invalid("status", "Choose active, completed, archived or all.");
            var query = db.Tasks.AsNoTracking().Where(x => x.UserId == userId);
            query = status == "archived" ? query.Where(x => x.DeletedAtUtc != null) : query.Where(x => x.DeletedAtUtc == null);
            if (status is null or "active") query = query.Where(x => !x.Completions.Any(c => c.ReversedAtUtc == null));
            if (status == "completed") query = query.Where(x => x.Completions.Any(c => c.ReversedAtUtc == null));
            if (inbox == true) query = query.Where(x => x.PlannedDate == null && x.DeletedAtUtc == null && !x.Completions.Any(c => c.ReversedAtUtc == null));
            if (areaId.HasValue) query = query.Where(x => x.LifeAreaId == areaId);
            if (goalId.HasValue) query = query.Where(x => x.GoalId == goalId);
            if (plannedDate.HasValue) query = query.Where(x => x.PlannedDate == plannedDate);
            if (dueBefore.HasValue) query = query.Where(x => x.DueDate <= dueBefore);
            if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.Title.Contains(search.Trim()));
            var total = await query.CountAsync(ct);
            var size = Productivity.PageSize(pageSize);
            var number = Math.Min(Productivity.Page(page), 1000000);
            var items = await query.OrderByDescending(x => x.CreatedAtUtc).ThenBy(x => x.Id)
                .Skip((number - 1) * size).Take(size).Select(TaskResponse.Projection).ToListAsync(ct);
            return Results.Ok(new PageResponse<TaskResponse>(items, number, size, total));
        });
        tasks.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var task = await db.Tasks.Where(x => x.Id == id && x.UserId == userId).Select(TaskResponse.Projection).SingleOrDefaultAsync(ct);
            return task is null ? Productivity.NotFound() : Results.Ok(task);
        });
        tasks.MapPost("/", async (TaskRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var error = await Validate(request, userId, db, ct);
            if (error is not null) return error;
            var day = await Productivity.Day(db, userId, clock, ct);
            var task = new TaskItem { Id = Guid.NewGuid(), UserId = userId, CreatedAtUtc = day.Now };
            Apply(task, request, day.Now);
            db.Tasks.Add(task);
            if (task.PlannedDate is not null) await Planning.Commit(db, userId, task.Id, task.PlannedDate.Value, day, ct);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/tasks/{task.Id}", await Response(db, task.Id, userId, ct));
        });
        tasks.MapPatch("/{id:guid}", async (Guid id, JsonElement patch, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var task = await db.Tasks.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (task is null) return Productivity.NotFound();
            if (task.DeletedAtUtc is not null) return Productivity.Conflict("Archived tasks cannot be edited.");
            var request = Productivity.Patch(new TaskRequest(task.Title, task.Details, task.LifeAreaId, task.GoalId,
                task.Tier, task.Priority, task.PlannedDate, task.DueDate, task.EstimateMinutes), patch);
            var error = await Validate(request, userId, db, ct);
            if (error is not null) return error;
            if (request.Tier != task.Tier && await db.TaskCompletions.AnyAsync(x => x.UserId == userId && x.TaskId == id && x.ReversedAtUtc == null, ct))
                return Productivity.Conflict("Reopen the task before changing its tier.");
            var day = await Productivity.Day(db, userId, clock, ct);
            await Planning.Move(db, userId, id, task.PlannedDate, request.PlannedDate, day, ct);
            Apply(task, request, day.Now);
            await db.SaveChangesAsync(ct);
            return Results.Ok(await Response(db, id, userId, ct));
        });
        tasks.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var task = await db.Tasks.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (task is null) return Productivity.NotFound();
            task.DeletedAtUtc ??= clock.GetUtcNow();
            task.UpdatedAtUtc = clock.GetUtcNow();
            // Plans and completion history remain available after archiving.
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        tasks.MapPost("/{id:guid}/complete", (Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
            Complete(id, false, principal.GetUserId(), db, clock, ct));
        tasks.MapPost("/{id:guid}/reopen", (Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
            Complete(id, true, principal.GetUserId(), db, clock, ct));
    }

    internal static async Task<IResult> Complete(Guid id, bool reopen, Guid userId, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        var task = await db.Tasks.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (task is null) return Productivity.NotFound();
        if (task.DeletedAtUtc is not null) return Productivity.Conflict("Archived tasks cannot be completed or reopened.");
        var active = await db.TaskCompletions.SingleOrDefaultAsync(x => x.TaskId == id && x.UserId == userId && x.ReversedAtUtc == null, ct);
        var day = await Productivity.Day(db, userId, clock, ct);
        if (reopen && active is not null)
        {
            active.ReversedAtUtc = day.Now;
            var change = await ProgressionRules.Reverse(db, userId, "TaskCompletion", active.Id, day.Now, ct);
            ProgressionRules.Record(db, userId, "TaskReopened", "Task", id, task.LifeAreaId, day.Now, $"Reopened: {task.Title} ({change} XP)", active.Id);
        }
        if (!reopen && active is null)
        {
            var completion = new TaskCompletion { Id = Guid.NewGuid(), UserId = userId, TaskId = id, CompletedAtUtc = day.Now };
            completion.AwardedXp = await ProgressionRules.Award(db, userId, "TaskCompletion", completion.Id, task.LifeAreaId,
                task.Tier is "Tiny" or "Small" ? "SmallTasks" : "Tasks", ProgressionRules.TaskXp(task.Tier), day, ct);
            db.TaskCompletions.Add(completion);
            ProgressionRules.Record(db, userId, "TaskCompleted", "Task", id, task.LifeAreaId, day.Now, $"Completed: {task.Title} (+{completion.AwardedXp} XP)", completion.Id);
        }
        task.UpdatedAtUtc = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return Results.Ok(await Response(db, id, userId, ct));
    }

    private static Task<TaskResponse> Response(AppDbContext db, Guid id, Guid userId, CancellationToken ct) =>
        db.Tasks.Where(x => x.Id == id && x.UserId == userId).Select(TaskResponse.Projection).SingleAsync(ct);

    private static async Task<IResult?> Validate(TaskRequest request, Guid userId, AppDbContext db, CancellationToken ct)
    {
        if (!Productivity.TitleValid(request.Title)) return Productivity.Invalid("title", "Enter a title of 1–200 characters.");
        if (request.Details?.Length > 10000) return Productivity.Invalid("details", "Use at most 10000 characters.");
        if (request.Tier is not ("Tiny" or "Small" or "Medium" or "Large" or "Epic")) return Productivity.Invalid("tier", "Choose a valid task tier.");
        if (request.Priority is not ("Low" or "Normal" or "High")) return Productivity.Invalid("priority", "Choose Low, Normal or High.");
        if (request.EstimateMinutes is < 1 or > 10080) return Productivity.Invalid("estimateMinutes", "Use 1–10080 minutes.");
        if (!Productivity.DateValid(request.PlannedDate) || !Productivity.DateValid(request.DueDate)) return Productivity.Invalid("plannedDate", "Use dates between 1900 and 9998.");
        if (!await Productivity.OwnsArea(db, userId, request.LifeAreaId, ct)) return Productivity.NotFound();
        if (request.GoalId is not null && !await db.Goals.AnyAsync(x => x.Id == request.GoalId && x.UserId == userId, ct)) return Productivity.NotFound();
        return null;
    }

    private static void Apply(TaskItem task, TaskRequest request, DateTimeOffset now)
    {
        task.Title = request.Title!.Trim(); task.Details = request.Details?.Trim(); task.LifeAreaId = request.LifeAreaId;
        task.GoalId = request.GoalId; task.Tier = request.Tier; task.Priority = request.Priority;
        task.PlannedDate = request.PlannedDate; task.DueDate = request.DueDate;
        task.EstimateMinutes = request.EstimateMinutes; task.UpdatedAtUtc = now;
    }
}
