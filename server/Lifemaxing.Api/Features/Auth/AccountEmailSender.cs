using System.Net.Http.Headers;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Lifemaxing.Api.Features.Auth;

public sealed record AccountEmail(string To, string Subject, string Link);

public interface IAccountEmailSender
{
    bool IsAvailable { get; }
    string Delivery { get; }
    Task<bool> SendAsync(AccountEmail message, CancellationToken cancellationToken);
}

public sealed class AccountEmailSender(
    IOptions<AccountOptions> options, IWebHostEnvironment environment, IHttpClientFactory clients) : IAccountEmailSender
{
    private readonly AccountOptions accounts = options.Value;

    public string Delivery => IsAvailable ? accounts.Email.Provider.ToLowerInvariant() : "disabled";
    public bool IsAvailable => accounts.HasTrustedOrigin(environment) && (accounts.Email.Provider switch
    {
        "Development" => environment.IsDevelopment(),
        "Resend" => !string.IsNullOrWhiteSpace(accounts.Email.ApiKey) && !string.IsNullOrWhiteSpace(accounts.Email.From),
        _ => false
    });

    public async Task<bool> SendAsync(AccountEmail message, CancellationToken cancellationToken)
    {
        if (!IsAvailable) return false;
        try
        {
            if (accounts.Email.Provider == "Development")
            {
                var directory = PrivateMailboxDirectory();
                var filename = Path.Combine(directory, Guid.NewGuid().ToString("N") + ".json");
                await File.WriteAllTextAsync(filename, JsonSerializer.Serialize(message), cancellationToken);
                if (!OperatingSystem.IsWindows())
                    File.SetUnixFileMode(filename, UnixFileMode.UserRead | UnixFileMode.UserWrite);
                return true;
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accounts.Email.ApiKey);
            request.Content = JsonContent.Create(new
            {
                from = accounts.Email.From, to = new[] { message.To }, subject = message.Subject,
                text = $"{message.Subject}\n\nOpen this link, then follow the instructions to continue:\n{message.Link}\n\nIf you did not request this, you can ignore this message."
            });
            using var response = await clients.CreateClient("AccountEmail").SendAsync(request, cancellationToken);
            // Provider payloads can contain private data; never log or return them.
            return response.IsSuccessStatusCode;
        }
        catch (Exception exception) when (exception is HttpRequestException or IOException or UnauthorizedAccessException
            or InvalidOperationException or OperationCanceledException)
        {
            return false;
        }
    }

    private string PrivateMailboxDirectory()
    {
        var path = string.IsNullOrWhiteSpace(accounts.Email.MailboxDirectory)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Lifemaxing", "mailbox", "Development")
            : accounts.Email.MailboxDirectory;
        if (!Path.IsPathFullyQualified(path)) throw new InvalidOperationException("Mailbox must be outside the repository.");
        path = Path.GetFullPath(path);
        var contentRoot = new DirectoryInfo(environment.ContentRootPath);
        var repository = contentRoot;
        for (var parent = contentRoot; parent is not null; parent = parent.Parent)
        {
            if (Directory.Exists(Path.Combine(parent.FullName, ".git")) || File.Exists(Path.Combine(parent.FullName, ".git")))
            {
                repository = parent;
                break;
            }
        }
        if (IsWithin(path, repository.FullName) || IsWithin(path, environment.WebRootPath ?? Path.Combine(contentRoot.FullName, "wwwroot")))
            throw new InvalidOperationException("Mailbox must be outside the repository and webroot.");
        for (var parent = new DirectoryInfo(path); parent is not null; parent = parent.Parent)
            if (parent.Exists && parent.Attributes.HasFlag(FileAttributes.ReparsePoint))
                throw new InvalidOperationException("Mailbox must not traverse symbolic links.");

        if (OperatingSystem.IsWindows())
        {
            var directory = Directory.CreateDirectory(path);
            var security = new DirectorySecurity();
            security.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);
            security.AddAccessRule(new FileSystemAccessRule(WindowsIdentity.GetCurrent().User!, FileSystemRights.FullControl,
                InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
            directory.SetAccessControl(security);
        }
        else
        {
            Directory.CreateDirectory(path, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
            File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        }
        return path;
    }

    private static bool IsWithin(string path, string root) =>
        string.Equals(path.TrimEnd(Path.DirectorySeparatorChar), root.TrimEnd(Path.DirectorySeparatorChar), StringComparison.OrdinalIgnoreCase)
        || path.StartsWith(root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase);
}
