using System.Security.Claims;
using System.Text.RegularExpressions;
using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Search;

public static class SearchEndpoints
{
    private const int CandidateLimit = 80;
    private const int ResultLimit = 20;
    private const string WordBoundary = @"[ \-_/.,:;()]";

    public static void MapSearchEndpoints(this WebApplication app)
    {
        app.MapGet("/api/v1/search", async (string? q, Guid? areaId, ClaimsPrincipal principal,
            AppDbContext db, HttpContext context, CancellationToken cancellationToken) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            if (q?.Length > 100)
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["q"] = ["Use 100 characters or fewer."] });
            var query = (q ?? "").Trim().ToLowerInvariant();
            var userId = principal.GetUserId();
            var candidates = new List<Candidate>();
            // Project only searchable metadata. Every source is owner scoped before either bounded read.
            await AddCandidates(db.Tasks.AsNoTracking().Where(item => item.UserId == userId && item.DeletedAtUtc == null)
                .Select(item => new Candidate { Id = item.Id, Kind = "task", Title = item.Title, LifeAreaId = item.LifeAreaId,
                    IsActive = !item.Completions.Any(completion => completion.UserId == userId && completion.ReversedAtUtc == null),
                    Importance = item.Priority == "High" ? 1 : 0, RecentAtUtc = item.UpdatedAtUtc }), query, areaId, candidates, cancellationToken);
            await AddCandidates(db.Goals.AsNoTracking().Where(item => item.UserId == userId && item.ArchivedAtUtc == null)
                .Select(item => new Candidate { Id = item.Id, Kind = "goal", Title = item.Title, LifeAreaId = item.LifeAreaId,
                    IsActive = item.State == "Active", Importance = 0, RecentAtUtc = item.CreatedAtUtc }), query, areaId, candidates, cancellationToken);
            await AddCandidates(db.Habits.AsNoTracking().Where(item => item.UserId == userId && item.ArchivedAtUtc == null)
                .Select(item => new Candidate { Id = item.Id, Kind = "habit", Title = item.Title, LifeAreaId = item.LifeAreaId,
                    IsActive = item.IsActive, Importance = 0, RecentAtUtc = item.CreatedAtUtc }), query, areaId, candidates, cancellationToken);
            await AddCandidates(db.LifeAreas.AsNoTracking().Where(item => item.UserId == userId)
                .Select(item => new Candidate { Id = item.Id, Kind = "area", Title = item.DisplayName, LifeAreaId = item.Id, AreaKey = item.Key,
                    IsActive = item.IsActive, Importance = 0, RecentAtUtc = DateTimeOffset.MinValue }), query, areaId, candidates, cancellationToken);

            var items = candidates.DistinctBy(item => (item.Kind, item.Id))
                .Select(item => new { Item = item, Match = MatchRank(item.Title, query) })
                .Where(value => value.Match < 5)
                .OrderBy(value => value.Match)
                .ThenByDescending(value => areaId.HasValue && value.Item.LifeAreaId == areaId)
                .ThenByDescending(value => value.Item.IsActive)
                .ThenByDescending(value => value.Item.Importance)
                .ThenByDescending(value => value.Item.RecentAtUtc)
                .ThenBy(value => value.Item.Title, StringComparer.OrdinalIgnoreCase)
                .ThenBy(value => value.Item.Id)
                .Take(ResultLimit)
                .Select(value => new SearchItem(value.Item.Id, value.Item.Kind, value.Item.Title,
                    value.Item.Kind == "area" ? $"/areas/{Uri.EscapeDataString(value.Item.AreaKey!)}" : $"/{value.Item.Kind}s/{value.Item.Id}",
                    value.Item.LifeAreaId, value.Item.IsActive)).ToArray();
            return Results.Ok(new { items });
        }).RequireAuthorization();
    }

    private static async Task AddCandidates(IQueryable<Candidate> source, string query, Guid? areaId,
        List<Candidate> destination, CancellationToken cancellationToken)
    {
        var matches = query.Length == 0 ? source : source.Where(item => item.Title.ToLower().Contains(query));
        var wordPattern = WordBoundary + Regex.Escape(query);
        // Rank in SQL before Take: an older exact title must survive a large recent collection.
        // Npgsql translates Regex.IsMatch to PostgreSQL's regex operator. Use the same
        // boundary expression below so the bounded candidate window cannot drop word matches.
        var direct = await matches
            .OrderBy(item => query == "" || item.Title.ToLower() == query ? 0 : item.Title.ToLower().StartsWith(query) ? 1 : Regex.IsMatch(item.Title.ToLower(), wordPattern) ? 2 : 3)
            .ThenByDescending(item => areaId.HasValue && item.LifeAreaId == areaId)
            .ThenByDescending(item => item.IsActive).ThenByDescending(item => item.Importance)
            .ThenByDescending(item => item.RecentAtUtc).ThenBy(item => item.Id)
            .Take(query.Length == 0 ? ResultLimit : CandidateLimit).ToListAsync(cancellationToken);
        destination.AddRange(direct);
        // Typo tolerance is deliberately modest: a bounded recent/contextual window, never the full account.
        if (query.Length >= 3 && direct.Count < ResultLimit)
            destination.AddRange(await source.Where(item => !item.Title.ToLower().Contains(query))
                .OrderByDescending(item => areaId.HasValue && item.LifeAreaId == areaId)
                .ThenByDescending(item => item.IsActive).ThenByDescending(item => item.RecentAtUtc)
                .ThenBy(item => item.Id).Take(CandidateLimit).ToListAsync(cancellationToken));
    }

    private static int MatchRank(string title, string query)
    {
        var normalized = title.ToLowerInvariant();
        if (query.Length == 0 || normalized == query) return 0;
        if (normalized.StartsWith(query, StringComparison.Ordinal)) return 1;
        if (Regex.IsMatch(normalized, WordBoundary + Regex.Escape(query))) return 2;
        if (normalized.Contains(query, StringComparison.Ordinal)) return 3;
        var words = Regex.Split(normalized, WordBoundary);
        if (query.Length >= 3 && words.Any(word => TypoDistance(word, query) <= (query.Length < 6 ? 1 : 2))) return 4;
        return 5;
    }

    private static int TypoDistance(string left, string right)
    {
        if (Math.Abs(left.Length - right.Length) > 2) return 3;
        var distance = new int[left.Length + 1, right.Length + 1];
        for (var i = 0; i <= left.Length; i++) distance[i, 0] = i;
        for (var j = 0; j <= right.Length; j++) distance[0, j] = j;
        for (var i = 1; i <= left.Length; i++)
            for (var j = 1; j <= right.Length; j++)
            {
                distance[i, j] = Math.Min(Math.Min(distance[i - 1, j] + 1, distance[i, j - 1] + 1),
                    distance[i - 1, j - 1] + (left[i - 1] == right[j - 1] ? 0 : 1));
                if (i > 1 && j > 1 && left[i - 1] == right[j - 2] && left[i - 2] == right[j - 1])
                    distance[i, j] = Math.Min(distance[i, j], distance[i - 2, j - 2] + 1);
            }
        return distance[left.Length, right.Length];
    }

    private sealed class Candidate
    {
        public Guid Id { get; init; }
        public string Kind { get; init; } = "";
        public string Title { get; init; } = "";
        public Guid? LifeAreaId { get; init; }
        public string? AreaKey { get; init; }
        public bool IsActive { get; init; }
        public int Importance { get; init; }
        public DateTimeOffset RecentAtUtc { get; init; }
    }
    public sealed record SearchItem(Guid Id, string Kind, string Title, string Path, Guid? LifeAreaId, bool IsActive);
}
