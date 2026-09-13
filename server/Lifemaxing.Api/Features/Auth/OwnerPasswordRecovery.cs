using System.Text;
using Lifemaxing.Api.Data;
using Microsoft.AspNetCore.Identity;

namespace Lifemaxing.Api.Features.Auth;

public static class OwnerPasswordRecovery
{
    public static async Task<int> RunAsync(IServiceProvider services, IHostEnvironment environment, string[] args)
    {
        if (!environment.IsDevelopment())
        {
            Console.Error.WriteLine("Password recovery is available only in Development.");
            return 1;
        }
        if (args.Length != 1 || Console.IsInputRedirected || Console.IsOutputRedirected)
        {
            Console.Error.WriteLine("Use --reset-owner-password alone in an interactive local terminal. No password arguments or redirected input are accepted.");
            return 1;
        }

        Console.Write("Existing account email: ");
        var email = Console.ReadLine();
        if (string.IsNullOrWhiteSpace(email)) return 1;
        Console.WriteLine(PasswordPolicy.Guidance);
        Console.WriteLine("Maximum 128 characters. Escape cancels. Input is masked; spaces are preserved.");
        try
        {
            var password = ReadPassword("New password: ");
            var confirmation = ReadPassword("Confirm new password: ");
            if (password != confirmation)
            {
                Console.Error.WriteLine("Passwords did not match. Nothing changed.");
                return 1;
            }
            var result = await ResetAsync(services, environment, email.Trim(), password);
            if (!result.Succeeded)
            {
                foreach (var error in result.Errors) Console.Error.WriteLine(error.Description);
                return 1;
            }
            Console.WriteLine("Password reset. Existing data preserved, lockout cleared. Older sessions are rejected on requests after at most one minute.");
            return 0;
        }
        catch (OperationCanceledException)
        {
            Console.Error.WriteLine("Recovery cancelled. Nothing changed.");
            return 1;
        }
        catch (InvalidOperationException)
        {
            Console.Error.WriteLine("Interactive password input is unavailable. Recovery cancelled.");
            return 1;
        }
    }

    // Also used by isolated integration tests; never mapped to an HTTP route.
    public static async Task<IdentityResult> ResetAsync(IServiceProvider services, IHostEnvironment environment,
        string email, string password)
    {
        if (!environment.IsDevelopment())
            return IdentityResult.Failed(new IdentityError { Code = "DevelopmentOnly", Description = "Recovery requires Development." });
        await using var scope = services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await using var transaction = await db.Database.BeginTransactionAsync();
        var user = await users.FindByEmailAsync(email);
        if (user is null)
            return IdentityResult.Failed(new IdentityError { Code = "AccountMissing", Description = "No existing account matches that email. Nothing changed." });
        var token = await users.GeneratePasswordResetTokenAsync(user);
        var result = await users.ResetPasswordAsync(user, token, password);
        if (!result.Succeeded) return result;
        result = await users.SetLockoutEndDateAsync(user, null);
        if (!result.Succeeded) return result;
        result = await users.ResetAccessFailedCountAsync(user);
        if (!result.Succeeded) return result;
        await transaction.CommitAsync();
        return IdentityResult.Success;
    }

    private static string ReadPassword(string prompt)
    {
        Console.Write(prompt);
        var value = new StringBuilder();
        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Escape) throw new OperationCanceledException();
            if (key.Key == ConsoleKey.Enter) { Console.WriteLine(); return value.ToString(); }
            if (key.Key == ConsoleKey.Backspace && value.Length > 0)
            {
                value.Length--;
                Console.Write("\b \b");
            }
            else if (!char.IsControl(key.KeyChar))
            {
                value.Append(key.KeyChar);
                Console.Write('*');
                // Abort excessive input instead of silently truncating a password.
                if (value.Length > PasswordPolicy.MaximumLength * 2) throw new OperationCanceledException();
            }
        }
    }
}
