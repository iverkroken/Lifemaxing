namespace Lifemaxing.Api.Data;

public sealed class LifeArea
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public AppUser User { get; set; } = null!;
}
