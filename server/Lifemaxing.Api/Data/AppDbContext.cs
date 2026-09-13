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
    public DbSet<Features.Habits.Habit> Habits => Set<Features.Habits.Habit>();
    public DbSet<Features.Habits.HabitSchedulePeriod> HabitSchedulePeriods => Set<Features.Habits.HabitSchedulePeriod>();
    public DbSet<Features.Habits.HabitLog> HabitLogs => Set<Features.Habits.HabitLog>();
    public DbSet<Features.Goals.Goal> Goals => Set<Features.Goals.Goal>();
    public DbSet<Features.Goals.GoalProgressEntry> GoalProgressEntries => Set<Features.Goals.GoalProgressEntry>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        ProductivityModel.Configure(builder);

        builder.Entity<UserSettings>(settings =>
        {
            settings.ToTable("UserSettings");
            settings.HasKey(value => value.UserId);
            settings.Property(value => value.TimeZoneId).HasMaxLength(100).IsRequired();
            settings.Property(value => value.Locale).HasMaxLength(20).IsRequired();
            settings.Property(value => value.CreatedAtUtc).IsRequired();
            settings.HasOne(value => value.User)
                .WithOne()
                .HasForeignKey<UserSettings>(value => value.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<LifeArea>(area =>
        {
            area.ToTable("LifeAreas");
            area.HasKey(value => value.Id);
            area.Property(value => value.Key).HasMaxLength(50).IsRequired();
            area.Property(value => value.DisplayName).HasMaxLength(100).IsRequired();
            area.HasIndex(value => new { value.UserId, value.Key }).IsUnique();
            area.HasIndex(value => new { value.UserId, value.SortOrder });
            area.HasOne(value => value.User)
                .WithMany()
                .HasForeignKey(value => value.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
