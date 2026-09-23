// Shapes returned by the ASP.NET Core Web API (System.Text.Json camelCase).

import type { PublicCurrencyCode } from "@/lib/priceRates";

export interface TemplateDto {
  id: string;
  code: string;
  category: string;
  // The picker-grid thumbnail (Step03Template) — may be a finished preview
  // screenshot with demo names/dates baked into its pixels. Never composite
  // this behind live guest text; that's what backgroundImageUrl is for.
  imageUrl: string;
  // The clean, text-free asset InvitationCanvas actually renders behind the
  // couple's live names/dates, per `layout`. Null for a template whose only
  // known asset is the (possibly baked-text) imageUrl thumbnail above — the
  // canvas falls back to the plain cream/gold theme in that case.
  backgroundImageUrl?: string | null;
  // How backgroundImageUrl gets composited, when present: "full-bleed"
  // (stretches behind the whole page), "boxed-hero" (confined to a rounded
  // card in the hero only), "overlay" (decorative frame layered on top of
  // the cream theme, no background photo), or "none" (no compositing).
  // Deliberately a plain string, not a union, so an API response carrying a
  // layout value this frontend build doesn't recognize yet still parses —
  // InvitationCanvas falls back to "full-bleed" for any non-"none" value it
  // doesn't otherwise handle, rather than throwing.
  layout?: string | null;
  // Theme palette tokens InvitationCanvas resolves into CSS custom
  // properties (see resolveCanvasTheme in InvitationCanvas.tsx) — plain hex
  // colors, or two comma-separated hex stops for pageBg's gradient. Null on
  // any template without an assigned palette; the canvas falls back to its
  // original hasPhoto-driven look (dark glass on a full-bleed photo, cream/
  // gold otherwise) in that case, so this is purely additive.
  pageBg?: string | null;
  cardBg?: string | null;
  textColor?: string | null;
  primaryAccent?: string | null;
  // One of FontSelect's own option values ("font-cinzel" | "font-serif" |
  // "font-sans" | "italic font-serif") the template wants applied to the
  // couple's live names when the guest hasn't picked their own font via
  // Step04BasicInfo. Null falls back to the app-wide default (font-cinzel).
  defaultNamesFont?: string | null;
  // Four more per-section defaults, same "guest's own pick always wins,
  // this is only the fallback" role as defaultNamesFont above — see
  // Models/Entities/Template.cs for which studio font field each backs.
  eventTitleFont?: string | null;
  thankYouTextFont?: string | null;
  familyNamesFont?: string | null;
  invitationTextFont?: string | null;
  // The track InvitationCanvas plays when the guest hasn't picked their own
  // via Step13Music — a hosted audio file or a YouTube link, same dual-mode
  // convention as InvitationDetail.musicUrl.
  defaultMusicUrl?: string | null;
  defaultMusicTitle?: string | null;
  // Decorative artwork independent of backgroundImageUrl/layout, so a
  // photo-less template isn't limited to flat color + border.
  // heroIllustrationUrl renders full-screen (same object-cover treatment as
  // backgroundImageUrl's full-bleed layout), only when there's no background
  // photo already filling that slot; decorationImageUrl is a smaller
  // object-contain divider ornament between the hero and the main card,
  // independent of layout. Each template should point at its own distinct
  // heroIllustrationUrl — reusing one across templates makes them render
  // with the same background.
  heroIllustrationUrl?: string | null;
  decorationImageUrl?: string | null;
  // The envelope's opening media — EnvelopeMediaCover.tsx renders this as
  // the closed/tap-to-open screen whenever it's set, independent of
  // envelopeStyle below. Despite the field name (kept as-is to avoid a
  // rename migration), this can be either a video (plays once on tap) or a
  // plain image (fades away instantly on tap) — EnvelopeMediaCover tells
  // them apart by content, not a separate flag.
  openingVideoUrl?: string | null;
  // A looping video AmbientVideoBackground.tsx renders behind the revealed
  // invitation content, independent of envelopeStyle/openingVideoUrl and of
  // ambientEffect's particle layer (both can be set at once).
  ambientVideoUrl?: string | null;
  // Position (0-100, percent of the media's own width/height) of a live
  // couple-initials overlay EnvelopeMediaCover draws on top of
  // openingVideoUrl — a small frosted patch showing the real initials, for
  // a video/photo whose seal area is blank (or has placeholder letters this
  // patch is meant to cover) rather than one with a specific couple's names
  // burned into its pixels. Both null (most templates) renders no overlay.
  envelopeInitialsXPercent?: number | null;
  envelopeInitialsYPercent?: number | null;
  // Which ambient particle animation AmbientParticles.tsx renders across the
  // whole canvas: "smoke" | "petals" | "sparkle" | "snow" | "none". Null
  // defers to the resolved theme's isDark ("smoke" when dark, "sparkle"
  // when light) rather than requiring every template to set this.
  ambientEffect?: string | null;
  // Four opt-in "scene style" switches InvitationCanvas branches on for
  // rendering behavior the palette/layout/ambient tokens above can't express
  // — each swaps out one specific block for a fully different treatment, but
  // only when set; unset/unrecognized values keep every template's original
  // rendering exactly as before these existed.
  // envelopeStyle: "waxseal" swaps the tap-to-open cover for an embossed
  // wax-seal envelope with a shimmer + light-beam crossfade open. Ignored
  // whenever openingVideoUrl is set (see above), which takes priority.
  envelopeStyle?: string | null;
  // heroFrameStyle: "archIslamic" swaps the hero's plain arch-window photo
  // frame for a wider scalloped Mughal-arch frame with pillar/lantern
  // decoration.
  heroFrameStyle?: string | null;
  // dateRevealStyle: "scratch" adds a "scratch to reveal the date" section
  // right after the hero.
  dateRevealStyle?: string | null;
  // invitationCardStyle: "archIslamic" swaps the main invitation card for a
  // pointed-arch card with Bismillah calligraphy + parent names.
  invitationCardStyle?: string | null;
  // sceneLayoutStyle: "scenes" gives each section after the hero its own
  // background (from scenesJson) instead of sharing pageBg for the whole
  // canvas — see src/lib/templateScenes.ts. Null keeps the classic look.
  sceneLayoutStyle?: string | null;
  // Raw JSON string of TemplateScene[] (src/lib/templateScenes.ts) — only
  // meaningful when sceneLayoutStyle is "scenes". Always parse it with
  // parseScenes rather than JSON.parse directly.
  scenesJson: string;
  // Which Envelope (see the admin "Envelopes" library, /admin/envelopes)
  // this template is assigned, plus that envelope's own photo/seal position
  // resolved inline by the API — PhotoWaxSealEnvelopeCover renders straight
  // off envelopePhotoUrl/envelopeSealXPercent/envelopeSealYPercent without a
  // second fetch. Takes priority over envelopeStyle above when set (see
  // InvitationCanvas.tsx's envelope-cover branch order).
  envelopeId?: string | null;
  envelopePhotoUrl?: string | null;
  envelopeSealXPercent?: number | null;
  envelopeSealYPercent?: number | null;
  // "flap" (default), "scroll", "doorSlide", or "doorFold" — which cover
  // component InvitationCanvas mounts for envelopePhotoUrl above (see
  // Envelope.openingStyle).
  envelopeOpeningStyle?: string | null;
  // Only meaningful when envelopeOpeningStyle is "flap" — see
  // EnvelopeFoldPoint below.
  envelopeFoldPoints?: EnvelopeFoldPoint[];
  isPopular: boolean;
  isHomepageFeatured: boolean;
  isActive: boolean;
  usageCount: number;
}

