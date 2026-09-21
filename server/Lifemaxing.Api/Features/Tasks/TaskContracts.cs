using System.Linq.Expressions;

namespace Lifemaxing.Api.Features.Tasks;

public sealed record TaskRequest(string? Title, string? Details = null, Guid? LifeAreaId = null,
    Guid? GoalId = null, string Tier = "Small", string Priority = "Normal", DateOnly? PlannedDate = null,
    DateOnly? DueDate = null, int? EstimateMinutes = null);

public sealed record TaskResponse(Guid Id, string Title, string? Details, Guid? LifeAreaId, Guid? GoalId,
    string Tier, string Priority, DateOnly? PlannedDate, DateOnly? DueDate, int? EstimateMinutes,
    DateTimeOffset CreatedAtUtc, DateTimeOffset UpdatedAtUtc, DateTimeOffset? DeletedAtUtc, bool IsCompleted)
{
    public int ExpectedXp => Progression.ProgressionRules.TaskXp(Tier);
    public static readonly Expression<Func<TaskItem, TaskResponse>> Projection = x => new TaskResponse(
        x.Id, x.Title, x.Details, x.LifeAreaId, x.GoalId, x.Tier, x.Priority, x.PlannedDate, x.DueDate,
        x.EstimateMinutes, x.CreatedAtUtc, x.UpdatedAtUtc, x.DeletedAtUtc,
        x.Completions.Any(c => c.ReversedAtUtc == null));
}
