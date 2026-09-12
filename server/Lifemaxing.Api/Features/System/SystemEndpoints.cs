using System.Data.Common;
using Npgsql;

namespace Lifemaxing.Api.Features.System;

public static class SystemEndpoints
{
    public static void MapSystemEndpoints(this WebApplication app)
    {
        // Phase 0 exposes only non-personal connectivity information.
        app.MapGet("/api/v1/system/status", async (HttpContext context, IConfiguration configuration, CancellationToken cancellationToken) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            if (string.IsNullOrWhiteSpace(configuration.GetConnectionString("Database")))
            {
                return Results.Ok(new SystemStatusResponse("available", "not_configured"));
            }

            try
            {
                var dataSource = context.RequestServices.GetRequiredService<NpgsqlDataSource>();
                await using var command = dataSource.CreateCommand("SELECT 1");
                command.CommandTimeout = 5;
                await command.ExecuteScalarAsync(cancellationToken);
                return Results.Ok(new SystemStatusResponse("available", "available"));
            }
            catch (Exception exception) when (exception is DbException or TimeoutException)
            {
                // Connection exceptions may contain server or credential details. Do not expose them.
                return Results.Problem(
                    statusCode: StatusCodes.Status503ServiceUnavailable,
                    title: "Database unavailable.",
                    detail: "The application is running, but the database could not be reached. Try again shortly.",
                    extensions: new Dictionary<string, object?> { ["code"] = "database_unavailable" });
            }
        });
    }
}

public sealed record SystemStatusResponse(string Api, string Database);
