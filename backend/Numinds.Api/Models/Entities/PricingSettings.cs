namespace Numinds.Api.Models.Entities;

// Singleton row (exactly one, seeded — see NumindsDbContext.OnModelCreating)
// driving checkout pricing everywhere it's quoted (Home, /Prices, Studio's
// PaymentPhase) and the discount codes applied there. Admin-editable from
// /admin/pricing.
public class PricingSettings
{
    public Guid Id { get; set; }

    public decimal BasePriceUsd { get; set; }
    public decimal QrRateUsd { get; set; }

    // Extra percentage charged on the base price when a customer enables
    // "Add gift fee" (Step14Gift.giftFeeCoverage) at checkout. Stored as a
    // whole percent (5 = 5%), same convention as the discount fields below.
    public decimal GiftFeePercent { get; set; } = 5m;

    // Applied automatically when a new partner is approved — editable
    // per-partner afterward via Partner.DiscountType/DiscountValue.
    public string DefaultPartnerDiscountType { get; set; } = "percent";
    public decimal DefaultPartnerDiscountValue { get; set; }

    // The fixed platform-wide coupon's own discount, separate from any
    // individual partner's rate.
    public string PlatformDiscountType { get; set; } = "percent";
    public decimal PlatformDiscountValue { get; set; }
    public string PlatformDiscountCode { get; set; } = "PARTNER2026";

    // The currency Home/Prices/checkout (PaymentPhase) show by default to a
    // visitor who hasn't picked one yet on their own device -- see
    // CurrencyContext's "no stored choice" branch. A visitor can always
    // switch away from this to any other supported currency.
    public string DefaultCurrency { get; set; } = "ILS";
}
