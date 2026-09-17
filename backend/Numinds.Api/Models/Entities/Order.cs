namespace Numinds.Api.Models.Entities;

// A checkout attempt against one Invitation. There's no live payment
// gateway — AmountUsd is computed and persisted server-side at creation
// time (see OrdersController.Create) so it never changes even if pricing
// is edited later, and PaymentStatus only ever moves from "pending" to
// "paid"/"failed" via an admin manually confirming the (out-of-band) bank
// transfer they received.
public class Order
{
    public Guid Id { get; set; }
    // Nullable so a customer deleting their own invitation (allowed at any
    // status, including "paid" -- see InvitationsController.Delete) doesn't
    // cascade-delete this order and silently erase real revenue/payment
    // history from the admin's records. See NumindsDbContext's
    // DeleteBehavior.SetNull on this relationship.
    public Guid? InvitationId { get; set; }
    public Invitation? Invitation { get; set; }

    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;

    // Snapshots of the invitation's checkout-relevant options at order time —
    // independent of the Invitation's own fields, which may keep changing
    // afterward if the guest goes on editing it.
    public bool QrEnabled { get; set; }
    public int? QrGuestCount { get; set; }
    public bool GiftFeeCoverage { get; set; }

    public string? PromoCodeUsed { get; set; }

    // The country/region the customer picked at checkout — records which
    // PaymentAccount (see PaymentSettingsController.ResolveForCountryAsync)
    // was actually shown to them for this order, for the admin's own
    // reference when reviewing it. Null for orders placed before this
    // field existed.
    public string? Country { get; set; }

    // The authoritative amount, always USD — computed server-side from
    // PricingSettings (+ any promo discount) at creation time.
    public decimal AmountUsd { get; set; }

    // Currency/ConvertedAmount are what the customer was shown at checkout
    // (client-side FX conversion) — display/receipt only, never trusted as
    // the real amount since there's no gateway to actually charge it in.
    public string Currency { get; set; } = "USD";
    public decimal ConvertedAmount { get; set; }

    // pending -> paid | failed
    public string PaymentStatus { get; set; } = "pending";
    public string? AdminNote { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }

    // Set when an admin sends the "complete your order" reminder email --
    // lets /admin/orders show it was already sent (and when) instead of an
    // admin having no way to tell whether they already nudged this customer.
    public DateTime? ReminderSentAt { get; set; }
}
