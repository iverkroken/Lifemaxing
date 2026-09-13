using Microsoft.AspNetCore.DataProtection;

namespace Lifemaxing.Api.Features.Auth;

public static class AuthDataProtection
{
    public static void Configure(WebApplicationBuilder builder)
    {
        var root = builder.Configuration["DataProtection:KeyDirectory"];
        if (string.IsNullOrWhiteSpace(root))
            root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Lifemaxing", "keys");
        if (!Path.IsPathFullyQualified(root))
            throw new InvalidOperationException("DataProtection:KeyDirectory must be an absolute, persistent path outside the repository.");

        var directory = new DirectoryInfo(Path.Combine(root, builder.Environment.EnvironmentName));
        if (OperatingSystem.IsWindows()) directory.Create();
        else Directory.CreateDirectory(directory.FullName, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);

        var protection = builder.Services.AddDataProtection()
            .SetApplicationName("Lifemaxing." + builder.Environment.EnvironmentName)
            .PersistKeysToFileSystem(directory);
        if (OperatingSystem.IsWindows()) protection.ProtectKeysWithDpapi();
    }
}
