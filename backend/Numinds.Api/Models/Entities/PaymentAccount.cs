namespace Numinds.Api.Models.Entities;

// One row per country the admin has configured a receiving account for,
// plus exactly one row with CountryCode "INTL" that's always shown when a
// paying customer's chosen country has no override of its own -- there is
// no live payment gateway integration, so checkout works by showing the
// customer whichever of these accounts matches their country and asking
// them to transfer the amount themselves; the admin then manually marks
// the order paid once confirmed.
// Deliberately never stores a CVV or expiry date — those are only needed to
// charge a card, not to receive a transfer into one, and storing them would
// be an unnecessary liability.
public class PaymentAccount
{
    public Guid Id { get; set; }

    // ISO 3166-1 alpha-2 for a real country (e.g. "JO", "AE"), "PS48" for
    // the occupied Palestinian interior (not a real country code -- an
    // internal distinction this app's own country picker needs), or the
    // reserved "INTL" fallback row. Always stored upper-case.
    public string CountryCode { get; set; } = string.Empty;

    public string RecipientName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public string? Iban { get; set; }

    // Free text the admin can customize, e.g. "أرسل لقطة شاشة للتحويل عبر واتساب".
    public string? Instructions { get; set; }
}
