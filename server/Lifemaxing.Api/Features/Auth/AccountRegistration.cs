using Lifemaxing.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Lifemaxing.Api.Features.Auth;

public sealed class AccountRegistration(AppDbContext db, UserManager<AppUser> users)
{
    public async Task<IdentityResult> CreateAsync(AppUser user, string? password, UserLoginInfo? login, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var result = password is null ? await users.CreateAsync(user) : await users.CreateAsync(user, password);
            if (!result.Succeeded) return result;
            if (login is not null)
            {
                result = await users.AddLoginAsync(user, login);
                if (!result.Succeeded) return result;
            }
            WorkspaceInitialization.Add(db, user.Id);
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return IdentityResult.Success;
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return IdentityResult.Failed(new IdentityError { Code = "DuplicateEmail", Description = "An account already uses this email." });
        }
    }
}
