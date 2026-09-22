using Lifemaxing.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Features.Finance;

public sealed class Subscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public decimal Price { get; set; }
    public string Currency { get; set; } = "EUR";
    public string BillingInterval { get; set; } = "Monthly";
    public DateOnly NextBillingDate { get; set; }
    public DateOnly StartDate { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "Active";
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public static class SubscriptionModel
{
    public static void Configure(ModelBuilder builder)
    {
        builder.Entity<Subscription>(entity =>
        {
            entity.ToTable("Subscriptions", table =>
            {
                table.HasCheckConstraint("CK_Subscriptions_Price", "\"Price\" >= 0 AND \"Price\" <= 999999999.99");
                table.HasCheckConstraint("CK_Subscriptions_Dates", "\"NextBillingDate\" >= \"StartDate\" AND \"StartDate\" >= DATE '1900-01-01' AND \"NextBillingDate\" <= DATE '9998-12-31'");
                table.HasCheckConstraint("CK_Subscriptions_Interval", "\"BillingInterval\" IN ('Weekly', 'Monthly', 'Quarterly', 'Yearly')");
                table.HasCheckConstraint("CK_Subscriptions_Status", "\"Status\" IN ('Active', 'Cancelled')");
            });
            entity.HasKey(value => value.Id);
            entity.Property(value => value.Name).HasMaxLength(200).IsRequired();
            entity.Property(value => value.Category).HasMaxLength(80).IsRequired();
            entity.Property(value => value.Price).HasPrecision(11, 2);
            entity.Property(value => value.Currency).HasMaxLength(3).IsRequired();
            entity.Property(value => value.BillingInterval).HasMaxLength(9).IsRequired();
            entity.Property(value => value.Notes).HasMaxLength(2000);
            entity.Property(value => value.Status).HasMaxLength(9).IsRequired();
            entity.HasIndex(value => new { value.UserId, value.Status, value.NextBillingDate });
            entity.HasOne<AppUser>().WithMany().HasForeignKey(value => value.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
