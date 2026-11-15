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

    // Payments already seen failed/cancelled, and orders already flagged to the admin, so neither is
    // re-queried or re-announced every minute (reset on restart, which is fine).
    private readonly HashSet<string> _finished = [];
    private readonly HashSet<Guid> _flagged = [];

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
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NumindsDbContext>();
        var gateway = scope.ServiceProvider.GetRequiredService<INetloopersGateway>();
        var confirmer = scope.ServiceProvider.GetRequiredService<ICardPaymentConfirmer>();

        var since = DateTime.UtcNow - Lookback;
        var candidates = await db.Orders.AsNoTracking()
            .Where(o => o.PaymentStatus == "pending" && o.GatewayPaymentId != null && o.CreatedAt > since)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new { o.Id, o.GatewayPaymentId })
            .Take(MaxPerRun * 3)
            .ToListAsync(ct);

        var checkedCount = 0;
        foreach (var c in candidates)
        {
            if (checkedCount >= MaxPerRun) break;
            var paymentId = c.GatewayPaymentId!;
            if (_finished.Contains(paymentId) || _flagged.Contains(c.Id)) continue;
            checkedCount++;

            try
            {
                var payment = await gateway.GetPaymentAsync(paymentId, ct);
                if (!string.Equals(payment.OrderId, c.Id.ToString(), StringComparison.OrdinalIgnoreCase))
                {
                    _finished.Add(paymentId);
                    continue;
                }

                if (gateway.IsPendingStatus(payment.Status)) continue;

                if (gateway.IsFailureStatus(payment.Status))
                {
                    _finished.Add(paymentId);
                    continue;
                }

                // Success -> approve. An unrecognised status also goes to the confirmer, which alerts the admin
                // once (and keeps being re-checked here, so it is approved as soon as the status list is fixed).
                var result = await confirmer.ConfirmAsync(payment, ct);
                if (result == CardConfirmResult.NotApproved && gateway.IsSuccessStatus(payment.Status))
                {
                    // Paid at the gateway but failed our checks; the confirmer already alerted the admin once.
                    _flagged.Add(c.Id);
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                // One bad order must not stop the others from being checked.
                logger.LogWarning(ex, "Could not check Netloopers payment {PaymentId} for order {OrderId}.", paymentId, c.Id);
            }
        }
    }
}
