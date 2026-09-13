using System.Text.Json;
using System.Text.Json.Nodes;
using Lifemaxing.Api.Data;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Common;

public sealed class ProductivityWriteFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        if (HttpMethods.IsGet(http.Request.Method)) return await next(context);
        try
        {
            await http.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(http);
        }
        catch (AntiforgeryValidationException)
        {
            return Productivity.Problem(400, "CSRF validation failed.", "csrf_validation_failed");
        }

        var db = http.RequestServices.GetRequiredService<AppDbContext>();
        await using var transaction = await db.Database.BeginTransactionAsync(http.RequestAborted);
        // One owner's planning mutations are serialized. This protects schedule boundaries,
        // mission replacement and completion/reversal checks across concurrent requests.
        var userId = http.User.GetUserId();
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM \"UserSettings\" WHERE \"UserId\" = {userId} FOR UPDATE", http.RequestAborted);
        try
        {
            var result = await next(context);
            if (result is not IStatusCodeHttpResult { StatusCode: >= 400 })
                await transaction.CommitAsync(http.RequestAborted);
            return result;
        }
        catch (JsonException)
        {
            return Productivity.Invalid("request", "Use valid fields and values for this resource.");
        }
    }
}

public static class Productivity
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    // Typed merge patch preserves omitted fields while allowing explicit null to clear a date/link.
    public static T Patch<T>(T current, JsonElement patch)
    {
        if (patch.ValueKind != JsonValueKind.Object) throw new JsonException();
        var node = JsonSerializer.SerializeToNode(current, JsonOptions)!.AsObject();
        foreach (var field in patch.EnumerateObject())
        {
            if (!node.ContainsKey(field.Name)) throw new JsonException();
            node[field.Name] = JsonNode.Parse(field.Value.GetRawText());
        }
        return node.Deserialize<T>(JsonOptions) ?? throw new JsonException();
    }

    public static IResult Invalid(string field, string message) => Results.ValidationProblem(
        new Dictionary<string, string[]> { [field] = [message] },
        extensions: new Dictionary<string, object?> { ["code"] = "validation_failed" });
    public static IResult Problem(int status, string title, string code) => Results.Problem(
        statusCode: status, title: title, extensions: new Dictionary<string, object?> { ["code"] = code });
    public static IResult NotFound() => Problem(404, "Resource not found.", "resource_not_found");
    public static IResult Conflict(string message) => Problem(409, message, "state_conflict");
    public static bool TitleValid(string? value) => !string.IsNullOrWhiteSpace(value) && value.Trim().Length <= 200;
    public static bool DateValid(DateOnly? value) => value is null || value >= new DateOnly(1900, 1, 1) && value <= new DateOnly(9998, 12, 31);
    public static bool NumberValid(decimal? value) => value is null || Math.Abs(value.Value) < 100000000000000m && decimal.Round(value.Value, 4) == value;
    public static int Page(int? page) => Math.Max(1, page ?? 1);
    public static int PageSize(int? pageSize) => Math.Clamp(pageSize ?? 30, 1, 100);
    public static Task<bool> OwnsArea(AppDbContext db, Guid userId, Guid? areaId, CancellationToken ct) =>
        areaId is null ? Task.FromResult(true) : db.LifeAreas.AnyAsync(x => x.Id == areaId && x.UserId == userId, ct);
    public static DateOnly LocalDate(DateTimeOffset instant, string timeZoneId) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, TimeZoneInfo.FindSystemTimeZoneById(timeZoneId)).DateTime);
    public static async Task<OwnerDay> Day(AppDbContext db, Guid userId, TimeProvider clock, CancellationToken ct)
    {
        var zone = await db.UserSettings.Where(x => x.UserId == userId).Select(x => x.TimeZoneId).SingleAsync(ct);
        var now = clock.GetUtcNow();
        return new OwnerDay(now, LocalDate(now, zone), zone);
    }
}

public sealed record OwnerDay(DateTimeOffset Now, DateOnly Date, string TimeZoneId);
public sealed record PageResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);
