namespace Lifemaxing.Api.Features.Progression;

public sealed class XpEntry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public int AmountSigned { get; set; }
    public string Kind { get; set; } = "Award";
    public string SourceKind { get; set; } = "";
    public Guid SourceId { get; set; }
    public Guid? RelatedEntryId { get; set; }
    public Guid? LifeAreaId { get; set; }
    public DateTimeOffset OccurredAtUtc { get; set; }
    // The award's calendar bucket is preserved by a reversal, even after travel.
    public DateOnly LocalDate { get; set; }
    public string TimeZoneId { get; set; } = "";
    public string Category { get; set; } = "";
    public int RuleVersion { get; set; } = 1;
}

public sealed class ActivityEvent
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Kind { get; set; } = "";
    public string SubjectKind { get; set; } = "";
    public Guid SubjectId { get; set; }
    public Guid? LifeAreaId { get; set; }
    public DateTimeOffset OccurredAtUtc { get; set; }
    public string Summary { get; set; } = "";
    public int SchemaVersion { get; set; } = 1;
    public Guid? SourceEventId { get; set; }
}

public sealed class CommandReceipt
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ClientActionId { get; set; }
    public string Operation { get; set; } = "";
    public string RequestHash { get; set; } = "";
    public Guid? ResultId { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public string ResponseJson { get; set; } = "";
    public int StatusCode { get; set; }
}

public sealed class Reward
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = "";
    public int RequiredLevel { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? ArchivedAtUtc { get; set; }
}

public sealed class RewardClaim
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid RewardId { get; set; }
    public DateTimeOffset ClaimedAtUtc { get; set; }
}

public sealed class FocusSession
{
    public Guid? FocusRunId { get; set; }
    public int? PlannedSeconds { get; set; }
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? TaskId { get; set; }
    public Guid? GoalId { get; set; }
    public Guid? HabitId { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset? RunningSinceUtc { get; set; }
    public long AccumulatedSeconds { get; set; }
    public DateTimeOffset? EndedAtUtc { get; set; }
    public string Status { get; set; } = "Running";
}
