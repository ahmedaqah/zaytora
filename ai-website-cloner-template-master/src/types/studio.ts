// Mirrors the ASP.NET Core backend's InvitationDetailDto / UpdateInvitationRequest
// (backend/Numinds.Api/Models/Dtos) field-for-field.

export interface VenueItem {
  name: string;
  address?: string;
  mapUrl?: string;
}

export interface ProgramItem {
  time?: string;
  title: string;
}

export interface ContactItem {
  name: string;
  role?: string;
  phone: string;
  whatsapp?: string;
}

export interface WishlistItem {
  name: string;
  link?: string;
  imageUrl?: string;
}

export interface InvitationDetail {
  id: string;
  status: string;
  editUrl: string;
  templateId?: string | null;
  createdAt: string;
  updatedAt: string;

  language?: string | null;

  occasionType?: string | null;
  isCoupleEvent: boolean;

  eventTitle?: string | null;
  eventTitleFont?: string | null;
  // Percentage scale (100 = the template's own default size) applied on top
  // of eventTitleFont — see FontSizeStepper.
  eventTitleFontSize?: number | null;
  invitationType: "individual" | "couple";
  firstName?: string | null;
  secondName?: string | null;
  namesFont?: string | null;
  namesFontSize?: number | null;
  // "horizontal" (default when unset) or "vertical" — only meaningful for a
  // couple invitation with both names set; a solo invitation ignores it.
  namesLayout?: "horizontal" | "vertical" | null;
  useNameImage: boolean;
  // Not yet backed by a backend column — persists for the editing session
  // but won't survive a reload until the API grows a matching field.
  nameImageUrl?: string | null;
  eventDateTime?: string | null;
  // Optional end of a time range (e.g. "5:00 PM - 7:00 PM") — null/unset
  // means the event has a single start time only, the original behavior.
  eventEndDateTime?: string | null;
  timezone?: string | null;
  useHijriDate: boolean;
  thankYouText?: string | null;
  thankYouTextColor?: string | null;
  thankYouTextFontSize?: number | null;
  thankYouImageUrl?: string | null;

  hideFamilyNames: boolean;
  familyName1?: string | null;
  familyName2?: string | null;
  familyNamesFont?: string | null;
  familyNamesFontSize?: number | null;
  invitationText?: string | null;
  invitationTextFontSize?: number | null;

  venues: VenueItem[];

  showEventProgram: boolean;
  programItems: ProgramItem[];
  // Font class (same catalog as the other studio font pickers) and percentage scale (100 = default) for the
  // whole program section; unset renders exactly as before.
  programFont?: string | null;
  programFontSize?: number | null;
  // Per-section typography (font class / percent scale / "#rrggbb"; ""/null = template default).
  venueFont?: string | null;
  venueFontSize?: number | null;
  venueTextColor?: string | null;
  personalMessageFont?: string | null;
  personalMessageFontSize?: number | null;
  personalMessageTextColor?: string | null;
  eventRulesFont?: string | null;
  eventRulesFontSize?: number | null;
  eventRulesTextColor?: string | null;
  // Date/time display: "levant" shows Levantine month names (تشرين الثاني); "12"/"24" clock; "" = default.
  dateMonthStyle?: string | null;
  timeFormat?: string | null;
  // The calendar card's weekday (e.g. الخميس) and date (month + day) typography.
  // Countdown widget: one font / percent scale / "#rrggbb" shared by the numbers and the words under them.
  // (The countdownLabel* columns exist on the server but are unused.)
  countdownNumberFont?: string | null;
  countdownNumberFontSize?: number | null;
  countdownNumberTextColor?: string | null;
  weekdayFont?: string | null;
  weekdayTextColor?: string | null;
  weekdayFontSize?: number | null;
  dateFontSize?: number | null;
  dateFont?: string | null;
  dateTextColor?: string | null;
  // Optional free sentence under the personal message.
  personalMessageExtraText?: string | null;
  personalMessageExtraFont?: string | null;
  personalMessageExtraFontSize?: number | null;
  personalMessageExtraTextColor?: string | null;

  showEventRules: boolean;
  eventRulesText?: string | null;

  showAccommodation: boolean;
  accommodations: VenueItem[];

  galleryImages: string[];

  showPersonalMessage: boolean;
  personalMessageTitle?: string | null;
  personalMessageText?: string | null;
  personalMessageSignature?: string | null;

  contacts: ContactItem[];

  musicUrl?: string | null;
  musicTitle?: string | null;
  musicStartSeconds?: number | null;

  enableGifts: boolean;
  giftIban?: string | null;
  giftFeeCoverage?: boolean;
  giftMessage?: string | null;
  giftBankTransferEnabled?: boolean;
  giftAccountHolderName?: string | null;
  giftQrImageUrl?: string | null;
  giftWishlistEnabled?: boolean;
  giftWishlistItems?: WishlistItem[];

  hideCameraButton: boolean;
  hideSaveButton: boolean;
  hideCapturedGallery: boolean;

  // Public share code -- what the guest-facing QR (QR guest entry) encodes.
  shareCode?: string | null;
  enableQrEntry: boolean;
  qrGuestCount?: number | null;
  qrScannerCount?: number | null;
  // Where the guest QR sits: "top" (default, under the hero), "details" (after the venue card) or "bottom" (before the closing footer).
  qrPosition?: QrPosition | null;
  qrScanStart?: string | null;
  qrScanEnd?: string | null;

  enableRsvp: boolean;
  rsvpShowAttendance: boolean;
  rsvpShowGuestCount: boolean;
  rsvpShowMessage: boolean;
  rsvpShowLiveCount: boolean;
  guestLimit?: number | null;
  // Derived from the invitation's own RSVP responses, not user-editable —
  // powers the guest-facing attendee count + wishes feed.
  rsvpAttendingCount: number;
  rsvpWishes: string[];

  generalTextFont?: string | null;
  envelopeNameFont?: string | null;
  // Manual override for every heading/body/strong/muted text color the
  // canvas would otherwise resolve from the template's own theme (see
  // resolveCanvasTheme in InvitationCanvas.tsx) — lets a guest fix text
  // that's hard to read against their chosen template's background instead
  // of being stuck with that template's automatic color choice.
  textColor?: string | null;
}

// Every field optional — a step only ever sends the slice it owns.
export type QrPosition = "top" | "details" | "bottom";

export type UpdateInvitationPatch = Partial<
  Omit<InvitationDetail, "id" | "status" | "editUrl" | "createdAt" | "updatedAt">
> & {
  status?: string;
  // Write-only signal, not part of InvitationDetail itself — a plain
  // eventEndDateTime: null is indistinguishable from "not sent" under the
  // API's patch semantics (see UpdateInvitationRequest.cs), so switching
  // back to a single time has to say so explicitly to actually clear the
  // stored end time instead of leaving the old one in place.
  clearEventEndDateTime?: boolean;
};
