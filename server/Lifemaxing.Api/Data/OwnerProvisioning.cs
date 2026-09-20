using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Lifemaxing.Api.Data;

public static class OwnerProvisioning
{
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

        WorkspaceInitialization.Add(db, owner.Id, "Europe/Oslo", "nb-NO");
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        Console.WriteLine("Owner account, settings and ten Life Areas were created.");
        return 0;
    }
}
