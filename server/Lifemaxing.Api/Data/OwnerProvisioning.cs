using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Data;

public static class OwnerProvisioning
{
    private static readonly (string Key, string DisplayName)[] DefaultAreas =
    [
        ("fitness", "Health & Fitness"),
        ("university", "University"),
        ("career", "Work & Career"),
        ("finance", "Finance"),
        ("home", "Home & Plants"),
        ("style", "Style"),
        ("food", "Food & Cooking"),
        ("creative", "Creative"),
        ("travel", "Travel"),
        ("personal", "Personal")
    ];

    public static async Task<int> RunAsync(IServiceProvider services, IConfiguration configuration)
    {
        var email = configuration["OwnerProvisioning:Email"];
        var password = configuration["OwnerProvisioning:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            Console.Error.WriteLine("Owner provisioning requires OwnerProvisioning:Email and OwnerProvisioning:Password in a secret store.");
            return 1;
        }

        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        if (await users.Users.AnyAsync())
        {
            Console.Error.WriteLine("Owner provisioning stopped because an account already exists.");
            return 1;
        }

        await using var transaction = await db.Database.BeginTransactionAsync();
        var owner = new AppUser { Id = Guid.NewGuid(), UserName = email.Trim(), Email = email.Trim(), EmailConfirmed = true };
        var result = await users.CreateAsync(owner, password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                Console.Error.WriteLine($"{error.Code}: {error.Description}");
            }
            return 1;
        }

        db.UserSettings.Add(new UserSettings
        {
            UserId = owner.Id,
            TimeZoneId = "Europe/Oslo",
            Locale = "nb-NO",
            CreatedAtUtc = DateTimeOffset.UtcNow
        });
        db.LifeAreas.AddRange(DefaultAreas.Select((area, index) => new LifeArea
        {
            Id = Guid.NewGuid(),
            UserId = owner.Id,
            Key = area.Key,
            DisplayName = area.DisplayName,
            IsActive = true,
            SortOrder = index
        }));
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        Console.WriteLine("Owner account, settings and ten Life Areas were created.");
        return 0;
    }
}
