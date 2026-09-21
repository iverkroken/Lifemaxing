using System.Security.Claims;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Today;

public sealed class DailyGoalSelection
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid GoalId { get; set; }
    public DateOnly LocalDate { get; set; }
    public string TimeZoneId { get; set; } = "";
    public DateTimeOffset SelectedAtUtc { get; set; }
    public DateTimeOffset? RemovedAtUtc { get; set; }
}

public static class DailyGoalEndpoints
{
    public static void MapDailyGoalEndpoints(this RouteGroupBuilder api)
    {
        api.MapPut("/today/{date}/goals/{goalId:guid}", (DateOnly date, Guid goalId, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
            Select(date, goalId, false, principal.GetUserId(), db, clock, ct));
        api.MapDelete("/today/{date}/goals/{goalId:guid}", (DateOnly date, Guid goalId, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
            Select(date, goalId, true, principal.GetUserId(), db, clock, ct));
    }

    private static async Task<IResult> Select(DateOnly date, Guid goalId, bool remove, Guid owner, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        if (!Productivity.DateValid(date)) return Productivity.Invalid("date", "Use dates between 1900 and 9998.");
        var goal = await db.Goals.SingleOrDefaultAsync(x => x.Id == goalId && x.UserId == owner, ct);
        if (goal == null) return Productivity.NotFound();
        if (!remove && (goal.ArchivedAtUtc != null || goal.State != "Active")) return Productivity.Conflict("Choose an active goal.");
        var selection = await db.DailyGoalSelections.SingleOrDefaultAsync(x => x.UserId == owner && x.GoalId == goalId && x.LocalDate == date, ct);
        var day = await Productivity.Day(db, owner, clock, ct);
        if (remove)
        {
            if (selection != null) selection.RemovedAtUtc ??= day.Now;
        }
        else if (selection == null)
            db.DailyGoalSelections.Add(new DailyGoalSelection { Id = Guid.NewGuid(), UserId = owner, GoalId = goalId, LocalDate = date, TimeZoneId = day.TimeZoneId, SelectedAtUtc = day.Now });
        else selection.RemovedAtUtc = null;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }
}
