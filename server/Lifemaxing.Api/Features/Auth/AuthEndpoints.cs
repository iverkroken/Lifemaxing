using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Lifemaxing.Api.Features.Auth;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var auth = app.MapGroup("/api/v1/auth");

        auth.MapGet("/csrf", (HttpContext context, IAntiforgery antiforgery) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            var tokens = antiforgery.GetAndStoreTokens(context);
            return Results.Ok(new CsrfResponse(tokens.RequestToken!));
        }).AllowAnonymous();

        auth.MapPost("/login", async (LoginRequest request, SignInManager<AppUser> signInManager,
            IHostEnvironment environment, IConfiguration configuration) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["email"] = ["Email is required."],
                    ["password"] = ["Password is required."]
                }, extensions: new Dictionary<string, object?> { ["code"] = "validation_failed" });
            }

            var user = await signInManager.UserManager.FindByEmailAsync(request.Email.Trim());
            if (user is null)
            {
                // Run the hasher once to reduce the timing difference for unknown accounts.
                _ = signInManager.UserManager.PasswordHasher.HashPassword(new AppUser(), request.Password);
                return InvalidCredentials();
            }

            var developmentExemption = DevelopmentLoginAccess.IsExempt(environment, configuration, user);
            if (developmentExemption)
            {
                var unlock = await DevelopmentLoginAccess.ClearLockoutAsync(signInManager.UserManager, user);
                if (!unlock.Succeeded) return Results.Problem(statusCode: 409, title: "Sign-in could not be completed. Try again.");
            }
            if (await signInManager.UserManager.IsLockedOutAsync(user))
            {
                _ = signInManager.UserManager.PasswordHasher.HashPassword(new AppUser(), request.Password);
                return InvalidCredentials();
            }

            var result = await signInManager.PasswordSignInAsync(user, request.Password, request.RememberMe, lockoutOnFailure: !developmentExemption);
            if (result.IsNotAllowed)
                _ = signInManager.UserManager.PasswordHasher.HashPassword(new AppUser(), request.Password);

            return result.Succeeded ? Results.NoContent() : InvalidCredentials();
        }).AllowAnonymous().ValidateAntiforgery().RequireRateLimiting("login");

        auth.MapPost("/logout", async (SignInManager<AppUser> signInManager) =>
        {
            await signInManager.SignOutAsync();
            return Results.NoContent();
        }).RequireAuthorization().ValidateAntiforgery();

        auth.MapPost("/logout-everywhere", async (ClaimsPrincipal principal, SignInManager<AppUser> signInManager) =>
        {
            var user = await signInManager.UserManager.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            var result = await signInManager.UserManager.UpdateSecurityStampAsync(user);
            if (!result.Succeeded) return Results.Problem(statusCode: 409, title: "Sessions could not be revoked. Try again.");
            await signInManager.SignOutAsync();
            return Results.NoContent();
        }).RequireAuthorization().ValidateAntiforgery();

        auth.MapGet("/me", async (HttpContext context, ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            var userId = principal.GetUserId();
            var result = await db.Users
                .Where(user => user.Id == userId)
                .Select(user => new MeResponse(user.Id, user.Email!))
                .SingleAsync(cancellationToken);
            return Results.Ok(result);
        }).RequireAuthorization();
    }

    private static IResult InvalidCredentials() => Results.Problem(
        statusCode: StatusCodes.Status401Unauthorized,
        title: "Sign-in failed.",
        detail: "Sign-in failed. Check your email and password, or wait a few minutes before trying again.",
        extensions: new Dictionary<string, object?> { ["code"] = "invalid_credentials" });
}

public sealed record CsrfResponse(string RequestToken);
public sealed record LoginRequest(string Email, string Password, bool RememberMe = false);
public sealed record MeResponse(Guid Id, string Email);
