using Lifemaxing.Api.Features.Progression;
using System.Threading.RateLimiting;
using Lifemaxing.Api.Data;
using Lifemaxing.Api.Features.Areas;
using Lifemaxing.Api.Features.Auth;
using Lifemaxing.Api.Features.Settings;
using Lifemaxing.Api.Features.System;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Features.Tasks;
using Lifemaxing.Api.Features.Today;
using Lifemaxing.Api.Features.Habits;
using Lifemaxing.Api.Features.Goals;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions.TryAdd("code", $"http_{context.ProblemDetails.Status}");
    };
});

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = builder.Environment.IsDevelopment()
        ? "Lifemaxing.Antiforgery"
        : "__Host-Lifemaxing.Antiforgery";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
});
builder.Services.AddAuthorization();
builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await Results.Problem(
            statusCode: StatusCodes.Status429TooManyRequests,
            title: "Too many sign-in attempts.",
            detail: "Wait a minute before trying again.",
            extensions: new Dictionary<string, object?> { ["code"] = "login_rate_limited" })
            .ExecuteAsync(context.HttpContext);
    };
});

builder.Services.AddSingleton(services =>
{
    var configuration = services.GetRequiredService<IConfiguration>();
    return NpgsqlDataSource.Create(configuration.GetConnectionString("Database")
        ?? throw new InvalidOperationException("Database connection is not configured."));
});
builder.Services.AddDbContext<AppDbContext>((services, options) =>
    options.UseNpgsql(services.GetRequiredService<NpgsqlDataSource>()));

builder.Services.AddIdentity<AppUser, IdentityRole<Guid>>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedEmail = true;
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
        options.Password.RequiredLength = 12;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
    })
    .AddEntityFrameworkStores<AppDbContext>();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = builder.Environment.IsDevelopment()
        ? "Lifemaxing.Auth"
        : "__Host-Lifemaxing.Auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(14);
    options.SlidingExpiration = true;
    options.Events = new CookieAuthenticationEvents
    {
        OnRedirectToLogin = context => WriteAuthenticationProblem(context, StatusCodes.Status401Unauthorized,
            "Authentication required.", "authentication_required"),
        OnRedirectToAccessDenied = context => WriteAuthenticationProblem(context, StatusCodes.Status403Forbidden,
            "Access denied.", "access_denied")
    };
});

var app = builder.Build();

if (args.Contains("--provision-owner", StringComparer.Ordinal))
{
    Environment.ExitCode = await OwnerProvisioning.RunAsync(app.Services, app.Configuration);
    return;
}

app.UseExceptionHandler();
app.UseStatusCodePages();
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    await next();
});
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseAntiforgery();
app.Use(async (context, next) => { if (HttpMethods.IsPost(context.Request.Method)) context.Request.EnableBuffering(); await next(); });

app.MapGet("/health/live", () => Results.Ok(new { status = "alive" }));
app.MapSystemEndpoints();
app.MapAuthEndpoints();
app.MapSettingsEndpoints();
app.MapAreaEndpoints();
var productivity = app.MapGroup("/api/v1").RequireAuthorization().AddEndpointFilter<ProductivityWriteFilter>();
productivity.MapTaskEndpoints();
productivity.MapTodayEndpoints();
productivity.MapHabitEndpoints();
productivity.MapGoalEndpoints();
productivity.MapProgressionEndpoints();
productivity.MapFocusEndpoints();

// Reserve API and health paths: even unknown routes must never return the SPA.
app.Map("/api/{**path}", () => Results.Problem(statusCode: 404, title: "Endpoint not found."));
app.Map("/health/{**path}", () => Results.Problem(statusCode: 404, title: "Endpoint not found."));
app.MapMethods("/register", ["POST", "PUT", "PATCH", "DELETE"],
    () => Results.Problem(statusCode: 404, title: "Endpoint not found."));
app.MapFallbackToFile("index.html");

app.Run();

static Task WriteAuthenticationProblem(RedirectContext<CookieAuthenticationOptions> context, int statusCode,
    string title, string code)
{
    context.Response.StatusCode = statusCode;
    return Results.Problem(statusCode: statusCode, title: title,
            extensions: new Dictionary<string, object?> { ["code"] = code })
        .ExecuteAsync(context.HttpContext);
}

public partial class Program;
