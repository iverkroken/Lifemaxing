namespace Lifemaxing.Api.Features.DeletedContent;

public sealed class DeletedContentCleanupWorker(IServiceScopeFactory scopeFactory, ILogger<DeletedContentCleanupWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Cleanup(stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(stoppingToken)) await Cleanup(stoppingToken);
    }

    private async Task Cleanup(CancellationToken ct)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var removed = await scope.ServiceProvider.GetRequiredService<DeletedContentService>().PurgeExpiredAsync(ct);
            if (removed > 0) logger.LogInformation("Permanently deleted {Count} expired items.", removed);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception exception)
        {
            logger.LogError(exception, "Recently Deleted cleanup failed; it will retry on the next interval.");
        }
    }
}
