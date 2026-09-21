using Lifemaxing.Api.Features.Tasks;
using Lifemaxing.Api.Features.Today;
using Lifemaxing.Api.Features.Habits;
using Lifemaxing.Api.Features.Goals;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Data;

public static class ProductivityModel
{
    public static void Configure(ModelBuilder model)
    {
        var task = model.Entity<TaskItem>();
        task.ToTable("Tasks", table => table.HasCheckConstraint("CK_Task_Estimate", "\"EstimateMinutes\" IS NULL OR \"EstimateMinutes\" BETWEEN 1 AND 10080"));
        task.Property(x => x.Title).HasMaxLength(200);
        task.Property(x => x.Details).HasMaxLength(10000);
        task.Property(x => x.Tier).HasMaxLength(20);
        task.Property(x => x.Priority).HasMaxLength(20);
        task.HasIndex(x => new { x.UserId, x.PlannedDate, x.DeletedAtUtc });
        task.HasIndex(x => new { x.UserId, x.DueDate });
        task.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        task.HasOne<LifeArea>().WithMany().HasForeignKey(x => x.LifeAreaId).OnDelete(DeleteBehavior.Restrict);
        task.HasOne<Goal>().WithMany().HasForeignKey(x => x.GoalId).OnDelete(DeleteBehavior.Restrict);
        task.HasMany(x => x.Completions).WithOne().HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Restrict);

        var completion = model.Entity<TaskCompletion>();
        completion.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        completion.HasIndex(x => x.TaskId).IsUnique().HasFilter("\"ReversedAtUtc\" IS NULL");
        completion.HasIndex(x => new { x.UserId, x.CompletedAtUtc });

        var commitment = model.Entity<DailyCommitment>();
        commitment.Property(x => x.TimeZoneId).HasMaxLength(100);
        commitment.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        commitment.HasOne<TaskItem>().WithMany().HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Restrict);
        commitment.HasIndex(x => new { x.UserId, x.TaskId, x.LocalDate }).IsUnique();
        commitment.HasIndex(x => new { x.UserId, x.LocalDate });

        var mission = model.Entity<DailyMission>();
        var selectedGoal = model.Entity<DailyGoalSelection>();
        selectedGoal.Property(x => x.TimeZoneId).HasMaxLength(100);
        selectedGoal.HasIndex(x => new { x.UserId, x.LocalDate, x.GoalId }).IsUnique();
        selectedGoal.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        selectedGoal.HasOne<Goal>().WithMany().HasForeignKey(x => x.GoalId).OnDelete(DeleteBehavior.Restrict);
        mission.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        mission.HasOne<TaskItem>().WithMany().HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Restrict);
        mission.HasIndex(x => new { x.UserId, x.LocalDate }).IsUnique();

        var habit = model.Entity<Habit>();
        habit.Property(x => x.Title).HasMaxLength(200);
        habit.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        habit.HasOne<LifeArea>().WithMany().HasForeignKey(x => x.LifeAreaId).OnDelete(DeleteBehavior.Restrict);
        habit.HasIndex(x => new { x.UserId, x.ArchivedAtUtc });
        habit.HasMany(x => x.Schedules).WithOne().HasForeignKey(x => x.HabitId).OnDelete(DeleteBehavior.Restrict);

        var schedule = model.Entity<HabitSchedulePeriod>();
        schedule.Property(x => x.TimeZoneId).HasMaxLength(100);
        schedule.Property(x => x.Pattern).HasMaxLength(30);
        schedule.HasIndex(x => new { x.HabitId, x.EffectiveFromDate }).IsUnique();
        schedule.ToTable("HabitSchedulePeriods", table =>
        {
            table.HasCheckConstraint("CK_Schedule_Period", "\"EffectiveToDate\" IS NULL OR \"EffectiveToDate\" > \"EffectiveFromDate\"");
            table.HasCheckConstraint("CK_Schedule_Pattern", "(\"Pattern\" = 'Daily' AND \"DaysOfWeek\" IS NULL AND \"WeeklyTarget\" IS NULL) OR (\"Pattern\" = 'SelectedWeekdays' AND cardinality(\"DaysOfWeek\") BETWEEN 1 AND 7 AND \"DaysOfWeek\" <@ ARRAY[1,2,3,4,5,6,7] AND \"WeeklyTarget\" IS NULL) OR (\"Pattern\" = 'WeeklyCount' AND \"WeeklyTarget\" BETWEEN 1 AND 7 AND \"DaysOfWeek\" IS NULL)");
        });

        var log = model.Entity<HabitLog>();
        log.Property(x => x.TimeZoneId).HasMaxLength(100);
        log.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        log.HasOne<Habit>().WithMany().HasForeignKey(x => x.HabitId).OnDelete(DeleteBehavior.Restrict);
        log.HasIndex(x => new { x.HabitId, x.LocalDate }).IsUnique().HasFilter("\"ReversedAtUtc\" IS NULL");
        log.HasIndex(x => new { x.UserId, x.LocalDate });

        var goal = model.Entity<Goal>();
        goal.Property(x => x.Title).HasMaxLength(200);
        goal.Property(x => x.Description).HasMaxLength(10000);
        goal.Property(x => x.State).HasMaxLength(20);
        goal.Property(x => x.Direction).HasMaxLength(20);
        goal.Property(x => x.Unit).HasMaxLength(50);
        goal.Property(x => x.TargetValue).HasPrecision(18, 4);
        goal.Property(x => x.BaselineValue).HasPrecision(18, 4);
        goal.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        goal.HasOne<LifeArea>().WithMany().HasForeignKey(x => x.LifeAreaId).OnDelete(DeleteBehavior.Restrict);
        goal.HasIndex(x => new { x.UserId, x.ArchivedAtUtc });

        var progress = model.Entity<GoalProgressEntry>();
        progress.Property(x => x.Value).HasPrecision(18, 4);
        progress.Property(x => x.Note).HasMaxLength(5000);
        progress.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        progress.HasOne<Goal>().WithMany().HasForeignKey(x => x.GoalId).OnDelete(DeleteBehavior.Restrict);
        progress.HasIndex(x => new { x.UserId, x.GoalId, x.RecordedAtUtc });
    }
}
