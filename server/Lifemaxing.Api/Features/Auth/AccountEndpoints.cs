using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace Lifemaxing.Api.Features.Auth;

public static class AccountEndpoints
{
    public static void MapAccountEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/auth");
        group.MapGet("/providers", (IAccountEmailSender sender, IConfiguration configuration, IOptions<AccountOptions> options, IHostEnvironment environment) =>
            Results.Ok(new
            {
                emailAvailable = sender.IsAvailable, emailDelivery = sender.Delivery,
                googleEnabled = ExternalAccountEndpoints.IsGoogleEnabled(configuration, options.Value, environment), appleEnabled = false
            })).AllowAnonymous();

        group.MapPost("/register", async (RegisterAccountRequest request, UserManager<AppUser> users,
            AccountRegistration registration, IAccountEmailSender sender, IOptions<AccountOptions> options, CancellationToken cancellationToken) =>
        {
            if (!ValidEmail(request.Email)) return EmailValidation();
            if (string.IsNullOrEmpty(request.Password)) return PasswordValidation();
            if (!sender.IsAvailable) return EmailUnavailable();
            var email = request.Email.Trim();
            if (await users.FindByEmailAsync(email) is not null) return EmailInUse();
            var user = new AppUser { Id = Guid.NewGuid(), Email = email, UserName = email, EmailConfirmed = false };
            var result = await registration.CreateAsync(user, request.Password, null, cancellationToken);
            if (!result.Succeeded) return IdentityProblem(result);
            var token = await users.GenerateEmailConfirmationTokenAsync(user);
            if (!await sender.SendAsync(new AccountEmail(email, "Confirm your LIFEMAXING email", options.Value.Link("verify-email", user.Id, token)), cancellationToken))
                return Problem(503, "email_delivery_failed", "Your account was created, but the verification email could not be sent. Request a new verification email later.");
            return Results.Json(new { status = "verification_required" }, statusCode: 202);
        }).AllowAnonymous().ValidateAntiforgery().RequireRateLimiting("login");

        group.MapPost("/resend-verification", (AccountEmailRequest request, UserManager<AppUser> users,
            IAccountEmailSender sender, IOptions<AccountOptions> options, CancellationToken cancellationToken) =>
            RequestEmail(request, users, sender, options.Value, reset: false, cancellationToken))
            .AllowAnonymous().ValidateAntiforgery().RequireRateLimiting("login");
        group.MapPost("/forgot-password", (AccountEmailRequest request, UserManager<AppUser> users,
            IAccountEmailSender sender, IOptions<AccountOptions> options, CancellationToken cancellationToken) =>
            RequestEmail(request, users, sender, options.Value, reset: true, cancellationToken))
            .AllowAnonymous().ValidateAntiforgery().RequireRateLimiting("login");

        group.MapPost("/confirm-email", async (AccountTokenRequest request, UserManager<AppUser> users) =>
        {
            if (!ValidToken(request.UserId, request.Token)) return InvalidToken();
            var user = await users.FindByIdAsync(request.UserId.ToString());
            if (user is null || user.EmailConfirmed) return InvalidToken();
            var result = await users.ConfirmEmailAsync(user, request.Token);
            return result.Succeeded ? Results.NoContent() : InvalidToken();
        }).AllowAnonymous().ValidateAntiforgery().RequireRateLimiting("login");

        group.MapPost("/reset-password", async (ResetAccountPasswordRequest request, UserManager<AppUser> users) =>
        {
            if (!ValidToken(request.UserId, request.Token)) return InvalidToken();
            if (string.IsNullOrEmpty(request.Password)) return PasswordValidation();
            var user = await users.FindByIdAsync(request.UserId.ToString());
            if (user is null || !user.EmailConfirmed) return InvalidToken();
            // Identity updates the stamp and concurrency stamp: old sessions and reset-token replays fail.
            var result = await users.ResetPasswordAsync(user, request.Token, request.Password);
            return result.Succeeded ? Results.NoContent() : IdentityProblem(result);
        }).AllowAnonymous().ValidateAntiforgery().RequireRateLimiting("login");

