namespace Lifemaxing.Api.Features.Today;

public sealed class DailyCommitment
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid TaskId { get; set; }
    public DateOnly LocalDate { get; set; }
    public string TimeZoneId { get; set; } = "";
    public DateTimeOffset CommittedAtUtc { get; set; }
    public DateTimeOffset? RemovedAtUtc { get; set; }
}

public sealed class DailyMission
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly LocalDate { get; set; }
    public Guid TaskId { get; set; }
    public DateTimeOffset SelectedAtUtc { get; set; }
}
