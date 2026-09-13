namespace Lifemaxing.Api.Features.Tasks;

// Named TaskItem in C# to avoid colliding with System.Threading.Tasks.Task.
public sealed class TaskItem
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? LifeAreaId { get; set; }
    public Guid? GoalId { get; set; }
    public string Title { get; set; } = "";
    public string? Details { get; set; }
    public string Tier { get; set; } = "Small";
    public string Priority { get; set; } = "Normal";
    public DateOnly? PlannedDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public int? EstimateMinutes { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public DateTimeOffset? DeletedAtUtc { get; set; }
    public List<TaskCompletion> Completions { get; set; } = [];
}

public sealed class TaskCompletion
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid TaskId { get; set; }
    public int AwardedXp { get; set; }
    public DateTimeOffset CompletedAtUtc { get; set; }
    public DateTimeOffset? ReversedAtUtc { get; set; }
}
