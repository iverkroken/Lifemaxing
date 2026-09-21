using Lifemaxing.Api.Features.Progression;
using Lifemaxing.Api.Features.Tasks;
using Lifemaxing.Api.Features.Habits;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Data;

public static class ProgressionModel
{
    public static void Configure(ModelBuilder model)
    {
        var xp = model.Entity<XpEntry>();
        xp.HasIndex(x => new { x.UserId, x.Kind, x.SourceKind, x.SourceId }).IsUnique();
        xp.HasIndex(x => new { x.UserId, x.LocalDate, x.Category });
        xp.HasIndex(x => new { x.UserId, x.OccurredAtUtc });
        xp.HasOne<XpEntry>().WithMany().HasForeignKey(x => x.RelatedEntryId).OnDelete(DeleteBehavior.Restrict);
        xp.HasOne<LifeArea>().WithMany().HasForeignKey(x => x.LifeAreaId).OnDelete(DeleteBehavior.Restrict);
        xp.Property(x => x.TimeZoneId).HasMaxLength(100);
        xp.Property(x => x.Kind).HasMaxLength(20); xp.Property(x => x.SourceKind).HasMaxLength(40); xp.Property(x => x.Category).HasMaxLength(30);
        xp.ToTable("XpEntries", t => t.HasCheckConstraint("CK_Xp_Sign", "(\"Kind\" = 'Award' AND \"AmountSigned\" >= 0 AND \"RelatedEntryId\" IS NULL) OR (\"Kind\" = 'Reversal' AND \"AmountSigned\" <= 0 AND \"RelatedEntryId\" IS NOT NULL)"));
        var activity = model.Entity<ActivityEvent>();
        activity.HasIndex(x => new { x.UserId, x.OccurredAtUtc });
        activity.HasIndex(x => new { x.UserId, x.Kind, x.SourceEventId }).IsUnique().HasFilter("\"SourceEventId\" IS NOT NULL");
        activity.Property(x => x.Kind).HasMaxLength(40); activity.Property(x => x.SubjectKind).HasMaxLength(40); activity.Property(x => x.Summary).HasMaxLength(1000);
        var receipt = model.Entity<CommandReceipt>();
        receipt.HasIndex(x => new { x.UserId, x.ClientActionId }).IsUnique();
        receipt.Property(x => x.Operation).HasMaxLength(250); receipt.Property(x => x.RequestHash).HasMaxLength(64); receipt.Property(x => x.ResponseJson).HasColumnType("jsonb");
        var reward = model.Entity<Reward>();
        reward.Property(x => x.Title).HasMaxLength(200); reward.HasIndex(x => new { x.UserId, x.RequiredLevel });
        reward.ToTable("Rewards", t => t.HasCheckConstraint("CK_Reward_Level", "\"RequiredLevel\" BETWEEN 1 AND 100000"));
        var claim = model.Entity<RewardClaim>();
        claim.HasIndex(x => new { x.UserId, x.RewardId }).IsUnique();
        claim.HasIndex(x => new { x.UserId, x.ClaimedAtUtc });
        claim.HasOne<Reward>().WithMany().HasForeignKey(x => x.RewardId).OnDelete(DeleteBehavior.Restrict);
        var focus = model.Entity<FocusSession>();
        focus.HasIndex(x => x.UserId).IsUnique().HasFilter("\"EndedAtUtc\" IS NULL");
        focus.HasIndex(x => new { x.UserId, x.StartedAtUtc });
        focus.Property(x => x.Status).HasMaxLength(20);
        focus.HasOne<TaskItem>().WithMany().HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Restrict);
        focus.HasOne<Features.Goals.Goal>().WithMany().HasForeignKey(x => x.GoalId).OnDelete(DeleteBehavior.Restrict);
        focus.HasOne<Habit>().WithMany().HasForeignKey(x => x.HabitId).OnDelete(DeleteBehavior.Restrict);
        focus.ToTable("FocusSessions", t => t.HasCheckConstraint("CK_Focus_Reference", "num_nonnulls(\"TaskId\", \"GoalId\", \"HabitId\") <= 1"));
        focus.ToTable("FocusSessions", t => t.HasCheckConstraint("CK_Focus_State", "\"AccumulatedSeconds\" >= 0 AND (\"EndedAtUtc\" IS NULL OR \"EndedAtUtc\" >= \"StartedAtUtc\") AND ((\"Status\" = 'Running' AND \"RunningSinceUtc\" IS NOT NULL AND \"EndedAtUtc\" IS NULL) OR (\"Status\" = 'Paused' AND \"RunningSinceUtc\" IS NULL AND \"EndedAtUtc\" IS NULL) OR (\"Status\" IN ('Completed', 'Stopped', 'Cancelled') AND \"RunningSinceUtc\" IS NULL AND \"EndedAtUtc\" IS NOT NULL))"));
        foreach (var type in new[] { typeof(XpEntry), typeof(ActivityEvent), typeof(CommandReceipt), typeof(Reward), typeof(RewardClaim), typeof(FocusSession) })
            model.Entity(type).HasOne(typeof(AppUser)).WithMany().HasForeignKey("UserId").OnDelete(DeleteBehavior.Restrict);
        model.Entity<Habit>().Property(x => x.XpPerLog).HasDefaultValue(10);
        model.Entity<Habit>().ToTable("Habits", t => t.HasCheckConstraint("CK_Habit_Xp", "\"XpPerLog\" BETWEEN 1 AND 75"));
    }
}