// Body for POST/PUT /api/templates — the admin "create/edit template" flow
// (src/app/admin/video-templates). Id/Code/UsageCount are server-owned: Code
// is auto-generated from category (see TemplatesController.GenerateCode).
export interface TemplateWriteRequest {
  category: string;
  imageUrl: string;
  backgroundImageUrl?: string | null;
  layout: string;
  pageBg?: string | null;
  cardBg?: string | null;
  textColor?: string | null;
  primaryAccent?: string | null;
  defaultNamesFont?: string | null;
  eventTitleFont?: string | null;
  thankYouTextFont?: string | null;
  familyNamesFont?: string | null;
  invitationTextFont?: string | null;
  defaultMusicUrl?: string | null;
  defaultMusicTitle?: string | null;
  heroIllustrationUrl?: string | null;
  decorationImageUrl?: string | null;
  openingVideoUrl?: string | null;
  ambientVideoUrl?: string | null;
  envelopeInitialsXPercent?: number | null;
  envelopeInitialsYPercent?: number | null;
  ambientEffect?: string | null;
  envelopeStyle?: string | null;
  heroFrameStyle?: string | null;
  dateRevealStyle?: string | null;
  invitationCardStyle?: string | null;
  sceneLayoutStyle?: string | null;
  scenesJson?: string;
  // Which Envelope to assign, by id — null/empty clears the assignment.
  envelopeId?: string | null;
  isPopular: boolean;
  isActive: boolean;
}

