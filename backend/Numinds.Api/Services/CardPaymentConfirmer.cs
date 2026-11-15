using Microsoft.EntityFrameworkCore;
using Numinds.Api.Data;
using Numinds.Api.Models.Entities;

namespace Numinds.Api.Services;

public enum CardConfirmResult
{
    // The order was approved by this call.
    Approved,
    // The order was already paid (retry, duplicate delivery, or another path got there first).
    AlreadyPaid,
    // The gateway has not finished the payment yet; ask again later.
    StillPending,
    // The payment is not (or not validly) a paid one; nothing was approved. `NeedsReview` tells whether the admin was alerted.
    NotApproved,
    // The payment does not belong to a known order.
    Ignored,
}

// The single place where a Netloopers payment turns into an approved order. The webhook, the customer's
// return from the checkout page and the background reconciler all call ConfirmAsync with a payment they
// have just fetched from Netloopers, so every path applies the same checks and the same side effects.
public interface ICardPaymentConfirmer
{
    Task<CardConfirmResult> ConfirmAsync(NetloopersPayment payment, CancellationToken cancellationToken);

    // The paid/failed transition (order status, invitation approval, partner credit, Meta Purchase), also
    // used by the admin's manual confirmation.
    Task ApplyStatusAsync(Order order, string status, string? adminNote, CancellationToken cancellationToken);
}