        group.MapPost("/change-password", async (ChangeAccountPasswordRequest request, ClaimsPrincipal principal, SignInManager<AppUser> signIn) =>
        {
            if (string.IsNullOrEmpty(request.CurrentPassword) || string.IsNullOrEmpty(request.Password)) return PasswordValidation();
            var user = await signIn.UserManager.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            var result = await signIn.UserManager.ChangePasswordAsync(user, request.CurrentPassword, request.Password);
            if (!result.Succeeded) return IdentityProblem(result);
            await signIn.SignOutAsync();
            return Results.NoContent();
        }).RequireAuthorization().ValidateAntiforgery().RequireRateLimiting("login");
    }

    private static async Task<IResult> RequestEmail(AccountEmailRequest request, UserManager<AppUser> users,
        IAccountEmailSender sender, AccountOptions options, bool reset, CancellationToken cancellationToken)
    {
        if (!ValidEmail(request.Email)) return EmailValidation();
        if (!sender.IsAvailable) return EmailUnavailable();
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is not null && (reset ? user.EmailConfirmed : !user.EmailConfirmed))
        {
            var token = reset ? await users.GeneratePasswordResetTokenAsync(user) : await users.GenerateEmailConfirmationTokenAsync(user);
            // Never distinguish an existing account or a delivery failure in this response.
            await sender.SendAsync(new AccountEmail(user.Email!, reset ? "Reset your LIFEMAXING password" : "Confirm your LIFEMAXING email",
                options.Link(reset ? "reset-password" : "verify-email", user.Id, token)), cancellationToken);
        }
        return Results.Json(new { status = "request_received" }, statusCode: 202);
    }

    private static bool ValidEmail(string? email) => !string.IsNullOrWhiteSpace(email) && email.Trim().Length <= 254 && new EmailAddressAttribute().IsValid(email.Trim());
    private static bool ValidToken(Guid userId, string? token) => userId != Guid.Empty && !string.IsNullOrWhiteSpace(token) && token.Length <= 4096;
    private static IResult EmailValidation() => Validation("email", ["Enter a valid email address."]);
    private static IResult PasswordValidation() => Validation("password", ["A password is required."]);
    private static IResult Validation(string field, string[] errors) => Results.ValidationProblem(new Dictionary<string, string[]> { [field] = errors },
        extensions: new Dictionary<string, object?> { ["code"] = "validation_failed" });
    private static IResult EmailInUse() => Problem(409, "email_in_use", "An account already uses this email. Sign in or reset your password.");
    private static IResult EmailUnavailable() => Problem(503, "email_unavailable", "Account email delivery is not configured. Try again later.");
    private static IResult InvalidToken() => Problem(400, "invalid_token", "This link is invalid, expired or already used. Request a new link.");
    public static IResult Problem(int status, string code, string detail) => Results.Problem(statusCode: status, title: detail,
        extensions: new Dictionary<string, object?> { ["code"] = code });
    private static IResult IdentityProblem(IdentityResult result)
    {
        if (result.Errors.Any(error => error.Code == "PasswordMismatch"))
            return Problem(400, "password_change_failed", "The current password is incorrect.");
        if (result.Errors.Any(error => error.Code is "DuplicateEmail" or "DuplicateUserName")) return EmailInUse();
        if (result.Errors.Any(error => error.Code is "InvalidToken" or "ConcurrencyFailure")) return InvalidToken();
        return Validation("password", result.Errors.Select(error => error.Description).ToArray());
    }
}

public sealed record RegisterAccountRequest(string Email, string Password);
public sealed record AccountEmailRequest(string Email);
public sealed record AccountTokenRequest(Guid UserId, string Token);
public sealed record ResetAccountPasswordRequest(Guid UserId, string Token, string Password);
public sealed record ChangeAccountPasswordRequest(string CurrentPassword, string Password);