// The admin-managed envelope-photo library (/admin/envelopes) — add a photo
// + seal position once, then assign it to any number of templates via
// TemplateWriteRequest.envelopeId instead of re-uploading/re-positioning
// per template.
// "flap": a flat diamond-cut envelope, opened by peeling its four corners
// back from the seal (PhotoWaxSealEnvelopeCover.tsx). "scroll": a rolled,
// string-tied letter, opened by unrolling it (ScrollUnrollEnvelopeCover.tsx).
// "doorSlide"/"doorFold": a photo split straight down the middle into two
// equal panels, independent of the seal position — "doorSlide" pulls each
// panel straight out sideways (DoorSlideEnvelopeCover.tsx), "doorFold"
// hinges each panel open in 3D like a real door swinging on its frame
// (DoorFoldEnvelopeCover.tsx). None of the four look alike physically, so
// each needs its own open animation.
export type EnvelopeOpeningStyle = "flap" | "scroll" | "doorSlide" | "doorFold";

// Only meaningful when openingStyle is "flap" — the single point (as a
// percentage of the photo's own width/height) where one fold line reaches
// the photo's edge. The other end of that fold is always the envelope's own
// seal, so it doesn't need storing here. A real envelope's flap layout
// varies photo to photo (one flap, two, four, an uneven mix, hinged at
// whatever edges are actually visible) — this is drawn per envelope by the
// admin (FoldLineDrawer.tsx) rather than picked from a fixed shape, and
// envelopeFlapGeometry.ts turns however many of these exist into correctly
// shaped, correctly hinged flaps. Empty/absent falls back to the classic
// four-symmetric-flaps model (still correct for a diamond-fold envelope
// where all four really do meet at a shared center point).
export interface EnvelopeFoldPoint {
  x: number;
  y: number;
}


// POST /api/templates/image response.
export interface TemplateImageUploadResponse {
  url: string;
}

export interface TemplateVideoUploadResponse {
  url: string;
}

export interface UserDto {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  phoneNumber?: string | null;
  isAdmin: boolean;
  // 1-based rank among non-admin users ordered by join date, oldest
  // first -- only meaningful on GET /api/users (the admin list); null for
  // admins (pinned to the top, unnumbered) and everywhere else this DTO
  // is reused (account/me, register, login).
  joinNumber?: number | null;
  // How far this account got, derived server-side from their own
  // Invitations/Orders -- only populated on GET /api/users.
  funnelStage?: "signed_up" | "created_invitation" | "reached_checkout" | "paid" | null;
  invitationCount?: number | null;
  lastActivityAt?: string | null;
  // Set once POST /api/users/send-engagement-emails has emailed this
  // never-ordered account; null if they haven't been contacted.
  engagementEmailSentAt?: string | null;
}

// PATCH /api/users/{id}/role — "Admin" to promote, null to demote back to a
// regular user (only one role currently exists, so this is a binary toggle).
export interface ChangeUserRoleRequest {
  role: "Admin" | null;
}

// GET /api/users/engagement-email-eligible-count and
// POST /api/users/send-engagement-emails share this response shape.
export interface SendEngagementEmailsResult {
  sentCount: number;
}

// Envelope shared by every paginated admin list endpoint (Orders/Partners/
// Reviews/Users) — page is 1-based, totalCount is the full match count
// (before the current page's slice) so the caller can compute total pages.
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Query params shared by every paginated admin list endpoint.
export interface PagedQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateInvitationRequest {
  templateId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  // Meta's own _fbc/_fbp browser cookies, forwarded so the server-side
  // Conversions API event can include them for better event match quality.
  fbc?: string;
  fbp?: string;
}

// PATCH /api/account/me — empty string clears the phone number.
export interface UpdateProfileRequest {
  phoneNumber?: string;
}

export interface InvitationDto {
  id: string;
  status: string;
  editUrl: string;
}

// POST /api/invitations/{id}/transfer-link
export interface InvitationTransferLinkDto {
  url: string;
}

