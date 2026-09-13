using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Options;

namespace Lifemaxing.Api.Features.Auth;

public sealed class AuthSessionOptions
{
    public int SessionHours { get; set; } = 12;
    public int RememberDays { get; set; } = 30;
    public int StampValidationSeconds { get; set; } = 60;

    public static Task SetExpiry(CookieSigningInContext context)
    {
        var policy = context.HttpContext.RequestServices.GetRequiredService<IOptions<AuthSessionOptions>>().Value;
        var now = (context.Options.TimeProvider ?? TimeProvider.System).GetUtcNow();
        context.Properties.IssuedUtc = now;
        context.Properties.ExpiresUtc = now + (context.Properties.IsPersistent
            ? TimeSpan.FromDays(policy.RememberDays) : TimeSpan.FromHours(policy.SessionHours));
        context.Properties.AllowRefresh = false;
        return Task.CompletedTask;
    }
}
