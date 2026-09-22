namespace Lifemaxing.Api.Data;

public sealed class LifeArea
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset? DeletedAtUtc { get; set; }
    public byte[]? CustomImage { get; set; }
    public string? CustomImageContentType { get; set; }
    public DateTimeOffset? CustomImageUpdatedAtUtc { get; set; }
    public decimal ImageFocalX { get; set; } = 50;
    public decimal ImageFocalY { get; set; } = 50;
    public AppUser User { get; set; } = null!;
}
