using System.Net.Http.Json;
using System.Text.Json;
using Xunit;
using static Lifemaxing.Api.Tests.DailyWorkspaceTests;

namespace Lifemaxing.Api.Tests;

[Collection(DatabaseCollection.Name)]
public sealed class FocusReferenceTests(TestDatabaseFixture database)
{
    [Fact]
    public async Task SessionsReferenceExistingOwnedEntitiesWithoutCompletingThem()
    {
        await using var app = database.CreateApplication();
        var owner = await database.CreateOwnerAsync(app, "focus-links");
        var other = await database.CreateOwnerAsync(app, "focus-foreign");
        using var client = app.CreateClient(); using var foreign = app.CreateClient();
        await Login(client, owner.Email, owner.Password); await Login(foreign, other.Email, other.Password);
        var goal = await Send(client, HttpMethod.Post, "/goals", new { title = "Goal" }, 201);
        var habit = await Send(client, HttpMethod.Post, "/habits", new { title = "Habit" }, 201);
        var task = await Send(client, HttpMethod.Post, "/tasks", new { title = "Task" }, 201);
        var foreignGoal = await Send(foreign, HttpMethod.Post, "/goals", new { title = "Private" }, 201);
        await Send(client, HttpMethod.Post, "/focus-sessions", new { goalId = foreignGoal.GetProperty("id").GetGuid() }, 404);
        await Send(client, HttpMethod.Post, "/focus-sessions", new { goalId = goal.GetProperty("id").GetGuid(), habitId = habit.GetProperty("id").GetGuid() }, 400);
        foreach (var item in new[] { ("goalId", goal), ("habitId", habit), ("taskId", task) })
        {
            var id = item.Item2.GetProperty("id").GetGuid();
            var session = await Send(client, HttpMethod.Post, "/focus-sessions", new Dictionary<string, Guid> { [item.Item1] = id }, 201);
            Assert.Equal(id, session.GetProperty(item.Item1).GetGuid());
            var sessionId = session.GetProperty("id").GetGuid();
            await Send(client, HttpMethod.Post, $"/focus-sessions/{sessionId}/pause", new { });
            await Send(client, HttpMethod.Post, $"/focus-sessions/{sessionId}/resume", new { });
            await Send(client, HttpMethod.Post, $"/focus-sessions/{sessionId}/stop", new { outcome = "Completed" });
        }
        Assert.Equal(1, (await Get(client, "/tasks")).GetProperty("total").GetInt32());
        Assert.Equal(0, (await Get(client, "/progress")).GetProperty("progress").GetProperty("totalXp").GetInt64());
        Assert.False((await Get(client, $"/tasks/{task.GetProperty("id").GetGuid()}")).GetProperty("isCompleted").GetBoolean());
    }
}
