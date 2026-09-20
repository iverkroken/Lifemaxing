using System.Security.Claims;
using System.Text.Json;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace Lifemaxing.Api.Features.Auth;

public static class ExternalAccountEndpoints
{
    private const string VerifiedEmailClaim = "lifemaxing:google:verified-email";
    private const string FailedRedirect = "/login?error=external_login_failed";
    public const string GoogleCallbackPath = "/api/v1/auth/external/google/complete";

    public static bool IsGoogleEnabled(IConfiguration configuration, AccountOptions accounts, IHostEnvironment environment) =>
        accounts.HasTrustedOrigin(environment) && !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientId"])
        && !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientSecret"]);

    public static void AddAccountLifecycle(this WebApplicationBuilder builder)
    {
        builder.Services.AddOptions<AccountOptions>().BindConfiguration("Authentication:Accounts")
            .Validate(options => options.TokenLifetimeHours is >= 1 and <= 24, "Account token lifetime must be between 1 and 24 hours.")
            .Validate(options => options.Email.Provider is "Disabled" or "Development" or "Resend", "Unknown account email provider.")
            .ValidateOnStart();
        builder.Services.AddOptions<AppleAccountOptions>().BindConfiguration("Authentication:Apple");
        builder.Services.AddOptions<DataProtectionTokenProviderOptions>().Configure<IOptions<AccountOptions>>(
            (tokens, accounts) => tokens.TokenLifespan = TimeSpan.FromHours(accounts.Value.TokenLifetimeHours));
        builder.Services.AddScoped<AccountRegistration>();
        builder.Services.AddScoped<IAccountEmailSender, AccountEmailSender>();
        builder.Services.AddHttpClient("AccountEmail", client => client.Timeout = TimeSpan.FromSeconds(15))
            .RemoveAllLoggers();

        var accounts = builder.Configuration.GetSection("Authentication:Accounts").Get<AccountOptions>() ?? new AccountOptions();
        if (!IsGoogleEnabled(builder.Configuration, accounts, builder.Environment)) return;
        builder.Services.AddAuthentication().AddGoogle(options =>
        {
            options.ClientId = builder.Configuration["Authentication:Google:ClientId"]!;
            options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"]!;
            options.SignInScheme = IdentityConstants.ExternalScheme;
            options.SaveTokens = false;
            options.CallbackPath = GoogleCallbackPath;
            options.Events.OnCreatingTicket = context =>
            {
                if (context.User.TryGetProperty("email_verified", out var verified) && verified.ValueKind == JsonValueKind.True)
                    context.Identity!.AddClaim(new Claim(VerifiedEmailClaim, "true"));
                return Task.CompletedTask;
            };
            options.Events.OnRemoteFailure = context =>
            {
                context.HandleResponse();
                context.Response.Redirect(FailedRedirect);
                return Task.CompletedTask;
            };
        });
    }

    public static void UseAccountPublicOrigin(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            if (context.Request.Path == GoogleCallbackPath || context.Request.Path == "/api/v1/auth/external/google")
            {
                var options = context.RequestServices.GetRequiredService<IOptions<AccountOptions>>().Value;
                if (IsGoogleEnabled(app.Configuration, options, app.Environment))
                {
                    // Both the authorization request and token exchange must use the same configured redirect URI.
                    var origin = new Uri(options.PublicOrigin);
                    context.Request.Scheme = origin.Scheme;
                    context.Request.Host = HostString.FromUriComponent(origin.Authority);
                    context.Request.PathBase = PathString.Empty;
                }
            }
            await next();
        });
    }

    public static void MapExternalAccountEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/auth/external");
        group.MapPost("/google", (SignInManager<AppUser> signIn, IConfiguration configuration,
            IOptions<AccountOptions> options, IHostEnvironment environment) =>
        {
            if (!IsGoogleEnabled(configuration, options.Value, environment))
                return AccountEndpoints.Problem(503, "external_provider_unavailable", "Google sign-in is not configured.");
            var properties = signIn.ConfigureExternalAuthenticationProperties("Google", "/api/v1/auth/external/google/callback");
            return Results.Challenge(properties, ["Google"]);
        }).AllowAnonymous().ValidateAntiforgery().RequireRateLimiting("login");

        group.MapGet("/google/callback", async (SignInManager<AppUser> signIn, AccountRegistration registration,
            CancellationToken cancellationToken) =>
        {
            var info = await signIn.GetExternalLoginInfoAsync();
            if (info is null || info.LoginProvider != "Google" || !info.Principal.HasClaim(VerifiedEmailClaim, "true"))
            {
                await signIn.Context.SignOutAsync(IdentityConstants.ExternalScheme);
                return Results.LocalRedirect(FailedRedirect);
            }
            var existing = await signIn.UserManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
            if (existing is null)
            {
                var email = info.Principal.FindFirstValue(ClaimTypes.Email);
                if (string.IsNullOrWhiteSpace(email) || email.Length > 254)
                    return await Fail(signIn, FailedRedirect);
                // An email match is not proof of local account ownership. Never silently attach a provider.
                if (await signIn.UserManager.FindByEmailAsync(email) is not null)
                    return await Fail(signIn, "/login?error=external_account_exists");
                var user = new AppUser { Id = Guid.NewGuid(), Email = email, UserName = email, EmailConfirmed = true };
                var result = await registration.CreateAsync(user, null, info, cancellationToken);
                if (!result.Succeeded) return await Fail(signIn, FailedRedirect);
            }
            var login = await signIn.ExternalLoginSignInAsync(info.LoginProvider, info.ProviderKey, isPersistent: false);
            await signIn.Context.SignOutAsync(IdentityConstants.ExternalScheme);
            return Results.LocalRedirect(login.Succeeded ? "/login?external=complete" : FailedRedirect);
        }).AllowAnonymous();
    }

    private static async Task<IResult> Fail(SignInManager<AppUser> signIn, string path)
    {
        await signIn.Context.SignOutAsync(IdentityConstants.ExternalScheme);
        return Results.LocalRedirect(path);
    }
}
