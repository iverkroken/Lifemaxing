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

        auth.MapPost("/login", async (LoginRequest request, SignInManager<AppUser> signInManager) =>
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
                _ = signInManager.UserManager.PasswordHasher.VerifyHashedPassword(
                    new AppUser(), signInManager.UserManager.PasswordHasher.HashPassword(new AppUser(), "timing-only"), request.Password);
                return InvalidCredentials();
            }

            var result = await signInManager.PasswordSignInAsync(user, request.Password, isPersistent: true, lockoutOnFailure: true);
            if (result.IsLockedOut)
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status423Locked,
                    title: "Account temporarily locked.",
                    detail: "Too many unsuccessful sign-in attempts. Try again later.",
                    extensions: new Dictionary<string, object?> { ["code"] = "account_locked" });
            }

            return result.Succeeded ? Results.NoContent() : InvalidCredentials();
        }).AllowAnonymous().ValidateAntiforgery().RequireRateLimiting("login");

        auth.MapPost("/logout", async (SignInManager<AppUser> signInManager) =>
        {
            await signInManager.SignOutAsync();
            return Results.NoContent();
        }).RequireAuthorization().ValidateAntiforgery();

        auth.MapGet("/me", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
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
        detail: "The email or password is incorrect.",
        extensions: new Dictionary<string, object?> { ["code"] = "invalid_credentials" });
}

public sealed record CsrfResponse(string RequestToken);
public sealed record LoginRequest(string Email, string Password);
public sealed record MeResponse(Guid Id, string Email);