// POST /api/invitations/claim-transfer
export interface ClaimInvitationTransferResponse {
  invitationId: string;
}

// Row shape for GET /api/invitations — the dashboard's bookings table.
export interface InvitationSummaryDto {
  id: string;
  bookingId: string;
  shareCode: string;
  status: string;
  isPaid: boolean;
  hasPendingOrder: boolean;
  createdAt: string;
  eventDateTime?: string | null;
  responseCount: number;
  galleryCount: number;
  firstName?: string | null;
  secondName?: string | null;
}

// GET/POST /api/support-messages — the "Contact Us" form and its admin inbox.
export interface SupportMessageDto {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  receivedAt: string;
  read: boolean;
}

export interface SupportMessageSubmissionRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Body for POST /api/invitations/{id}/rsvp — submitted by a guest, not the
// invitation's owner.
export interface RsvpSubmissionRequest {
  guestName: string;
  attending?: boolean | null;
  guestCount?: number | null;
  message?: string | null;
}

// Row shape for GET /api/invitations/{id}/rsvp — the owner's dashboard
// "Responses" modal (one row per guest submission), distinct from the
// guest-facing wishes feed which only surfaces the message text.
export interface ContactWhatsAppNumberDto {
  // ISO 3166-1 alpha-2 (e.g. "SA", "GB") — ContactUsView derives both the
  // flag emoji and the "WHATSAPP SA" label from this.
  countryCode: string;
  phoneNumber: string;
}

// GET /api/contact-settings — backs the public /contact-us page.
export interface ContactSettingsDto {
  email: string;
  secondaryEmail?: string | null;
  responseTimeText: string;
  availabilityText: string;
  availableWorldwide: boolean;
  instagramUrl?: string | null;
  tikTokUrl?: string | null;
  whatsAppNumbers: ContactWhatsAppNumberDto[];
}

// Payload for PUT /api/contact-settings (src/app/admin/settings).
export type ContactSettingsWriteRequest = ContactSettingsDto;

export interface RsvpResponseDto {
  id: string;
  guestName: string;
  attending?: boolean | null;
  guestCount?: number | null;
  message?: string | null;
  createdAt: string;
}

export interface CapturedPhotoDto {
  id: string;
  photoUrl: string;
  createdAt: string;
}

export interface CapturedPhotosPageDto {
  items: CapturedPhotoDto[];
  totalCount: number;
}

// GET /api/payment-settings (admin only) returns every configured
// PaymentAccountDto (one per country, plus the always-present "INTL"
// fallback); PUT /api/payment-settings/{countryCode} upserts one. Never
// carries a CVV/expiry.
export interface PaymentAccountDto {
  countryCode: string;
  recipientName: string;
  accountNumber: string;
  bankName?: string | null;
  iban?: string | null;
  instructions?: string | null;
}

export type PaymentAccountWriteRequest = Omit<PaymentAccountDto, "countryCode">;

// GET (public) / PUT (admin) /api/pricing-settings.
export interface PricingSettingsDto {
  basePriceUsd: number;
  qrRateUsd: number;
  giftFeePercent: number;
  defaultPartnerDiscountType: "percent" | "fixed";
  defaultPartnerDiscountValue: number;
  platformDiscountType: "percent" | "fixed";
  platformDiscountValue: number;
  platformDiscountCode: string;
  // The currency Home/Prices/checkout default to for a visitor who hasn't
  // picked one yet on their own device — see CurrencyContext.
  defaultCurrency: PublicCurrencyCode;
}

export type PricingSettingsWriteRequest = PricingSettingsDto;

export type PaymentStatus = "paid" | "pending" | "failed";

export interface OrderDto {
  id: string;
  invitationId: string;
  customerName: string;
  customerEmail: string;
  qrEnabled: boolean;
  qrGuestCount?: number | null;
  giftFeeCoverage: boolean;
  promoCodeUsed?: string | null;
  country?: string | null;
  amountUsd: number;
  currency: string;
  convertedAmount: number;
  paymentStatus: PaymentStatus;
  adminNote?: string | null;
  createdAt: string;
  paidAt?: string | null;
  reminderSentAt?: string | null;
  invitationEditUrl?: string | null;
  templateCode?: string | null;
}

