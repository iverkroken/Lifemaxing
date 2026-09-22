using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<LifeArea> LifeAreas => Set<LifeArea>();
    public DbSet<Features.Tasks.TaskItem> Tasks => Set<Features.Tasks.TaskItem>();
    public DbSet<Features.Tasks.TaskCompletion> TaskCompletions => Set<Features.Tasks.TaskCompletion>();
    public DbSet<Features.Today.DailyCommitment> DailyCommitments => Set<Features.Today.DailyCommitment>();
    public DbSet<Features.Today.DailyMission> DailyMissions => Set<Features.Today.DailyMission>();
    public DbSet<Features.Today.DailyGoalSelection> DailyGoalSelections => Set<Features.Today.DailyGoalSelection>();
    public DbSet<Features.Habits.Habit> Habits => Set<Features.Habits.Habit>();
    public DbSet<Features.Habits.HabitSchedulePeriod> HabitSchedulePeriods => Set<Features.Habits.HabitSchedulePeriod>();
    public DbSet<Features.Habits.HabitLog> HabitLogs => Set<Features.Habits.HabitLog>();
    public DbSet<Features.Goals.Goal> Goals => Set<Features.Goals.Goal>();
    public DbSet<Features.Goals.GoalProgressEntry> GoalProgressEntries => Set<Features.Goals.GoalProgressEntry>();

    public DbSet<Features.Progression.XpEntry> XpEntries => Set<Features.Progression.XpEntry>();
    public DbSet<Features.Progression.ActivityEvent> ActivityEvents => Set<Features.Progression.ActivityEvent>();
    public DbSet<Features.Progression.CommandReceipt> CommandReceipts => Set<Features.Progression.CommandReceipt>();
    public DbSet<Features.Progression.Reward> Rewards => Set<Features.Progression.Reward>();
    public DbSet<Features.Progression.RewardClaim> RewardClaims => Set<Features.Progression.RewardClaim>();
    public DbSet<Features.Progression.FocusSession> FocusSessions => Set<Features.Progression.FocusSession>();

    private void CheckAppendOnlyHistory()
    {
        foreach (var entry in ChangeTracker.Entries())
            if (entry.Entity is Features.Progression.XpEntry or Features.Progression.ActivityEvent or Features.Progression.CommandReceipt
                && entry.State is EntityState.Modified or EntityState.Deleted)
                throw new InvalidOperationException("Progression history is append only.");
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        CheckAppendOnlyHistory();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        CheckAppendOnlyHistory();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        ProductivityModel.Configure(builder);
        ProgressionModel.Configure(builder);
        Features.Focus.FocusModel.Configure(builder);
        Features.Finance.SubscriptionModel.Configure(builder);

        builder.Entity<UserSettings>(settings =>
        {
            settings.ToTable("UserSettings");
            settings.HasKey(value => value.UserId);
            settings.Property(value => value.TimeZoneId).HasMaxLength(100).IsRequired();
            settings.Property(value => value.Locale).HasMaxLength(20).IsRequired();
            settings.Property(value => value.UiLanguage).HasMaxLength(2).HasDefaultValue("en").IsRequired();
            settings.Property(value => value.Theme).HasMaxLength(6).HasDefaultValue("system").IsRequired();
            settings.Property(value => value.Density).HasMaxLength(7).HasDefaultValue("normal").IsRequired();
            settings.Property(value => value.PlanningMode).HasMaxLength(20).HasDefaultValue("FocusedDay").IsRequired();
            settings.Property(value => value.CreatedAtUtc).IsRequired();
            settings.HasOne(value => value.User)
                .WithOne()
                .HasForeignKey<UserSettings>(value => value.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<LifeArea>(area =>
        {
            area.ToTable("LifeAreas", table =>
            {
                table.HasCheckConstraint("CK_LifeArea_ImageFocal", "\"ImageFocalX\" BETWEEN 0 AND 100 AND \"ImageFocalY\" BETWEEN 0 AND 100");
                table.HasCheckConstraint("CK_LifeArea_CustomImage", "(\"CustomImage\" IS NULL AND \"CustomImageContentType\" IS NULL AND \"CustomImageUpdatedAtUtc\" IS NULL) OR (\"CustomImage\" IS NOT NULL AND \"CustomImageContentType\" IS NOT NULL AND \"CustomImageUpdatedAtUtc\" IS NOT NULL)");
            });
            area.HasKey(value => value.Id);
            area.Property(value => value.Key).HasMaxLength(50).IsRequired();
            area.Property(value => value.DisplayName).HasMaxLength(100).IsRequired();
            area.Property(value => value.CustomImageContentType).HasMaxLength(30);
            area.Property(value => value.ImageFocalX).HasPrecision(5, 2).HasDefaultValue(50);
            area.Property(value => value.ImageFocalY).HasPrecision(5, 2).HasDefaultValue(50);
            area.HasQueryFilter(value => value.DeletedAtUtc == null);
            area.HasIndex(value => new { value.UserId, value.Key }).IsUnique();
            area.HasIndex(value => new { value.UserId, value.SortOrder });
            area.HasIndex(value => new { value.UserId, value.DeletedAtUtc });
            area.HasOne(value => value.User)
                .WithMany()
                .HasForeignKey(value => value.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