public class CardPaymentConfirmer(
    NumindsDbContext db,
    IMetaConversionsApiService metaConversions,
    IEmailSender emailSender,
    IConfiguration configuration,
    IAdminNotifier notifier,
    INetloopersGateway gateway,
    ILogger<CardPaymentConfirmer> logger) : ICardPaymentConfirmer
{
    private string FrontendBaseUrl => configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";

    // One approval at a time across the whole app (webhook retries, the return page and the reconciler can
    // overlap): the order is re-read after taking the gate, so the partner credit, Meta event and email
    // are never produced twice.
    private static readonly SemaphoreSlim Gate = new(1, 1);

    // The return page asks again every few seconds and the reconciler every minute, so the same problem would
    // otherwise be announced to the admin over and over. Each (payment, kind) is announced once per server run.
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, byte> Announced = new();

    private void NotifyOnce(string key, string text)
    {
        if (Announced.Count > 5000)
        {
            Announced.Clear();
        }

        if (Announced.TryAdd(key, 0))
        {
            notifier.Notify(text);
        }
    }

    public async Task<CardConfirmResult> ConfirmAsync(NetloopersPayment payment, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(payment.OrderId, out var orderId))
        {
            logger.LogWarning("Netloopers payment {PaymentId} has no valid order_id ({OrderId}); ignored.", payment.Id, payment.OrderId);
            return CardConfirmResult.Ignored;
        }

        await Gate.WaitAsync(cancellationToken);
        try
        {
            // The scoped DbContext may already track this order from an earlier read; make sure the status is current.
            var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
            if (order is null)
            {
                logger.LogWarning("Netloopers payment {PaymentId} refers to unknown order {OrderId}; ignored.", payment.Id, orderId);
                return CardConfirmResult.Ignored;
            }
            await db.Entry(order).ReloadAsync(cancellationToken);

            // Retries and duplicate deliveries land here; the order is already approved. But a *different*
            // successful payment for an already-paid order means the customer paid twice -- tell the admin.
            if (order.PaymentStatus == "paid")
            {
                if (gateway.IsSuccessStatus(payment.Status) && (order.PaymentMethod != "card" || order.GatewayPaymentId != payment.Id))
                {
                    logger.LogWarning("Netloopers payment {PaymentId} succeeded for already-paid order {OrderId}.", payment.Id, order.Id);
                    NotifyOnce($"{payment.Id}:double", $"⚠️ دفعة بالبطاقة إضافية لطلب مدفوع مسبقاً ({order.CustomerName}) — قد يكون الزبون دفع مرتين، راجع الاسترداد.\n{FrontendBaseUrl}/admin/orders");
                }

                return CardConfirmResult.AlreadyPaid;
            }

            var expectedCents = (long)Math.Round(order.AmountUsd * 100m, MidpointRounding.AwayFromZero);
            string? problem = null;
            if (gateway.IsPendingStatus(payment.Status))
            {
                logger.LogInformation("Netloopers payment {PaymentId} is still {Status}.", payment.Id, payment.Status);
                return CardConfirmResult.StillPending;
            }
            else if (!gateway.IsSuccessStatus(payment.Status))
            {
                // failed / cancelled / expired: the order stays pending so the customer can try again.
                if (!gateway.IsFailureStatus(payment.Status))
                {
                    // A status word we do not recognise (the gateway documents none): this may well be a paid
                    // payment, so say so instead of leaving the customer waiting in silence. The admin can approve it
                    // by hand, and add the word to Netloopers:SuccessStatuses so later ones are approved automatically.
                    logger.LogWarning("Netloopers payment {PaymentId} has an unrecognised status \"{Status}\".", payment.Id, payment.Status);
                    NotifyOnce($"{payment.Id}:status", $"⚠️ دفعة بالبطاقة بحالة غير معروفة \"{payment.Status}\" ({order.CustomerName}) — إن كانت مدفوعة فاعتمدها يدوياً، وأضف الحالة إلى Netloopers__SuccessStatuses.\n{FrontendBaseUrl}/admin/orders");
                }

                return CardConfirmResult.NotApproved;
            }
            else if (expectedCents <= 0)
            {
                problem = "the order total is zero, nothing should have been charged";
            }
            else if (payment.Amount != expectedCents)
            {
                problem = $"amount {payment.Amount} cents does not match the order ({expectedCents} cents)";
            }
            else if (!string.Equals(payment.Currency, "USD", StringComparison.OrdinalIgnoreCase))
            {
                problem = $"currency is {payment.Currency}, expected USD";
            }
            else if (!string.Equals(payment.Environment, gateway.ExpectedEnvironment, StringComparison.OrdinalIgnoreCase)
                     && (payment.Environment is not null || gateway.ExpectedEnvironment == "live"))
            {
                // A live key must see an explicit "live" payment; a missing environment is never accepted there.
                problem = $"payment environment is {payment.Environment ?? "missing"}, expected {gateway.ExpectedEnvironment}";
            }

            if (problem is not null)
            {
                logger.LogWarning("Netloopers payment {PaymentId} for order {OrderId} not auto-approved: {Problem}", payment.Id, order.Id, problem);
                NotifyOnce($"{payment.Id}:problem", $"⚠️ دفعة بالبطاقة لم تُعتمد تلقائياً ({order.CustomerName}): {problem}\nراجعها يدوياً: {FrontendBaseUrl}/admin/orders");
                return CardConfirmResult.NotApproved;
            }

            order.PaymentMethod = "card";
            order.GatewayPaymentId = payment.Id;
            await ApplyStatusAsync(order, "paid", $"Paid by card via Netloopers ({payment.Id})", cancellationToken);

            notifier.Notify($"💳 دفع بالبطاقة (تأكيد تلقائي): {order.CustomerName} ({order.AmountUsd.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)} USD)\n{FrontendBaseUrl}/admin/orders");

            try
            {
                await emailSender.SendAsync(
                    order.CustomerEmail,
                    "تم استلام دفعتك وتفعيل دعوتك على زيتورا",
                    $"<p>مرحباً {System.Net.WebUtility.HtmlEncode(order.CustomerName)}،</p>" +
                    "<p>استلمنا دفعتك بنجاح وتم تفعيل دعوتك. تقدر تشاركها وتتابع الردود من لوحة التحكم:</p>" +
                    $"<p><a href=\"{FrontendBaseUrl}/dashboard\">{FrontendBaseUrl}/dashboard</a></p>",
                    cancellationToken);
            }
            catch (Exception ex)
            {
                // The order is already approved and saved; a mail problem must not undo or fail that.
                logger.LogWarning(ex, "Could not send the payment confirmation email for order {OrderId}", order.Id);
            }

            return CardConfirmResult.Approved;
        }
        finally
        {
            Gate.Release();
        }
    }

    public async Task ApplyStatusAsync(Order order, string status, string? adminNote, CancellationToken cancellationToken)
    {
        var wasPaid = order.PaymentStatus == "paid";
        order.PaymentStatus = status;
        order.AdminNote = string.IsNullOrWhiteSpace(adminNote) ? null : adminNote;

        if (status == "paid")
        {
            order.PaidAt = DateTime.UtcNow;
        }

        // An invitation can end up with more than one Order — most often a
        // guest editing an already-approved invitation and (before that was
        // fixed) getting routed through checkout again, or an admin's own
        // duplicate/stale test order. Computed once, up front, since every
        // block below needs it: crediting a partner or reporting a Purchase
        // to Meta must not double up if a different order for the same
        // invitation is already paid, and rejecting *this* order must not
        // undo an approval (or a partner's earned credit) that already
        // happened through that other, still-paid order.
        var hasOtherPaidOrder = await db.Orders.AnyAsync(
            o => o.InvitationId == order.InvitationId && o.Id != order.Id && o.PaymentStatus == "paid",
            cancellationToken);

        // Credit (or reverse) the referring partner's stats only on an
        // actual paid/not-paid transition — not on every PATCH, so an admin
        // re-confirming an already-paid order (or re-rejecting an
        // already-failed one) can't inflate the numbers, and correcting a
        // mis-click (paid -> failed, or back) keeps them accurate either
        // way. Also skipped whenever hasOtherPaidOrder is true: crediting
        // would double-count a sale already credited through the other paid
        // order, and reversing would claw back credit that other order is
        // still legitimately earning.
        if (!string.IsNullOrEmpty(order.PromoCodeUsed) && wasPaid != (status == "paid") && !hasOtherPaidOrder)
        {
            var partner = await db.Partners.FirstOrDefaultAsync(
                p => p.PromoCode != null && p.PromoCode.ToLower() == order.PromoCodeUsed.ToLower(),
                cancellationToken);
            if (partner is not null)
            {
                if (status == "paid")
                {
                    partner.UsageCount += 1;
                    partner.RevenueUsd += order.AmountUsd;
                }
                else
                {
                    partner.UsageCount = Math.Max(0, partner.UsageCount - 1);
                    partner.RevenueUsd = Math.Max(0, partner.RevenueUsd - order.AmountUsd);
                }
            }
        }

        var invitation = await db.Invitations.FirstOrDefaultAsync(i => i.Id == order.InvitationId, cancellationToken);
        if (invitation is not null)
        {
            if (status == "paid")
            {
                invitation.Status = "paid";
            }
            else if (!hasOtherPaidOrder)
            {
                invitation.Status = "rejected";
            }
            invitation.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);

        // Only on the actual pending/failed -> paid transition, and only
        // when no other order for this invitation was already paid --
        // matches the partner-stats guard above, so an admin re-saving an
        // already-paid order (no-op re-confirmation, or just editing the
        // AdminNote) or confirming a stale duplicate order for an
        // invitation that's genuinely already been paid for can't
        // double-report the same sale to Meta.
        if (!wasPaid && status == "paid" && !hasOtherPaidOrder)
        {
            // No real page URL exists for this event -- it fires from the
            // admin's confirmation click, not a customer browser session
            // (see SendPurchaseAsync's own doc comment). The dashboard is
            // the closest stable, real page on the site to attribute it to.
            await metaConversions.SendPurchaseAsync(
                order.Id.ToString(), order.CustomerEmail, order.AmountUsd, $"{FrontendBaseUrl}/dashboard", cancellationToken);
        }
    }
}