// POST /api/orders — creates a pending order; the server computes the
// authoritative amountUsd itself (from PricingSettings + any promo code).
// currency/convertedAmount are only what the customer was shown, for the receipt.
export interface CreateOrderRequest {
  invitationId: string;
  customerName: string;
  customerEmail: string;
  enableQrEntry: boolean;
  qrGuestCount?: number | null;
  enableGifts: boolean;
  giftFeeCoverage: boolean;
  promoCode?: string | null;
  // The country/region the customer picked at checkout — resolves which
  // PaymentAccountDto they're shown, falling back to the "INTL" account
  // server-side when unset or unconfigured.
  country: string;
  currency: string;
  convertedAmount: number;
}

export interface OrderCreatedResponse {
  order: OrderDto;
  paymentSettings: PaymentAccountDto;
}

export interface UpdateOrderStatusRequest {
  status: "paid" | "failed";
  adminNote?: string | null;
}

// GET /api/orders/promo-code/{code} — discountType/discountValue are only
// meaningful when valid is true.
export interface PromoCodeCheckDto {
  valid: boolean;
  discountType?: "percent" | "fixed" | null;
  discountValue?: number | null;
}

export type PartnerCategory = "eventPlanner" | "photographer" | "designer" | "other";
export type PartnerStatus = "pending" | "approved" | "rejected";

// GET /api/partners (admin) — full shape for /admin/partners.
export interface PartnerDto {
  id: string;
  businessName: string;
  applicantName: string;
  email: string;
  category: PartnerCategory;
  country: string;
  countryFlag: string;
  whatsapp: string;
  tagline?: string | null;
  instagramUrl?: string | null;
  tikTokUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  status: PartnerStatus;
  active: boolean;
  promoCode?: string | null;
  usageCount: number;
  revenueUsd: number;
  discountType?: "percent" | "fixed" | null;
  discountValue?: number | null;
  submittedAt: string;
  approvedAt?: string | null;
}

// GET /api/partners/approved (public) — /OurPartners.
export interface ApprovedPartnerDto {
  id: string;
  name: string;
  category: PartnerCategory;
  country: string;
  countryFlag: string;
  tagline?: string | null;
  whatsapp: string;
  instagramUrl?: string | null;
  tikTokUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
}

// POST /api/partners — PartnerApplicationModal's submission.
export interface PartnerApplicationRequest {
  businessName: string;
  applicantName: string;
  email: string;
  category: PartnerCategory;
  country: string;
  countryFlag: string;
  whatsapp: string;
  tagline?: string | null;
  instagramUrl?: string | null;
  tikTokUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
}

// POST /api/partners/logo response.
export interface PartnerLogoUploadResponse {
  url: string;
}

export interface UpdatePartnerDiscountRequest {
  discountType: "percent" | "fixed";
  discountValue: number;
  promoCode?: string;
}

export interface ThankYouSuggestionDto {
  id: string;
  label: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ThankYouSuggestionWriteRequest {
  label: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
}

// POST /api/thank-you-suggestions/image response.
export interface ThankYouSuggestionImageUploadResponse {
  url: string;
}

// Admin-curated music tracks a customer can pick from in Step13Music's
// library, same role as ThankYouSuggestionDto above but for music — either
// a hosted audio file or a YouTube link (told apart at playback time by
// useMusicPlayer, not a stored flag).
export interface MusicSuggestionDto {
  id: string;
  title: string;
  artist?: string | null;
  url: string;
  isActive: boolean;
  sortOrder: number;
}

export interface MusicSuggestionWriteRequest {
  title: string;
  artist?: string | null;
  url: string;
  isActive: boolean;
  sortOrder: number;
}

// POST /api/music-suggestions/audio response.
export interface MusicSuggestionAudioUploadResponse {
  url: string;
}

// PUT /api/partners/me — the logged-in partner's own profile editor.
export interface UpdateMyPartnerProfileRequest {
  businessName: string;
  whatsapp: string;
  tagline?: string | null;
  instagramUrl?: string | null;
  tikTokUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewDto {
  id: string;
  rating: number;
  name: string;
  title?: string | null;
  body: string;
  country: string;
  countryFlag: string;
  submittedAt: string;
  status: ReviewStatus;
}

// POST /api/reviews — WriteReviewModal's submission.
export interface ReviewSubmissionRequest {
  rating: number;
  name: string;
  title?: string | null;
  body: string;
  country: string;
  countryFlag: string;
}
