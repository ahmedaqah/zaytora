namespace Numinds.Api.Models.Entities;

public class Invitation
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public ApplicationUser? User { get; set; }

    // Identifies an anonymous (not-yet-signed-in) creator via a long-lived
    // tracking cookie, so the 5-invitation cap can apply before an account
    // exists too. Cleared implicitly once UserId is set (Update claims the
    // draft, but leaves GuestId as a harmless historical breadcrumb).
    public Guid? GuestId { get; set; }

    public Guid? TemplateId { get; set; }
    public Template? Template { get; set; }

    // draft -> preview -> paid -> shared
    public string Status { get; set; } = "draft";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<RsvpResponse> Responses { get; set; } = [];
    public List<CapturedPhoto> CapturedPhotos { get; set; } = [];

    // Set by an admin generating a one-time "hand this off to the
    // customer's own account" link (InvitationsController.CreateTransferLink)
    // for an invitation the admin designed on their own account for
    // someone else. Whoever is signed in when they open that link and
    // claim it (ClaimTransfer) becomes the new UserId, and both fields are
    // cleared immediately so the same link can never be reused.
    public string? TransferToken { get; set; }
    public DateTime? TransferTokenExpiresAt { get; set; }

    // Short public id for the guest-facing share link (InvitationsController
    // ShareRedirect) -- kept separate from Id so the shared URL stays short
    // and doesn't leak the real Guid. Nullable/backfilled lazily (see List)
    // rather than migrated for every existing row.
    public string? ShareCode { get; set; }

    // Step 1 — Invitation Language
    public string? Language { get; set; }

    // Step 2 — Occasion Type
    public string? OccasionType { get; set; }
    public bool IsCoupleEvent { get; set; }

    // Step 4 — Basic Information
    public string? EventTitle { get; set; }
    public string? EventTitleFont { get; set; }
    // Percentage scale (100 = the template's own default size) the guest
    // picked via the studio's FontSizeStepper -- null/100 renders exactly as
    // before this existed.
    public int? EventTitleFontSize { get; set; }
    public string InvitationType { get; set; } = "couple"; // "individual" | "couple"
    public string? FirstName { get; set; }
    public string? SecondName { get; set; }
    public string? NamesFont { get; set; }
    public int? NamesFontSize { get; set; }
    // "horizontal" (default when null) or "vertical" — only meaningful for a
    // couple invitation with both names set.
    public string? NamesLayout { get; set; }
    public bool UseNameImage { get; set; }
    public DateTime? EventDateTime { get; set; }
    // Optional end of a time range (e.g. 5:00 PM - 7:00 PM) — null means the
    // event has a single start time only, the original behavior. Same
    // "wall-clock, not a real UTC instant" convention as EventDateTime.
    public DateTime? EventEndDateTime { get; set; }
    public string? Timezone { get; set; }
    public bool UseHijriDate { get; set; }
    public string? ThankYouText { get; set; }
    public string? ThankYouTextColor { get; set; }
    public int? ThankYouTextFontSize { get; set; }
    // Set when the user picked one of Step04BasicInfo's pre-made suggestion
    // cards instead of typing custom text — takes rendering priority over
    // ThankYouText when present (see InvitationCanvas.tsx).
    public string? ThankYouImageUrl { get; set; }

    // Step 5 — The Invitation (family names + text)
    public bool HideFamilyNames { get; set; }
    public string? FamilyName1 { get; set; }
    public string? FamilyName2 { get; set; }
    public string? FamilyNamesFont { get; set; }
    public int? FamilyNamesFontSize { get; set; }
    public string? InvitationText { get; set; }
    public int? InvitationTextFontSize { get; set; }

    // Step 6 — Location (JSON array of { name, address, mapUrl })
    public string VenuesJson { get; set; } = "[]";

    // Step 7 — Event Program (JSON array of { time, title })
    public bool ShowEventProgram { get; set; }
    public string ProgramItemsJson { get; set; } = "[]";

    // Step 8 — Event Rules / Notes
    public bool ShowEventRules { get; set; }
    public string? EventRulesText { get; set; }

    // Step 9 — Accommodation (JSON array of { name, address, mapUrl })
    public bool ShowAccommodation { get; set; }
    public string AccommodationsJson { get; set; } = "[]";

    // Step 10 — Photo Gallery (JSON array of image URLs, up to 6)
    public string GalleryImagesJson { get; set; } = "[]";

    // Step 11 — Personal Message
    public bool ShowPersonalMessage { get; set; }
    public string? PersonalMessageTitle { get; set; }
    public string? PersonalMessageText { get; set; }
    public string? PersonalMessageSignature { get; set; }

    // Step 12 — Contacts (JSON array of { name, role, phone, whatsapp }, up to 5)
    public string ContactsJson { get; set; } = "[]";

    // Step 13 — Music
    public string? MusicUrl { get; set; }
    public string? MusicTitle { get; set; }

    // Step 14 — Gift
    public bool EnableGifts { get; set; }
    public string? GiftIban { get; set; }
    // Whether EnableGifts's processing fee should actually be charged at
    // checkout (PaymentPhase/OrdersController) — separate from EnableGifts
    // itself so the guest can keep gifts on for guests while opting out of
    // covering the fee.
    public bool GiftFeeCoverage { get; set; }
    public string? GiftMessage { get; set; }
    public bool GiftBankTransferEnabled { get; set; }
    public string? GiftAccountHolderName { get; set; }
    public string? GiftQrImageUrl { get; set; }
    public bool GiftWishlistEnabled { get; set; }
    // JSON array of { name, link, imageUrl } — same reasoning as
    // VenuesJson/ContactsJson below: a guest's wishlist is small and only
    // ever read back whole, not queried into.
    public string GiftWishlistItemsJson { get; set; } = "[]";

    // Step 15 — Camera controls
    public bool HideCameraButton { get; set; }
    public bool HideSaveButton { get; set; }
    public bool HideCapturedGallery { get; set; }

    // Step 16 — QR guest entry
    public bool EnableQrEntry { get; set; }
    public int? QrGuestCount { get; set; }
    public int? QrScannerCount { get; set; }
    // Same "wall-clock reading, no real timezone" convention as
    // EventDateTime above (see InvitationsController.Update) — tagged
    // DateTimeKind.Utc only to satisfy Npgsql's timestamptz column type,
    // not because it represents a real UTC instant.
    public DateTime? QrScanStart { get; set; }
    public DateTime? QrScanEnd { get; set; }

    // Step 17 — RSVP settings
    public bool EnableRsvp { get; set; } = true;
    public bool RsvpShowAttendance { get; set; } = true;
    public bool RsvpShowGuestCount { get; set; } = true;
    public bool RsvpShowMessage { get; set; } = true;
    public bool RsvpShowLiveCount { get; set; } = true;
    public int? GuestLimit { get; set; }

    // Step 18 — Additional settings
    public string? GeneralTextFont { get; set; }
    public string? EnvelopeNameFont { get; set; }
    // Overrides every heading/body/strong/muted color the canvas would
    // otherwise resolve from Template.TextColor/dark-vs-light theme (see
    // InvitationCanvas.tsx's resolveCanvasTheme) — lets a guest fix text
    // that's hard to read against their chosen template's background.
    public string? TextColor { get; set; }
}
