using Microsoft.AspNetCore.Antiforgery;

namespace Lifemaxing.Api.Common;

public static class AntiforgeryEndpointExtensions
{
    public static RouteHandlerBuilder ValidateAntiforgery(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter(async (invocationContext, next) =>
        {
            var httpContext = invocationContext.HttpContext;
            var antiforgery = httpContext.RequestServices.GetRequiredService<IAntiforgery>();
            try
            {
                await antiforgery.ValidateRequestAsync(httpContext);
            }
            catch (AntiforgeryValidationException)
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "CSRF validation failed.",
                    detail: "Request a fresh CSRF token and try again.",
                    extensions: new Dictionary<string, object?> { ["code"] = "csrf_validation_failed" });
            }

            return await next(invocationContext);
        });
    }
}
