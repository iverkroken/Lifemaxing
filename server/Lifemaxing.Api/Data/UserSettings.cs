namespace Lifemaxing.Api.Data;

public sealed class UserSettings
{
    public Guid UserId { get; set; }
    public string TimeZoneId { get; set; } = "Europe/Oslo";
    public string Locale { get; set; } = "nb-NO";
    public DateTimeOffset CreatedAtUtc { get; set; }
    public AppUser User { get; set; } = null!;
}
