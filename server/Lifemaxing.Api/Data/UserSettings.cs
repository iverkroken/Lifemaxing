namespace Lifemaxing.Api.Data;

public sealed class UserSettings
{
    public Guid UserId { get; set; }
    public string TimeZoneId { get; set; } = "Europe/Oslo";
    public string Locale { get; set; } = "nb-NO";
    public string UiLanguage { get; set; } = "en";
    public string Theme { get; set; } = "system";
    public string Density { get; set; } = "normal";
    public DateTimeOffset CreatedAtUtc { get; set; }
    public AppUser User { get; set; } = null!;
}
