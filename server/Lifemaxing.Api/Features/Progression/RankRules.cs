namespace Lifemaxing.Api.Features.Progression;

public sealed record RankDivision(string Name, int MinimumLevel, int? MaximumLevel);
public sealed record RankDefinition(string Name, int Order, string Image, string ColorToken, int MinimumLevel,
    int? MaximumLevel, IReadOnlyList<RankDivision> Divisions);
public sealed record RankInfo(string Name, string Division, string Label, string Image, string ColorToken,
    int Order, int MinimumLevel, int? MaximumLevel, string? NextLabel, int? NextLevel, bool NextIsRank,
    decimal XpIntoDivision, decimal? XpForNextDivision, decimal DivisionPercentage, int RuleVersion = 2);

public static class RankRules
{
    // Spare levels go to earlier divisions. Challenger uses a ten-level entry range,
    // then retains division I indefinitely. UI consumers receive this same catalog.
    public static IReadOnlyList<RankDefinition> Catalog { get; } = Array.AsReadOnly(new[] {
        Define("Iron", 0, 1, 9), Define("Bronze", 1, 10, 19), Define("Silver", 2, 20, 29),
        Define("Gold", 3, 30, 39), Define("Platinum", 4, 40, 49), Define("Emerald", 5, 50, 59),
        Define("Diamond", 6, 60, 69), Define("Master", 7, 70, 79), Define("Grandmaster", 8, 80, 89),
        Define("Challenger", 9, 90, null)
    });

    private static RankDefinition Define(string name, int order, int min, int? max)
    {
        var length = (max ?? min + 9) - min + 1;
        var start = min;
        var divisions = new List<RankDivision>();
        foreach (var (label, index) in new[] { "IV", "III", "II", "I" }.Select((label, index) => (label, index)))
        {
            var size = length / 4 + (index < length % 4 ? 1 : 0);
            divisions.Add(new RankDivision(label, start, max == null && index == 3 ? null : start + size - 1));
            start += size;
        }
        return new(name, order, $"/images/ranks/{name}.png", $"--color-rank-{name.ToLowerInvariant()}", min, max, divisions.AsReadOnly());
    }

    public static RankInfo ForLevel(int? input, long? totalXp = null)
    {
        var level = Math.Max(1, input ?? 1);
        var rank = Catalog.Last(x => level >= x.MinimumLevel);
        var division = rank.Divisions.Last(x => level >= x.MinimumLevel);
        var nextLevel = division.MaximumLevel + 1;
        var nextRank = nextLevel.HasValue ? Catalog.Last(x => nextLevel >= x.MinimumLevel) : null;
        var nextDivision = nextRank?.Divisions.Last(x => nextLevel >= x.MinimumLevel);
        var startXp = ProgressionRules.Threshold(division.MinimumLevel);
        var xp = Math.Max(0m, totalXp.HasValue ? totalXp.Value : ProgressionRules.Threshold(level));
        var required = nextLevel.HasValue ? ProgressionRules.Threshold(nextLevel.Value) - startXp : (decimal?)null;
        var earned = Math.Max(0m, xp - startXp);
        var percent = required.HasValue ? decimal.Round(Math.Clamp(earned / required.Value * 100m, 0m, 100m), 2) : 100m;
        return new(rank.Name, division.Name, $"{rank.Name} {division.Name}", rank.Image, rank.ColorToken, rank.Order,
            division.MinimumLevel, division.MaximumLevel, nextRank == null ? null : $"{nextRank.Name} {nextDivision!.Name}",
            nextLevel, nextRank != null && nextRank.Order != rank.Order, earned, required, percent);
    }
}
