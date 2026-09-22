using Lifemaxing.Api.Features.Progression;
using System.Text.Json;
using Xunit;

namespace Lifemaxing.Api.Tests;

public sealed class RankTests
{
    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    [InlineData(-100)]
    public void MissingOrInvalidLevelsStartAtIron(int? level)
    {
        Assert.Equal("Iron IV", RankRules.ForLevel(level).Label);
    }

    [Fact]
    public void CatalogBoundariesImagesAndXpProgressAreConsistent()
    {
        Assert.Equal(10, RankRules.Catalog.Count);
        foreach (var rank in RankRules.Catalog)
        foreach (var division in rank.Divisions)
        {
            var info = RankRules.ForLevel(division.MinimumLevel);
            Assert.Equal($"{rank.Name} {division.Name}", info.Label);
            Assert.Equal($"/images/ranks/{rank.Name}.png", info.Image);
            Assert.Equal(0m, info.XpIntoDivision);
            if (division.MaximumLevel is int end)
            {
                Assert.Equal(info.Label, RankRules.ForLevel(end).Label);
                Assert.Equal(RankRules.ForLevel(end + 1).Label, info.NextLabel);
                Assert.Equal(division.Name == "I", info.NextIsRank);
            }
        }
        var partial = RankRules.ForLevel(1, 300);
        Assert.Equal(300m, partial.XpIntoDivision);
        Assert.Equal(1800m, partial.XpForNextDivision);
        Assert.Equal(16.67m, partial.DivisionPercentage);
        var final = RankRules.ForLevel(int.MaxValue);
        Assert.Equal("Challenger I", final.Label);
        Assert.Null(final.NextLevel);
        Assert.Null(final.XpForNextDivision);
        Assert.False(final.NextIsRank);
        Assert.Equal(100m, final.DivisionPercentage);
    }

    [Theory]
    [InlineData(1, "Iron", "IV", "Iron III")]
    [InlineData(9, "Iron", "I", "Bronze IV")]
    [InlineData(10, "Bronze", "IV", "Bronze III")]
    [InlineData(34, "Gold", "III", "Gold II")]
    [InlineData(64, "Diamond", "III", "Diamond II")]
    [InlineData(89, "Grandmaster", "I", "Challenger IV")]
    [InlineData(90, "Challenger", "IV", "Challenger III")]
    [InlineData(98, "Challenger", "I", null)]
    [InlineData(100000, "Challenger", "I", null)]
    public void RankDivisionAndNextDestinationFollowLevel(int level, string rank, string division, string? next)
    {
        var progress = ProgressionRules.Calculate((long)ProgressionRules.Threshold(level));
        Assert.Equal(rank, progress.Rank);
        var json = JsonSerializer.SerializeToElement(progress, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var info = json.GetProperty("rankInfo");
        Assert.Equal(division, info.GetProperty("division").GetString());
        Assert.Equal($"/images/ranks/{rank}.png", info.GetProperty("image").GetString());
        Assert.Equal(next, info.GetProperty("nextLabel").GetString());
    }
}
