namespace Lifemaxing.Api.Data;

public static class WorkspaceInitialization
{
    private static readonly (string Key, string DisplayName)[] DefaultAreas =
    [
        ("fitness", "Health & Fitness"), ("university", "University"), ("career", "Work & Career"),
        ("finance", "Finance"), ("home", "Home & Plants"), ("style", "Style"),
        ("food", "Food & Cooking"), ("creative", "Creative"), ("travel", "Travel"), ("personal", "Personal")
    ];

    // The caller saves these rows inside the transaction that creates the Identity account.
    public static void Add(AppDbContext db, Guid userId, string timeZoneId = "UTC", string locale = "en-GB")
    {
        db.UserSettings.Add(new UserSettings
        {
            UserId = userId, TimeZoneId = timeZoneId, Locale = locale, CreatedAtUtc = DateTimeOffset.UtcNow
        });
        db.LifeAreas.AddRange(DefaultAreas.Select((area, index) => new LifeArea
        {
            Id = Guid.NewGuid(), UserId = userId, Key = area.Key,
            DisplayName = area.DisplayName, IsActive = true, SortOrder = index
        }));
    }
}
