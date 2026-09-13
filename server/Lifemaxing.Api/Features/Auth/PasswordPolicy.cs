using System.Text;
using Lifemaxing.Api.Data;
using Microsoft.AspNetCore.Identity;

namespace Lifemaxing.Api.Features.Auth;

public sealed class PasswordPolicy : IPasswordValidator<AppUser>
{
    public const int MinimumLength = 15;
    public const int MaximumLength = 128;
    public const string Guidance = "Bruk minst 15 tegn. Flere tilfeldige ord fungerer fint. Tall og spesialtegn er ikke påkrevd.";

    private static readonly Lazy<HashSet<string>> CommonPasswords = new(() =>
    {
        using var stream = typeof(PasswordPolicy).Assembly.GetManifestResourceStream(
            "Lifemaxing.Api.Features.Auth.common-passwords.txt")
            ?? throw new InvalidOperationException("The local password blocklist is missing.");
        using var reader = new StreamReader(stream);
        var passwords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        while (reader.ReadLine() is { } line) passwords.Add(line);
        return passwords;
    });

    public Task<IdentityResult> ValidateAsync(UserManager<AppUser> manager, AppUser user, string? password)
    {
        var length = password?.EnumerateRunes().Count() ?? 0;
        var errors = new List<IdentityError>();
        if (length < MinimumLength || length > MaximumLength)
            errors.Add(new IdentityError { Code = "PasswordLength", Description = "Use between 15 and 128 characters." });
        if (password is not null && CommonPasswords.Value.Contains(password))
            errors.Add(new IdentityError { Code = "PasswordCommon", Description = "This password is on the local common-password list. Choose a different phrase." });
        return Task.FromResult(errors.Count == 0 ? IdentityResult.Success : IdentityResult.Failed(errors.ToArray()));
    }
}
