using Lifemaxing.Api.Common;
using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Progression;

public sealed record LevelProgress(long TotalXp, int Level, string Rank, long XpIntoLevel, long XpForNextLevel, decimal Percentage, int RuleVersion = 1);

public static class ProgressionRules
{
    public static int TaskXp(string tier) => tier switch { "Tiny" => 10, "Small" => 25, "Medium" => 50, "Large" => 100, "Epic" => 200, _ => throw new ArgumentOutOfRangeException(nameof(tier)) };
    public static decimal Threshold(int level) => 500m * (level - 1) + 50m * (level - 1) * (level - 2);
    public static LevelProgress Calculate(long total)
    {
        var basis = Math.Max(0, total);
        // Binary search avoids loops proportional to lifetime XP and floating-point boundaries.
        var low = 1; var high = int.MaxValue;
        while (low < high)
        {
            var mid = low + (int)(((long)high - low + 1) / 2);
            if (Threshold(mid) <= basis) low = mid; else high = mid - 1;
        }
        var earned = basis - (long)Threshold(low);
        var needed = 500L + 100L * (low - 1);
        return new(total, low, Rank(low), earned, needed, decimal.Round(100m * earned / needed, 2));
    }
    public static string Rank(int level) => level switch { < 10 => "Bronze", < 20 => "Silver", < 30 => "Gold", < 40 => "Platinum", < 50 => "Diamond", _ => "Apex" };
    public static Task<long> Total(AppDbContext db, Guid owner, CancellationToken ct) => db.XpEntries.Where(x => x.UserId == owner).SumAsync(x => (long)x.AmountSigned, ct);

    public static void Record(AppDbContext db, Guid owner, string kind, string subjectKind, Guid subjectId,
        Guid? area, DateTimeOffset now, string summary, Guid? source = null) => db.ActivityEvents.Add(new ActivityEvent
        { Id = Guid.NewGuid(), UserId = owner, Kind = kind, SubjectKind = subjectKind, SubjectId = subjectId,
          LifeAreaId = area, OccurredAtUtc = now, Summary = summary, SourceEventId = source });

    public static async Task<int> Award(AppDbContext db, Guid owner, string sourceKind, Guid sourceId,
        Guid? area, string category, int requested, OwnerDay day, CancellationToken ct)
    {
        var cap = category == "SmallTasks" ? 50 : category == "Habits" ? 75 : int.MaxValue;
        var used = await db.XpEntries.Where(x => x.UserId == owner && x.LocalDate == day.Date && x.Category == category).SumAsync(x => (long)x.AmountSigned, ct);
        var amount = (int)Math.Min(requested, Math.Max(0L, cap - used));
        var before = await Total(db, owner, ct);
        var entry = new XpEntry { Id = Guid.NewGuid(), UserId = owner, SourceKind = sourceKind, SourceId = sourceId,
            LifeAreaId = area, AmountSigned = amount, Category = category, LocalDate = day.Date, TimeZoneId = day.TimeZoneId, OccurredAtUtc = day.Now };
        db.XpEntries.Add(entry);
        // Completion is the meaningful activity; its summary includes the actual capped award.
        var previous = Calculate(before).Level; var next = Calculate(before + amount).Level;
        if (next > previous) Record(db, owner, "LevelReached", "Progress", entry.Id, null, day.Now, $"Reached level {next} · {Rank(next)} (rules v1)", entry.Id);
        return amount;
    }

    public static async Task<int> Reverse(AppDbContext db, Guid owner, string sourceKind, Guid sourceId, DateTimeOffset now, CancellationToken ct)
    {
        var original = await db.XpEntries.SingleOrDefaultAsync(x => x.UserId == owner && x.SourceKind == sourceKind && x.SourceId == sourceId && x.Kind == "Award", ct);
        // Phase 2 completions predate XP; they have nothing to reverse.
        if (original is null) return 0;
        db.XpEntries.Add(new XpEntry { Id = Guid.NewGuid(), UserId = owner, Kind = "Reversal", SourceKind = sourceKind,
            SourceId = sourceId, RelatedEntryId = original.Id, AmountSigned = -original.AmountSigned, LifeAreaId = original.LifeAreaId,
            OccurredAtUtc = now, LocalDate = original.LocalDate, TimeZoneId = original.TimeZoneId, Category = original.Category, RuleVersion = original.RuleVersion });
        return -original.AmountSigned;
    }
}
