namespace Numinds.Api.Models.Dtos;

// PUT /api/invitations/{id} body. Every field is optional (patch
// semantics) — each wizard step only sends the fields it owns, and the
// controller applies just the properties that were actually provided
// rather than requiring the client to resend the whole accumulated
// invitation on every step transition.
public class UpdateInvitationRequest
{
    public string? TemplateId { get; set; }
    public string? Status { get; set; }

    public string? Language { get; set; }

    public string? OccasionType { get; set; }
    public bool? IsCoupleEvent { get; set; }

    public string? EventTitle { get; set; }
    public string? EventTitleFont { get; set; }
    public int? EventTitleFontSize { get; set; }
    public string? InvitationType { get; set; }
    public string? FirstName { get; set; }
    public string? SecondName { get; set; }
    public string? NamesFont { get; set; }
    public int? NamesFontSize { get; set; }
    public string? NamesLayout { get; set; }
    public bool? UseNameImage { get; set; }
    public DateTime? EventDateTime { get; set; }
    public DateTime? EventEndDateTime { get; set; }
    // A null EventEndDateTime is indistinguishable from "not provided" under
    // this DTO's patch semantics (see the type-level comment above), so
    // switching an invitation from a time range back to a single time can't
    // clear the stored end time just by omitting/nulling the field above —
    // the studio sets this explicit flag instead when it does.
    public bool? ClearEventEndDateTime { get; set; }
    public string? Timezone { get; set; }
    public bool? UseHijriDate { get; set; }
    public string? ThankYouText { get; set; }
    public string? ThankYouTextColor { get; set; }
    public int? ThankYouTextFontSize { get; set; }
    public string? ThankYouImageUrl { get; set; }

    public bool? HideFamilyNames { get; set; }
    public string? FamilyName1 { get; set; }
    public string? FamilyName2 { get; set; }
    public string? FamilyNamesFont { get; set; }
    public int? FamilyNamesFontSize { get; set; }
    public string? InvitationText { get; set; }
    public int? InvitationTextFontSize { get; set; }

    public List<VenueItemDto>? Venues { get; set; }

    public bool? ShowEventProgram { get; set; }
    public List<ProgramItemDto>? ProgramItems { get; set; }
    public string? ProgramFont { get; set; }
    public int? ProgramFontSize { get; set; }

    public bool? ShowEventRules { get; set; }
    public string? EventRulesText { get; set; }

    public bool? ShowAccommodation { get; set; }
    public List<VenueItemDto>? Accommodations { get; set; }

    public List<string>? GalleryImages { get; set; }

    public bool? ShowPersonalMessage { get; set; }
    public string? PersonalMessageTitle { get; set; }
    public string? PersonalMessageText { get; set; }
    public string? PersonalMessageSignature { get; set; }

    public List<ContactItemDto>? Contacts { get; set; }

    public string? MusicUrl { get; set; }
    public string? MusicTitle { get; set; }

    public bool? EnableGifts { get; set; }
    public string? GiftIban { get; set; }
    public bool? GiftFeeCoverage { get; set; }
    public string? GiftMessage { get; set; }
    public bool? GiftBankTransferEnabled { get; set; }
    public string? GiftAccountHolderName { get; set; }
    public string? GiftQrImageUrl { get; set; }
    public bool? GiftWishlistEnabled { get; set; }
    public List<WishlistItemDto>? GiftWishlistItems { get; set; }

    public bool? HideCameraButton { get; set; }
    public bool? HideSaveButton { get; set; }
    public bool? HideCapturedGallery { get; set; }

    public bool? EnableQrEntry { get; set; }
    public int? QrGuestCount { get; set; }
    public int? QrScannerCount { get; set; }
    public DateTime? QrScanStart { get; set; }
    public DateTime? QrScanEnd { get; set; }

    public bool? EnableRsvp { get; set; }
    public bool? RsvpShowAttendance { get; set; }
    public bool? RsvpShowGuestCount { get; set; }
    public bool? RsvpShowMessage { get; set; }
    public bool? RsvpShowLiveCount { get; set; }
    public int? GuestLimit { get; set; }

    public string? GeneralTextFont { get; set; }
    public string? EnvelopeNameFont { get; set; }
    public string? TextColor { get; set; }
}
