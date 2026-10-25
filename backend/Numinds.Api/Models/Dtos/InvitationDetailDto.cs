namespace Numinds.Api.Models.Dtos;

// Full read shape for GET /api/invitations/{id} — everything the studio
// wizard needs to resume editing a draft, plus what the live phone
// preview renders.
public class InvitationDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string EditUrl { get; set; } = string.Empty;
    public string? TemplateId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public string? Language { get; set; }

    public string? OccasionType { get; set; }
    public bool IsCoupleEvent { get; set; }

    public string? EventTitle { get; set; }
    public string? EventTitleFont { get; set; }
    public int? EventTitleFontSize { get; set; }
    public string InvitationType { get; set; } = "couple";
    public string? FirstName { get; set; }
    public string? SecondName { get; set; }
    public string? NamesFont { get; set; }
    public int? NamesFontSize { get; set; }
    public string? NamesLayout { get; set; }
    public bool UseNameImage { get; set; }
    public DateTime? EventDateTime { get; set; }
    public DateTime? EventEndDateTime { get; set; }
    public string? Timezone { get; set; }
    // Public share code -- what the guest-facing QR (QR guest entry) encodes.
    public string? ShareCode { get; set; }
    public bool UseHijriDate { get; set; }
    public string? ThankYouText { get; set; }
    public string? ThankYouTextColor { get; set; }
    public int? ThankYouTextFontSize { get; set; }
    public string? ThankYouImageUrl { get; set; }

    public bool HideFamilyNames { get; set; }
    public string? FamilyName1 { get; set; }
    public string? FamilyName2 { get; set; }
    public string? FamilyNamesFont { get; set; }
    public int? FamilyNamesFontSize { get; set; }
    public string? InvitationText { get; set; }
    public int? InvitationTextFontSize { get; set; }

    public List<VenueItemDto> Venues { get; set; } = [];

    public bool ShowEventProgram { get; set; }
    public List<ProgramItemDto> ProgramItems { get; set; } = [];
    public string? ProgramFont { get; set; }
    public int? ProgramFontSize { get; set; }
    public string? VenueFont { get; set; }
    public int? VenueFontSize { get; set; }
    public string? VenueTextColor { get; set; }
    public string? PersonalMessageFont { get; set; }
    public int? PersonalMessageFontSize { get; set; }
    public string? PersonalMessageTextColor { get; set; }
    public string? EventRulesFont { get; set; }
    public int? EventRulesFontSize { get; set; }
    public string? EventRulesTextColor { get; set; }
    public string? DateMonthStyle { get; set; }
    public string? TimeFormat { get; set; }
    public string? WeekdayFont { get; set; }
    public string? WeekdayTextColor { get; set; }
    public int? WeekdayFontSize { get; set; }
    public int? DateFontSize { get; set; }
    public string? DateFont { get; set; }
    public string? DateTextColor { get; set; }
    public string? PersonalMessageExtraText { get; set; }
    public string? PersonalMessageExtraFont { get; set; }
    public int? PersonalMessageExtraFontSize { get; set; }
    public string? PersonalMessageExtraTextColor { get; set; }

    public bool ShowEventRules { get; set; }
    public string? EventRulesText { get; set; }

    public bool ShowAccommodation { get; set; }
    public List<VenueItemDto> Accommodations { get; set; } = [];

    public List<string> GalleryImages { get; set; } = [];

    public bool ShowPersonalMessage { get; set; }
    public string? PersonalMessageTitle { get; set; }
    public string? PersonalMessageText { get; set; }
    public string? PersonalMessageSignature { get; set; }

    public List<ContactItemDto> Contacts { get; set; } = [];

    public string? MusicUrl { get; set; }
    public string? MusicTitle { get; set; }
    public int? MusicStartSeconds { get; set; }

    public bool EnableGifts { get; set; }
    public string? GiftIban { get; set; }
    public bool GiftFeeCoverage { get; set; }
    public string? GiftMessage { get; set; }
    public bool GiftBankTransferEnabled { get; set; }
    public string? GiftAccountHolderName { get; set; }
    public string? GiftQrImageUrl { get; set; }
    public bool GiftWishlistEnabled { get; set; }
    public List<WishlistItemDto> GiftWishlistItems { get; set; } = [];

    public bool HideCameraButton { get; set; }
    public bool HideSaveButton { get; set; }
    public bool HideCapturedGallery { get; set; }

    public bool EnableQrEntry { get; set; }
    public int? QrGuestCount { get; set; }
    public int? QrScannerCount { get; set; }
    public DateTime? QrScanStart { get; set; }
    public DateTime? QrScanEnd { get; set; }

    public bool EnableRsvp { get; set; }
    public bool RsvpShowAttendance { get; set; }
    public bool RsvpShowGuestCount { get; set; }
    public bool RsvpShowMessage { get; set; }
    public bool RsvpShowLiveCount { get; set; }
    public int? GuestLimit { get; set; }

    // Derived from the invitation's own RsvpResponses — not stored columns.
    // Powers the guest-facing "attendee count" + wishes feed on the public
    // invitation page (shown when RsvpShowLiveCount / RsvpShowMessage are on).
    public int RsvpAttendingCount { get; set; }
    public List<string> RsvpWishes { get; set; } = [];

    public string? GeneralTextFont { get; set; }
    public string? EnvelopeNameFont { get; set; }
    public string? TextColor { get; set; }
}
