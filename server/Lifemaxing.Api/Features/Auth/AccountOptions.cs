namespace Lifemaxing.Api.Features.Auth;

public sealed class AccountOptions
{
    public string PublicOrigin { get; set; } = "";
    public int TokenLifetimeHours { get; set; } = 2;
    public AccountEmailOptions Email { get; set; } = new();

    public bool HasTrustedOrigin(IHostEnvironment environment) =>
        Uri.TryCreate(PublicOrigin, UriKind.Absolute, out var uri)
        && (uri.Scheme == "https" || (environment.IsDevelopment() && uri.Scheme == "http" && uri.IsLoopback))
        && string.IsNullOrEmpty(uri.UserInfo) && uri.AbsolutePath == "/"
        && string.IsNullOrEmpty(uri.Query) && string.IsNullOrEmpty(uri.Fragment);

    public string Link(string path, Guid userId, string token) =>
        $"{PublicOrigin.TrimEnd('/')}/{path}#userId={userId:D}&token={Uri.EscapeDataString(token)}";
}

public sealed class AccountEmailOptions
{
    public string Provider { get; set; } = "Disabled";
    public string ApiKey { get; set; } = "";
    public string From { get; set; } = "";
    public string MailboxDirectory { get; set; } = "";
}

// Configuration boundary only. Apple has no handler until signing/rotation and provider validation are implemented.
public sealed class AppleAccountOptions
{
    public string ClientId { get; set; } = "";
    public string TeamId { get; set; } = "";
    public string KeyId { get; set; } = "";
}
