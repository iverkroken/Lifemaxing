using Lifemaxing.Api.Data;
using Microsoft.AspNetCore.Identity;

namespace Lifemaxing.Api.Features.Auth;

// Opt-in local configuration, never a persisted change to LockoutEnabled.
// The same account/database retains normal Identity lockout outside Development.
public static class DevelopmentLoginAccess
{
    public static bool IsExempt(IHostEnvironment environment, IConfiguration configuration, AppUser user)
    {
        var email = configuration["DevelopmentAccess:Email"];
        return environment.IsDevelopment()
            && configuration.GetValue<bool>("DevelopmentAccess:DisableAccountLockout")
            && !string.IsNullOrWhiteSpace(email)
            && string.Equals(user.NormalizedEmail, email.Trim().ToUpperInvariant(), StringComparison.Ordinal);
    }

    public static async Task<IdentityResult> ClearLockoutAsync(UserManager<AppUser> users, AppUser user)
    {
        if (user.LockoutEnd is not null)
        {
            var result = await users.SetLockoutEndDateAsync(user, null);
            if (!result.Succeeded) return result;
        }
        return await users.ResetAccessFailedCountAsync(user);
    }

    public static async Task<int> UnlockAsync(IServiceProvider services, IHostEnvironment environment, IConfiguration configuration)
    {
        if (!environment.IsDevelopment())
        {
            Console.Error.WriteLine("Local account unlock requires Development.");
            return 1;
        }
        var email = configuration["DevelopmentAccess:Email"];
        if (string.IsNullOrWhiteSpace(email))
        {
            Console.Error.WriteLine("Configure DevelopmentAccess:Email in local User Secrets first.");
            return 1;
        }
        await using var scope = services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = await users.FindByEmailAsync(email.Trim());
        if (user is null || !IsExempt(environment, configuration, user))
        {
            Console.Error.WriteLine("No existing account matches the enabled Development access configuration. Nothing changed.");
            return 1;
        }
        var result = await ClearLockoutAsync(users, user);
        Console.WriteLine(result.Succeeded ? "Existing Development account unlocked. Password and all domain data preserved." : "Unlock failed. Retry the local command.");
        return result.Succeeded ? 0 : 1;
    }
}
