using System.Linq.Expressions;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Numinds.Api.Data;
using Numinds.Api.Models;
using Numinds.Api.Models.Dtos;
using Numinds.Api.Models.Entities;
using Numinds.Api.Services;

namespace Numinds.Api.Controllers;

[ApiController]
[Route("api/invitations")]
public class InvitationsController(
    NumindsDbContext db,
    UserManager<ApplicationUser> userManager,
    IFileStorageService storage,
    IConfiguration configuration) : ControllerBase
{
    private string FrontendBaseUrl => configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";

    // Matches numinds.me's "5 invitation cards" cap. Applies to authenticated
    // users (by UserId) and anonymous guests alike (by the GuestId tracking
    // cookie set in GetOrCreateGuestId) — nobody gets an unlimited number of
    // drafts just by staying signed out.
    private const int MaxInvitationsPerUser = 5;
    private const string GuestCookieName = "numinds_guest_id";

    // A row gets created the instant the studio loads (see Create below),
    // before the visitor has entered anything — so merely opening /studio
    // and leaving would otherwise occupy a permanent, empty slot in both the
    // cap count and the dashboard list. Picking a template or filling in
    // step 4's basic info (name/title) is the first point that reflects
    // actual intent to build an invitation, not just a glance at the studio.
    private static readonly Expression<Func<Invitation, bool>> HasContent =
        i => i.TemplateId != null || !string.IsNullOrEmpty(i.EventTitle) || !string.IsNullOrEmpty(i.FirstName);

    // POST /api/invitations
    // Anonymous is allowed: the Hero "إنشاء دعوة" CTA can create a draft
    // before the user has an account. If a session cookie is present the
    // draft is associated with that user instead.
    [HttpPost]
    public async Task<ActionResult<InvitationDto>> Create(
        CreateInvitationRequest request,
        CancellationToken cancellationToken)
    {
        var templateId = await ResolveTemplateIdAsync(request.TemplateId, cancellationToken);
        if (templateId is null && !string.IsNullOrWhiteSpace(request.TemplateId))
        {
            return BadRequest(new { title = $"Unknown templateId '{request.TemplateId}'." });
        }

        var userId = await GetCurrentUserIdAsync();
        var guestId = userId is null ? GetOrCreateGuestId() : (Guid?)null;

        // The guest branch excludes already-claimed invitations (UserId set)
        // the same way GetMine below does -- GuestId is never cleared once a
        // draft is claimed (see OwnsInvitation), so a guest cookie that has
        // accumulated several claimed drafts over time would otherwise keep
        // counting all of them against this cap forever, long after they
        // stopped being "this guest's" drafts to count.
        var existingCount = userId is not null
            ? await db.Invitations.Where(i => i.UserId == userId).CountAsync(HasContent, cancellationToken)
            : await db.Invitations.Where(i => i.GuestId == guestId && i.UserId == null).CountAsync(HasContent, cancellationToken);
        if (existingCount >= MaxInvitationsPerUser)
        {
            return Conflict(new
            {
                title = $"You've reached the maximum of {MaxInvitationsPerUser} invitations. Delete one to create a new one.",
            });
        }

        var invitation = new Invitation
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            GuestId = guestId,
            TemplateId = templateId,
            Status = "draft",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.Invitations.Add(invitation);
        await db.SaveChangesAsync(cancellationToken);

        var dto = new InvitationDto
        {
            Id = invitation.Id.ToString(),
            Status = invitation.Status,
            EditUrl = $"/studio?invitationId={invitation.Id}",
        };

        return CreatedAtAction(nameof(GetById), new { id = invitation.Id }, dto);
    }

    // Once an order is placed, an invitation only becomes real — visible in
    // the dashboard, openable via its public link — once an admin has
    // reviewed the (out-of-band) payment and confirmed it. Before that, and
    // if the admin rejects it, it stays invisible everywhere except to its
    // own owner and to admins (see List/GetById below): functionally "not
    // created yet" without actually destroying whatever the guest designed,
    // in case the reject was a mistake or the guest still wants to pay.
    private static bool IsPubliclyVisible(Invitation invitation) => invitation.Status is "paid" or "shared";

    // GET /api/invitations
    // Lists the caller's own invitations for the dashboard's bookings table —
    // every status (not just admin-approved ones) that HasContent: this is
    // the owner's own management view (and the only place they can see/
    // delete a draft that's counting against MaxInvitationsPerUser above),
    // unlike the public guest-facing link, which IsPubliclyVisible/GetById
    // still gates to paid/shared only. Authenticated callers see their
    // invitations by UserId; anonymous callers see theirs by the GuestId
    // tracking cookie (read-only here — no cookie means no invitations yet,
    // so there's nothing to mint one for). A guest with neither a session
    // nor a cookie just gets [].
    [HttpGet]
    public async Task<ActionResult<List<InvitationSummaryDto>>> List(CancellationToken cancellationToken)
    {
        var userId = await GetCurrentUserIdAsync();
        var guestId = userId is null ? GetGuestIdFromCookie() : null;
        if (userId is null && guestId is null)
        {
            return Ok(new List<InvitationSummaryDto>());
        }

        var invitations = await db.Invitations
            .AsNoTracking()
            // GuestId is never cleared once an invitation is claimed (see
            // OwnsInvitation) — without the UserId == null check, the
            // anonymous browser that originally created a draft keeps
            // listing it here forever, even after it's since been claimed
            // by a real account elsewhere. Clicking into it then correctly
            // 403s (OwnsInvitation no longer matches by GuestId once
            // claimed), so the guest saw it listed but couldn't open it.
            .Where(i => userId != null ? i.UserId == userId : (i.GuestId == guestId && i.UserId == null))
            .Where(HasContent)
            .Include(i => i.Responses)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync(cancellationToken);

        var invitationIds = invitations.Select(i => i.Id).ToList();
        var pendingOrderInvitationIds = await db.Orders
            .Where(o => o.InvitationId != null && invitationIds.Contains(o.InvitationId.Value) && o.PaymentStatus == "pending")
            .Select(o => o.InvitationId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);
        var pendingOrderInvitationIdSet = pendingOrderInvitationIds.ToHashSet();

        var summaries = invitations
            .Select(invitation => new InvitationSummaryDto
            {
                Id = invitation.Id.ToString(),
                HasPendingOrder = pendingOrderInvitationIdSet.Contains(invitation.Id),
                // Derived from the invitation's own id (matches the admin
                // orders list's order.id.slice(0,8).toUpperCase() pattern) so
                // it's unique across every account, not just within this
                // caller's own list — the old "ND1001, ND1002..." scheme
                // recomputed a fresh index per request, so *every* customer's
                // first invitation showed as "ND1001", making the number
                // useless for identifying a specific invitation in support
                // conversations or the admin panel.
                BookingId = $"ND-{invitation.Id.ToString("N")[..8].ToUpper()}",
                Status = invitation.Status,
                IsPaid = invitation.Status is "paid" or "shared",
                CreatedAt = invitation.CreatedAt,
                EventDateTime = invitation.EventDateTime,
                ResponseCount = invitation.Responses.Count,
                GalleryCount = Deserialize<string>(invitation.GalleryImagesJson).Count,
                FirstName = invitation.FirstName,
                SecondName = invitation.SecondName,
            })
            .ToList();

        return Ok(summaries);
    }

    // GET /api/invitations/{id}
    // Used by three very different callers, which is why the gate below
    // isn't a blanket [Authorize]: the owner needs this while still
    // designing/reviewing in the studio (any status — it's their own
    // unfinished work), an admin needs it to preview before deciding
    // paid/rejected (any status — that's the whole point of reviewing it),
    // and everyone else is a guest opening the shared link, who should only
    // ever reach something the admin has actually approved.
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<InvitationDetailDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var invitation = await db.Invitations
            .AsNoTracking()
            .Include(i => i.Responses)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invitation is null)
        {
            return NotFound();
        }

        if (!IsPubliclyVisible(invitation))
        {
            var userId = await GetCurrentUserIdAsync();
            var isOwner = OwnsInvitation(invitation, userId);
            var isAdmin = User.IsInRole(Roles.Admin);
            if (!isOwner && !isAdmin)
            {
                return NotFound();
            }
        }

        return Ok(ToDetailDto(invitation));
    }

    // PUT /api/invitations/{id}
    // Patch semantics: only properties present (non-null) in the request
    // body are applied, so each wizard step can save just the fields it
    // owns without resending the whole accumulated invitation.
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<InvitationDetailDto>> Update(
        Guid id,
        UpdateInvitationRequest request,
        CancellationToken cancellationToken)
    {
        var invitation = await db.Invitations.Include(i => i.Responses).FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invitation is null)
        {
            return NotFound();
        }

        var userId = await GetCurrentUserIdAsync();
        var guestId = userId is null ? GetGuestIdFromCookie() : null;

        if (invitation.UserId is not null)
        {
            // Already claimed — only its owner may edit it. Admins can view
            // and approve/reject (via OrdersController.UpdateStatus) but must
            // never rewrite a user's own content — this is intentionally not
            // bypassed for Roles.Admin. Without this, the invitation's own id
            // (now handed out freely as the shareable public link) would
            // double as a write token: anyone who received the link could
            // PUT arbitrary changes — gift IBAN, event date, RSVP settings —
            // to someone else's already-approved invitation.
            if (invitation.UserId != userId)
            {
                return Forbid();
            }
        }
        else if (userId is null && invitation.GuestId != guestId)
        {
            // Still an anonymous draft: only the guest cookie that created
            // it may touch it. A signed-in caller is allowed through here
            // (see the claim below) since that's the studio's normal
            // login-at-payment-gate flow, but a random anonymous visitor
            // who merely knows/guesses the id is not.
            return Forbid();
        }

        // Claims anonymous drafts (UserId is null, e.g. started via the Hero
        // "إنشاء دعوة" CTA before signing in) the first time an authenticated
        // request touches them — in practice, the moment a guest logs in at
        // the studio's payment gate and its next autosave fires. Never
        // reassigns an already-claimed invitation to someone else.
        if (invitation.UserId is null)
        {
            invitation.UserId = userId;
        }

        var oldGalleryImagesJson = invitation.GalleryImagesJson;
        var oldThankYouImageUrl = invitation.ThankYouImageUrl;
        var oldGiftQrImageUrl = invitation.GiftQrImageUrl;

        if (request.TemplateId is not null)
        {
            var templateId = await ResolveTemplateIdAsync(request.TemplateId, cancellationToken);
            if (templateId is null)
            {
                return BadRequest(new { title = $"Unknown templateId '{request.TemplateId}'." });
            }
            invitation.TemplateId = templateId;
        }

        if (request.Status is not null) invitation.Status = request.Status;

        if (request.Language is not null) invitation.Language = request.Language;

        if (request.OccasionType is not null) invitation.OccasionType = request.OccasionType;
        if (request.IsCoupleEvent is not null) invitation.IsCoupleEvent = request.IsCoupleEvent.Value;

        if (request.EventTitle is not null) invitation.EventTitle = request.EventTitle;
        if (request.EventTitleFont is not null) invitation.EventTitleFont = request.EventTitleFont;
        if (request.EventTitleFontSize is not null) invitation.EventTitleFontSize = request.EventTitleFontSize;
        if (request.InvitationType is not null) invitation.InvitationType = request.InvitationType;
        if (request.FirstName is not null) invitation.FirstName = request.FirstName;
        if (request.SecondName is not null) invitation.SecondName = request.SecondName;
        if (request.NamesFont is not null) invitation.NamesFont = request.NamesFont;
        if (request.NamesFontSize is not null) invitation.NamesFontSize = request.NamesFontSize;
        if (request.NamesLayout is not null) invitation.NamesLayout = request.NamesLayout;
        if (request.UseNameImage is not null) invitation.UseNameImage = request.UseNameImage.Value;
        if (request.EventDateTime is not null)
        {
            // The studio's <input type="datetime-local"> sends a bare
            // "wall-clock" string with no offset (e.g. "2026-12-25T18:00"),
            // which System.Text.Json deserializes as Kind=Unspecified.
            // Npgsql refuses to write that to a `timestamptz` column
            // ("Cannot write DateTime with Kind=Unspecified..."), throwing
            // and failing SaveChangesAsync below — which silently discards
            // every *other* field in this same patch too (firstName,
            // eventTitle, everything), not just the date. SpecifyKind only
            // relabels the value as UTC without shifting the clock reading;
            // the guest's actual offset is already carried separately in
            // Timezone, exactly as it always was.
            invitation.EventDateTime = DateTime.SpecifyKind(request.EventDateTime.Value, DateTimeKind.Utc);
        }
        // Checked before the "set" branch below: switching from a time range
        // back to a single time sends ClearEventEndDateTime=true (see the
        // DTO's own comment for why a plain null can't signal this), and
        // that must win even though the studio also resends whatever stale
        // EventEndDateTime value is still sitting in its local form state.
        if (request.ClearEventEndDateTime == true)
        {
            invitation.EventEndDateTime = null;
        }
        else if (request.EventEndDateTime is not null)
        {
            // Same wall-clock-not-real-UTC handling as EventDateTime above.
            invitation.EventEndDateTime = DateTime.SpecifyKind(request.EventEndDateTime.Value, DateTimeKind.Utc);
        }
        if (request.Timezone is not null) invitation.Timezone = request.Timezone;
        if (request.UseHijriDate is not null) invitation.UseHijriDate = request.UseHijriDate.Value;
        if (request.ThankYouText is not null) invitation.ThankYouText = request.ThankYouText;
        if (request.ThankYouTextColor is not null) invitation.ThankYouTextColor = request.ThankYouTextColor;
        if (request.ThankYouTextFontSize is not null) invitation.ThankYouTextFontSize = request.ThankYouTextFontSize;
        if (request.ThankYouImageUrl is not null) invitation.ThankYouImageUrl = request.ThankYouImageUrl;

        if (request.HideFamilyNames is not null) invitation.HideFamilyNames = request.HideFamilyNames.Value;
        if (request.FamilyName1 is not null) invitation.FamilyName1 = request.FamilyName1;
        if (request.FamilyName2 is not null) invitation.FamilyName2 = request.FamilyName2;
        if (request.FamilyNamesFont is not null) invitation.FamilyNamesFont = request.FamilyNamesFont;
        if (request.FamilyNamesFontSize is not null) invitation.FamilyNamesFontSize = request.FamilyNamesFontSize;
        if (request.InvitationText is not null) invitation.InvitationText = request.InvitationText;
        if (request.InvitationTextFontSize is not null) invitation.InvitationTextFontSize = request.InvitationTextFontSize;

        if (request.Venues is not null) invitation.VenuesJson = JsonSerializer.Serialize(request.Venues);

        if (request.ShowEventProgram is not null) invitation.ShowEventProgram = request.ShowEventProgram.Value;
        if (request.ProgramItems is not null) invitation.ProgramItemsJson = JsonSerializer.Serialize(request.ProgramItems);

        if (request.ShowEventRules is not null) invitation.ShowEventRules = request.ShowEventRules.Value;
        if (request.EventRulesText is not null) invitation.EventRulesText = request.EventRulesText;

        if (request.ShowAccommodation is not null) invitation.ShowAccommodation = request.ShowAccommodation.Value;
        if (request.Accommodations is not null) invitation.AccommodationsJson = JsonSerializer.Serialize(request.Accommodations);

        if (request.GalleryImages is not null) invitation.GalleryImagesJson = JsonSerializer.Serialize(request.GalleryImages);

        if (request.ShowPersonalMessage is not null) invitation.ShowPersonalMessage = request.ShowPersonalMessage.Value;
        if (request.PersonalMessageTitle is not null) invitation.PersonalMessageTitle = request.PersonalMessageTitle;
        if (request.PersonalMessageText is not null) invitation.PersonalMessageText = request.PersonalMessageText;
        if (request.PersonalMessageSignature is not null) invitation.PersonalMessageSignature = request.PersonalMessageSignature;

        if (request.Contacts is not null) invitation.ContactsJson = JsonSerializer.Serialize(request.Contacts);

        if (request.MusicUrl is not null) invitation.MusicUrl = request.MusicUrl;
        if (request.MusicTitle is not null) invitation.MusicTitle = request.MusicTitle;

        if (request.EnableGifts is not null) invitation.EnableGifts = request.EnableGifts.Value;
        if (request.GiftIban is not null) invitation.GiftIban = request.GiftIban;
        if (request.GiftFeeCoverage is not null) invitation.GiftFeeCoverage = request.GiftFeeCoverage.Value;
        if (request.GiftMessage is not null) invitation.GiftMessage = request.GiftMessage;
        if (request.GiftBankTransferEnabled is not null) invitation.GiftBankTransferEnabled = request.GiftBankTransferEnabled.Value;
        if (request.GiftAccountHolderName is not null) invitation.GiftAccountHolderName = request.GiftAccountHolderName;
        if (request.GiftQrImageUrl is not null) invitation.GiftQrImageUrl = request.GiftQrImageUrl;
        if (request.GiftWishlistEnabled is not null) invitation.GiftWishlistEnabled = request.GiftWishlistEnabled.Value;
        if (request.GiftWishlistItems is not null) invitation.GiftWishlistItemsJson = JsonSerializer.Serialize(request.GiftWishlistItems);

        if (request.HideCameraButton is not null) invitation.HideCameraButton = request.HideCameraButton.Value;
        if (request.HideSaveButton is not null) invitation.HideSaveButton = request.HideSaveButton.Value;
        if (request.HideCapturedGallery is not null) invitation.HideCapturedGallery = request.HideCapturedGallery.Value;

        if (request.EnableQrEntry is not null) invitation.EnableQrEntry = request.EnableQrEntry.Value;
        if (request.QrGuestCount is not null) invitation.QrGuestCount = request.QrGuestCount;
        if (request.QrScannerCount is not null) invitation.QrScannerCount = request.QrScannerCount;
        // Same wall-clock-not-real-UTC handling as EventDateTime above.
        if (request.QrScanStart is not null)
        {
            invitation.QrScanStart = DateTime.SpecifyKind(request.QrScanStart.Value, DateTimeKind.Utc);
        }
        if (request.QrScanEnd is not null)
        {
            invitation.QrScanEnd = DateTime.SpecifyKind(request.QrScanEnd.Value, DateTimeKind.Utc);
        }

        if (request.EnableRsvp is not null) invitation.EnableRsvp = request.EnableRsvp.Value;
        if (request.RsvpShowAttendance is not null) invitation.RsvpShowAttendance = request.RsvpShowAttendance.Value;
        if (request.RsvpShowGuestCount is not null) invitation.RsvpShowGuestCount = request.RsvpShowGuestCount.Value;
        if (request.RsvpShowMessage is not null) invitation.RsvpShowMessage = request.RsvpShowMessage.Value;
        if (request.RsvpShowLiveCount is not null) invitation.RsvpShowLiveCount = request.RsvpShowLiveCount.Value;
        if (request.GuestLimit is not null) invitation.GuestLimit = request.GuestLimit;

        if (request.GeneralTextFont is not null) invitation.GeneralTextFont = request.GeneralTextFont;
        if (request.EnvelopeNameFont is not null) invitation.EnvelopeNameFont = request.EnvelopeNameFont;
        if (request.TextColor is not null) invitation.TextColor = request.TextColor;

        invitation.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);

        // Best-effort: an owner replacing/removing a photo here (gallery,
        // thank-you card, gift QR) leaves the old R2 object orphaned unless
        // cleaned up explicitly -- this runs constantly during editing
        // (unlike the admin-curated assets above), so it's the main source
        // of accumulated storage cost in practice.
        if (request.GalleryImages is not null)
        {
            var removedGalleryUrls = Deserialize<string>(oldGalleryImagesJson).Except(request.GalleryImages);
            foreach (var url in removedGalleryUrls)
            {
                await storage.DeleteAsync(url, cancellationToken);
            }
        }
        if (!string.IsNullOrWhiteSpace(oldThankYouImageUrl) && oldThankYouImageUrl != invitation.ThankYouImageUrl)
        {
            await storage.DeleteAsync(oldThankYouImageUrl, cancellationToken);
        }
        if (!string.IsNullOrWhiteSpace(oldGiftQrImageUrl) && oldGiftQrImageUrl != invitation.GiftQrImageUrl)
        {
            await storage.DeleteAsync(oldGiftQrImageUrl, cancellationToken);
        }

        return Ok(ToDetailDto(invitation));
    }

    // POST /api/invitations/{id}/transfer-link
    // Admin only, and only for an invitation an admin currently owns (see
    // the check below) -- this is specifically the "an admin designed this
    // on their own account for a customer who never signed up" escape
    // hatch, not a general reassignment tool for invitations customers
    // already own themselves. Generates a single-use, time-limited token;
    // ClaimTransfer below is what actually redeems it.
    [HttpPost("{id:guid}/transfer-link")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<InvitationTransferLinkDto>> CreateTransferLink(Guid id, CancellationToken cancellationToken)
    {
        var invitation = await db.Invitations.Include(i => i.User).FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invitation is null)
        {
            return NotFound();
        }

        if (invitation.User is null || !await userManager.IsInRoleAsync(invitation.User, Roles.Admin))
        {
            return BadRequest(new
            {
                title = "This invitation isn't owned by an admin account, so it can't be handed off this way.",
            });
        }

        invitation.TransferToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
        invitation.TransferTokenExpiresAt = DateTime.UtcNow.AddDays(7);
        await db.SaveChangesAsync(cancellationToken);

        return Ok(new InvitationTransferLinkDto
        {
            Url = $"{FrontendBaseUrl}/claim-invitation?token={invitation.TransferToken}",
        });
    }

    // POST /api/invitations/claim-transfer
    // Any authenticated user -- whoever is signed in when they redeem a
    // valid, unexpired token becomes the invitation's new owner. Looked up
    // by token alone (not also an id) since the token itself, not the
    // invitation id, is the only thing that needs to stay secret here.
    [HttpPost("claim-transfer")]
    [Authorize]
    public async Task<ActionResult<ClaimInvitationTransferResponse>> ClaimTransfer(
        ClaimInvitationTransferRequest request,
        CancellationToken cancellationToken)
    {
        var userId = await GetCurrentUserIdAsync();
        if (userId is null)
        {
            return Unauthorized();
        }

        var invitation = await db.Invitations.FirstOrDefaultAsync(
            i => i.TransferToken == request.Token, cancellationToken);
        if (invitation is null || invitation.TransferTokenExpiresAt is null || invitation.TransferTokenExpiresAt < DateTime.UtcNow)
        {
            return NotFound(new { title = "This handoff link is invalid or has expired." });
        }

        // GuestId is cleared too (unlike the normal claim-on-login path in
        // Update, which leaves it as a harmless breadcrumb) -- an
        // admin-created invitation's GuestId, if any, belongs to whoever
        // was browsing anonymously on the admin's machine, not to the
        // customer this is being handed off to.
        invitation.UserId = userId;
        invitation.GuestId = null;
        invitation.TransferToken = null;
        invitation.TransferTokenExpiresAt = null;
        await db.SaveChangesAsync(cancellationToken);

        return Ok(new ClaimInvitationTransferResponse { InvitationId = invitation.Id.ToString() });
    }

    // DELETE /api/invitations/{id}
    // Powers the dashboard's Delete action. Scoped to the caller's own
    // invitations (by UserId for a session, by GuestId cookie otherwise) —
    // same ownership rule Update enforces above, so one caller can't delete
    // (or edit) another's invitation.
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userId = await GetCurrentUserIdAsync();
        var invitation = await db.Invitations.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invitation is null)
        {
            return NotFound();
        }

        if (!OwnsInvitation(invitation, userId))
        {
            return Forbid();
        }

        // Grabbed before the delete: CapturedPhotos rows cascade-delete in
        // the DB (see NumindsDbContext), but that doesn't touch R2 -- their
        // URLs have to be collected here or they're unreachable afterward.
        var capturedPhotoUrls = await db.CapturedPhotos.AsNoTracking()
            .Where(p => p.InvitationId == id)
            .Select(p => p.PhotoUrl)
            .ToListAsync(cancellationToken);

        db.Invitations.Remove(invitation);
        await db.SaveChangesAsync(cancellationToken);

        // Best-effort, run concurrently: a popular event can have up to 300
        // captured photos (see MaxCapturedPhotosPerInvitation) plus a full
        // gallery, and deleting them one at a time here could make this
        // request take unreasonably long.
        var urlsToDelete = new List<string?>(Deserialize<string>(invitation.GalleryImagesJson));
        urlsToDelete.AddRange(capturedPhotoUrls);
        urlsToDelete.Add(invitation.ThankYouImageUrl);
        urlsToDelete.Add(invitation.GiftQrImageUrl);
        await Task.WhenAll(urlsToDelete
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Select(url => storage.DeleteAsync(url, cancellationToken)));

        return NoContent();
    }

    // POST /api/invitations/{id}/rsvp
    // Anonymous is allowed: this is submitted by a *guest* viewing the
    // published invitation (InteractiveRSVPModal.tsx), not by the owner.
    [HttpPost("{id:guid}/rsvp")]
    public async Task<IActionResult> SubmitRsvp(
        Guid id,
        RsvpSubmissionRequest request,
        CancellationToken cancellationToken)
    {
        var invitation = await db.Invitations
            .Include(i => i.Responses)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invitation is null)
        {
            return NotFound();
        }

        // Same "confirmed guests" counting as RsvpAttendingCount in
        // ToDetailDto below: Attending != false counts (an unasked/null
        // attendance is treated as attending), falling back to 1 per
        // response with no headcount of its own.
        var incomingCount = request.Attending != false ? request.GuestCount ?? 1 : 0;
        if (invitation.GuestLimit is { } limit && incomingCount > 0)
        {
            var currentCount = invitation.Responses
                .Where(r => r.Attending != false)
                .Sum(r => r.GuestCount ?? 1);
            if (currentCount + incomingCount > limit)
            {
                return Conflict(new { title = "This event has reached its guest limit." });
            }
        }

        db.RsvpResponses.Add(new RsvpResponse
        {
            Id = Guid.NewGuid(),
            InvitationId = id,
            GuestName = request.GuestName,
            Attending = request.Attending,
            GuestCount = request.GuestCount,
            Message = request.Message,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    // GET /api/invitations/{id}/rsvp
    // The owner's dashboard "Responses" modal — every individual guest
    // submission, newest first. Scoped to the caller's own invitation, same
    // as Delete below.
    [HttpGet("{id:guid}/rsvp")]
    public async Task<ActionResult<List<RsvpResponseDto>>> ListRsvpResponses(Guid id, CancellationToken cancellationToken)
    {
        var userId = await GetCurrentUserIdAsync();
        var invitation = await db.Invitations
            .AsNoTracking()
            .Include(i => i.Responses)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invitation is null)
        {
            return NotFound();
        }
        if (!OwnsInvitation(invitation, userId))
        {
            return Forbid();
        }

        var responses = invitation.Responses
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new RsvpResponseDto
            {
                Id = r.Id.ToString(),
                GuestName = r.GuestName,
                Attending = r.Attending,
                GuestCount = r.GuestCount,
                Message = r.Message,
                CreatedAt = r.CreatedAt,
            })
            .ToList();

        return Ok(responses);
    }

    // DELETE /api/invitations/{id}/rsvp/{responseId}
    // Lets the owner remove a single guest response (e.g. spam/test
    // submissions) from the dashboard modal without affecting the rest.
    [HttpDelete("{id:guid}/rsvp/{responseId:guid}")]
    public async Task<IActionResult> DeleteRsvpResponse(Guid id, Guid responseId, CancellationToken cancellationToken)
    {
        var userId = await GetCurrentUserIdAsync();
        var invitation = await db.Invitations.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invitation is null)
        {
            return NotFound();
        }
        if (!OwnsInvitation(invitation, userId))
        {
            return Forbid();
        }

        var response = await db.RsvpResponses.FirstOrDefaultAsync(
            r => r.Id == responseId && r.InvitationId == id, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        db.RsvpResponses.Remove(response);
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private const long MaxCapturedPhotoBytes = 8 * 1024 * 1024;
    private static readonly Dictionary<string, string> AllowedCapturedPhotoContentTypes = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
    };
    // Bounds worst-case R2 storage per invitation. Unlike every other upload
    // in this app (templates, envelopes, gallery photos), guest camera
    // captures have no admin curation and no fixed count picked by the
    // invitation's own owner — without a cap, one popular event could rack
    // up unbounded storage cost.
    private const int MaxCapturedPhotosPerInvitation = 300;

    // POST /api/invitations/{id}/captured-photos
    // Anonymous: a guest using the invitation's built-in camera
    // (CameraOverlay.tsx) uploads their shot here so the owner's dashboard
    // also gets a copy, independent of whatever the guest does with their
    // own local save (share sheet / long-press "Add to Photos"). Gated to
    // actually-live invitations (paid/shared) -- unlike SubmitRsvp above, a
    // draft/unpaid invitation shouldn't be able to accumulate real storage
    // cost from an endpoint nobody but its own designer could realistically
    // reach yet.
    [HttpPost("{id:guid}/captured-photos")]
    public async Task<ActionResult<CapturedPhotoDto>> UploadCapturedPhoto(
        Guid id,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var invitation = await db.Invitations.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invitation is null || !IsPubliclyVisible(invitation) || invitation.HideCameraButton)
        {
            return NotFound();
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }
        if (file.Length > MaxCapturedPhotoBytes)
        {
            return BadRequest(new { message = "Image must be 8MB or smaller." });
        }
        if (!AllowedCapturedPhotoContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            return BadRequest(new { message = "Image must be a JPG, PNG, or WebP file." });
        }

        var existingCount = await db.CapturedPhotos.CountAsync(p => p.InvitationId == id, cancellationToken);
        if (existingCount >= MaxCapturedPhotosPerInvitation)
        {
            return Conflict(new { title = $"This event has reached its limit of {MaxCapturedPhotosPerInvitation} captured photos." });
        }

        var url = await storage.UploadAsync(file, "captured-photos", extension, $"{Request.Scheme}://{Request.Host}", cancellationToken);

        var photo = new CapturedPhoto
        {
            Id = Guid.NewGuid(),
            InvitationId = id,
            PhotoUrl = url,
            CreatedAt = DateTime.UtcNow,
        };
        db.CapturedPhotos.Add(photo);
        await db.SaveChangesAsync(cancellationToken);

        return Ok(new CapturedPhotoDto { Id = photo.Id.ToString(), PhotoUrl = photo.PhotoUrl, CreatedAt = photo.CreatedAt });
    }

    // GET /api/invitations/{id}/captured-photos?page=1&pageSize=24
    // The owner's dashboard "Captured" tab -- paginated so an event with
    // hundreds of guest photos doesn't force-load them all into the modal
    // at once. Scoped to the caller's own invitation, same as ListRsvpResponses.
    [HttpGet("{id:guid}/captured-photos")]
    public async Task<ActionResult<CapturedPhotosPageDto>> ListCapturedPhotos(
        Guid id,
        [FromQuery] int page,
        [FromQuery] int pageSize,
        CancellationToken cancellationToken)
    {
        var userId = await GetCurrentUserIdAsync();
        var invitation = await db.Invitations.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invitation is null)
        {
            return NotFound();
        }
        if (!OwnsInvitation(invitation, userId))
        {
            return Forbid();
        }

        pageSize = pageSize <= 0 ? 24 : Math.Min(pageSize, 100);
        page = Math.Max(page, 1);

        var query = db.CapturedPhotos.AsNoTracking().Where(p => p.InvitationId == id);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new CapturedPhotoDto { Id = p.Id.ToString(), PhotoUrl = p.PhotoUrl, CreatedAt = p.CreatedAt })
            .ToListAsync(cancellationToken);

        return Ok(new CapturedPhotosPageDto { Items = items, TotalCount = totalCount });
    }

    // DELETE /api/invitations/{id}/captured-photos/{photoId}
    // Lets the owner remove an unwanted candid shot from the dashboard.
    [HttpDelete("{id:guid}/captured-photos/{photoId:guid}")]
    public async Task<IActionResult> DeleteCapturedPhoto(Guid id, Guid photoId, CancellationToken cancellationToken)
    {
        var userId = await GetCurrentUserIdAsync();
        var invitation = await db.Invitations.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invitation is null)
        {
            return NotFound();
        }
        if (!OwnsInvitation(invitation, userId))
        {
            return Forbid();
        }

        var photo = await db.CapturedPhotos.FirstOrDefaultAsync(p => p.Id == photoId && p.InvitationId == id, cancellationToken);
        if (photo is null)
        {
            return NotFound();
        }

        db.CapturedPhotos.Remove(photo);
        await db.SaveChangesAsync(cancellationToken);

        await storage.DeleteAsync(photo.PhotoUrl, cancellationToken);

        return NoContent();
    }

    private async Task<Guid?> ResolveTemplateIdAsync(string? templateId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(templateId)) return null;
        if (!Guid.TryParse(templateId, out var parsed)) return null;

        var exists = await db.Templates.AnyAsync(t => t.Id == parsed, cancellationToken);
        return exists ? parsed : null;
    }

    private async Task<Guid?> GetCurrentUserIdAsync()
    {
        if (User.Identity?.IsAuthenticated != true) return null;
        var user = await userManager.GetUserAsync(User);
        return user?.Id;
    }

    // Read-only lookup of the anonymous tracking cookie — used by List/
    // Delete/rsvp endpoints, which should never mint a cookie for a guest
    // who's never created anything.
    private Guid? GetGuestIdFromCookie() =>
        Guid.TryParse(Request.Cookies[GuestCookieName], out var existing) ? existing : null;

    // Reads the anonymous tracking cookie if present, otherwise mints one
    // and writes it to the response. Same SameSite/Secure policy as the
    // Identity auth cookie (see Program.cs) so it survives the same
    // localhost-cross-port and production cross-subdomain setups.
    private Guid GetOrCreateGuestId()
    {
        if (GetGuestIdFromCookie() is { } existing)
        {
            return existing;
        }

        var guestId = Guid.NewGuid();
        Response.Cookies.Append(GuestCookieName, guestId.ToString(), new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = Request.IsHttps,
            Expires = DateTimeOffset.UtcNow.AddYears(1),
        });
        return guestId;
    }

    // A caller owns an invitation if it matches their UserId (once claimed),
    // or — still unclaimed — their GuestId cookie, checked regardless of
    // whether they're now also signed in. That second branch matters for
    // exactly one real sequence: a guest starts a draft, then logs in (e.g.
    // at the payment gate) before its first authenticated PUT has claimed it
    // for their UserId. Without it, the studio's very first GET right after
    // that login — now authenticated, UserId still doesn't match anything —
    // would 404 on the caller's own draft. GetGuestIdFromCookie is read
    // directly here rather than passed in, specifically so it's never
    // suppressed just because the caller happens to be authenticated.
    private bool OwnsInvitation(Invitation invitation, Guid? userId) =>
        (userId is not null && invitation.UserId == userId) ||
        (invitation.UserId is null && GetGuestIdFromCookie() is { } guestId && invitation.GuestId == guestId);

    // Tolerant on purpose: a *Json column added via migration to a table
    // that already has rows (see GiftWishlistItemsJson) backfills as an
    // empty string, not "[]" — JsonSerializer throws on that, which would
    // otherwise 500 every GET for every invitation that predates the
    // migration.
    private static List<T> Deserialize<T>(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<T>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static InvitationDetailDto ToDetailDto(Invitation invitation) => new()
    {
        Id = invitation.Id.ToString(),
        Status = invitation.Status,
        EditUrl = $"/studio?invitationId={invitation.Id}",
        TemplateId = invitation.TemplateId?.ToString(),
        CreatedAt = invitation.CreatedAt,
        UpdatedAt = invitation.UpdatedAt,

        Language = invitation.Language,

        OccasionType = invitation.OccasionType,
        IsCoupleEvent = invitation.IsCoupleEvent,

        EventTitle = invitation.EventTitle,
        EventTitleFont = invitation.EventTitleFont,
        EventTitleFontSize = invitation.EventTitleFontSize,
        InvitationType = invitation.InvitationType,
        FirstName = invitation.FirstName,
        SecondName = invitation.SecondName,
        NamesFont = invitation.NamesFont,
        NamesFontSize = invitation.NamesFontSize,
        NamesLayout = invitation.NamesLayout,
        UseNameImage = invitation.UseNameImage,
        EventDateTime = invitation.EventDateTime,
        EventEndDateTime = invitation.EventEndDateTime,
        Timezone = invitation.Timezone,
        UseHijriDate = invitation.UseHijriDate,
        ThankYouText = invitation.ThankYouText,
        ThankYouTextColor = invitation.ThankYouTextColor,
        ThankYouTextFontSize = invitation.ThankYouTextFontSize,
        ThankYouImageUrl = invitation.ThankYouImageUrl,

        HideFamilyNames = invitation.HideFamilyNames,
        FamilyName1 = invitation.FamilyName1,
        FamilyName2 = invitation.FamilyName2,
        FamilyNamesFont = invitation.FamilyNamesFont,
        FamilyNamesFontSize = invitation.FamilyNamesFontSize,
        InvitationText = invitation.InvitationText,
        InvitationTextFontSize = invitation.InvitationTextFontSize,

        Venues = Deserialize<VenueItemDto>(invitation.VenuesJson),

        ShowEventProgram = invitation.ShowEventProgram,
        ProgramItems = Deserialize<ProgramItemDto>(invitation.ProgramItemsJson),

        ShowEventRules = invitation.ShowEventRules,
        EventRulesText = invitation.EventRulesText,

        ShowAccommodation = invitation.ShowAccommodation,
        Accommodations = Deserialize<VenueItemDto>(invitation.AccommodationsJson),

        GalleryImages = Deserialize<string>(invitation.GalleryImagesJson),

        ShowPersonalMessage = invitation.ShowPersonalMessage,
        PersonalMessageTitle = invitation.PersonalMessageTitle,
        PersonalMessageText = invitation.PersonalMessageText,
        PersonalMessageSignature = invitation.PersonalMessageSignature,

        Contacts = Deserialize<ContactItemDto>(invitation.ContactsJson),

        MusicUrl = invitation.MusicUrl,
        MusicTitle = invitation.MusicTitle,

        EnableGifts = invitation.EnableGifts,
        GiftIban = invitation.GiftIban,
        GiftFeeCoverage = invitation.GiftFeeCoverage,
        GiftMessage = invitation.GiftMessage,
        GiftBankTransferEnabled = invitation.GiftBankTransferEnabled,
        GiftAccountHolderName = invitation.GiftAccountHolderName,
        GiftQrImageUrl = invitation.GiftQrImageUrl,
        GiftWishlistEnabled = invitation.GiftWishlistEnabled,
        GiftWishlistItems = Deserialize<WishlistItemDto>(invitation.GiftWishlistItemsJson),

        HideCameraButton = invitation.HideCameraButton,
        HideSaveButton = invitation.HideSaveButton,
        HideCapturedGallery = invitation.HideCapturedGallery,

        EnableQrEntry = invitation.EnableQrEntry,
        QrGuestCount = invitation.QrGuestCount,
        QrScannerCount = invitation.QrScannerCount,
        QrScanStart = invitation.QrScanStart,
        QrScanEnd = invitation.QrScanEnd,

        EnableRsvp = invitation.EnableRsvp,
        RsvpShowAttendance = invitation.RsvpShowAttendance,
        RsvpShowGuestCount = invitation.RsvpShowGuestCount,
        RsvpShowMessage = invitation.RsvpShowMessage,
        RsvpShowLiveCount = invitation.RsvpShowLiveCount,
        GuestLimit = invitation.GuestLimit,

        // Sum of confirmed guests (falling back to 1 per response with no
        // headcount of their own) rather than a raw response count, so a
        // family of four who RSVP once still counts as four attendees.
        RsvpAttendingCount = invitation.Responses
            .Where(r => r.Attending != false)
            .Sum(r => r.GuestCount ?? 1),
        RsvpWishes = invitation.Responses
            .Where(r => !string.IsNullOrWhiteSpace(r.Message))
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => r.Message!)
            .ToList(),

        GeneralTextFont = invitation.GeneralTextFont,
        EnvelopeNameFont = invitation.EnvelopeNameFont,
        TextColor = invitation.TextColor,
    };
}
