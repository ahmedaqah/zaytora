using Microsoft.EntityFrameworkCore;
using Numinds.Api.Data;

namespace Numinds.Api.Services;

// Safety net for card payments: every minute, looks at recent orders that started a Netloopers checkout
// but are still pending and asks Netloopers whether the payment was completed. It covers a customer who
// pays and closes the tab before returning to the site, and the period while the gateway's webhooks are
// unavailable. Approval goes through the same ICardPaymentConfirmer as the webhook.
public class CardPaymentReconciler(
    IServiceScopeFactory scopeFactory,
    ILogger<CardPaymentReconciler> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan Lookback = TimeSpan.FromHours(48);
    // Stays well under the gateway's 120 requests/minute limit.
    private const int MaxPerRun = 40;

    // When each order was last asked about, so the checks rotate fairly between orders (an old paid order cannot be
    // pushed out by a flood of newer pending ones) and older orders are asked about less and less often.
    private readonly Dictionary<Guid, DateTime> _lastChecked = [];

    // How long to wait before asking about an order again, by its age: new orders every run, old ones rarely.
    private static TimeSpan RecheckEvery(TimeSpan age) =>
        age < TimeSpan.FromMinutes(30) ? TimeSpan.Zero
        : age < TimeSpan.FromHours(6) ? TimeSpan.FromMinutes(5)
        : TimeSpan.FromMinutes(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let the app finish starting (and migrations run) first.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); } catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Card payment reconciliation run failed.");
            }

            try { await Task.Delay(Interval, stoppingToken); } catch (OperationCanceledException) { return; }
        }
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var since = now - Lookback;

        List<(Guid Id, string PaymentId, DateTime CreatedAt)> candidates;
        using (var listScope = scopeFactory.CreateScope())
        {
            var db = listScope.ServiceProvider.GetRequiredService<NumindsDbContext>();
            candidates = (await db.Orders.AsNoTracking()
                    .Where(o => o.PaymentStatus == "pending" && o.GatewayPaymentId != null && o.CreatedAt > since)
                    .OrderByDescending(o => o.CreatedAt)
                    .Select(o => new { o.Id, o.GatewayPaymentId, o.CreatedAt })
                    .Take(1000)
                    .ToListAsync(ct))
                .Select(o => (o.Id, o.GatewayPaymentId!, o.CreatedAt))
                .ToList();
        }

        // Forget orders that are no longer candidates (paid, rejected or past the lookback).
        var live = candidates.Select(c => c.Id).ToHashSet();
        foreach (var gone in _lastChecked.Keys.Where(k => !live.Contains(k)).ToList())
        {
            _lastChecked.Remove(gone);
        }

        // Due orders first, the ones asked about longest ago before the rest.
        var due = candidates
            .Where(c => !_lastChecked.TryGetValue(c.Id, out var last) || now - last >= RecheckEvery(now - c.CreatedAt))
            .OrderBy(c => _lastChecked.TryGetValue(c.Id, out var last) ? last : DateTime.MinValue)
            .Take(MaxPerRun)
            .ToList();

        foreach (var c in due)
        {
            _lastChecked[c.Id] = now;

            try
            {
                // A fresh scope (and DbContext) per payment, so a failure while saving one order cannot leave
                // half-applied changes behind for the next one.
                using var scope = scopeFactory.CreateScope();
                var gateway = scope.ServiceProvider.GetRequiredService<INetloopersGateway>();
                var confirmer = scope.ServiceProvider.GetRequiredService<ICardPaymentConfirmer>();

                var payment = await gateway.GetPaymentAsync(c.PaymentId, ct);
                if (!string.Equals(payment.OrderId, c.Id.ToString(), StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                // Pending and known failures need nothing; success is approved, and an unrecognised status goes to
                // the confirmer too, which tells the admin once.
                if (gateway.IsPendingStatus(payment.Status) || gateway.IsFailureStatus(payment.Status))
                {
                    continue;
                }

                await confirmer.ConfirmAsync(payment, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                // One bad order must not stop the others from being checked.
                logger.LogWarning(ex, "Could not check Netloopers payment {PaymentId} for order {OrderId}.", c.PaymentId, c.Id);
            }
        }
    }
}
