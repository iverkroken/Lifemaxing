namespace Lifemaxing.Api.Features.Goals;

public sealed class Goal
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? LifeAreaId { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string State { get; set; } = "Active";
    public decimal? TargetValue { get; set; }
    public decimal? BaselineValue { get; set; }
    public string? Unit { get; set; }
    public string? Direction { get; set; }
    public DateOnly? TargetDate { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
    public DateTimeOffset? ArchivedAtUtc { get; set; }
    public DateTimeOffset? DeletedAtUtc { get; set; }
}

public sealed class GoalProgressEntry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid GoalId { get; set; }
    public DateTimeOffset RecordedAtUtc { get; set; }
    public decimal? Value { get; set; }
    public string? Note { get; set; }
}
