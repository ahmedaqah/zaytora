using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Numinds.Api.Data;
using Numinds.Api.Models.Dtos;
using Numinds.Api.Models.Entities;

namespace Numinds.Api.Controllers;

// QR guest entry. Every guest's invitation shows the same QR (it encodes the
// invitation's public share link); the owner hands scanner links to door
// staff, who open one on their phone (no account), scan a guest's QR, type
// the guest's name and confirm. Warnings (already checked in, over the paid
// guest count, outside the scan window) never block -- they only ask the
// door person to confirm.
[ApiController]
public class QrEntryController(
    NumindsDbContext db,
    UserManager<ApplicationUser> userManager) : ControllerBase
{
    private const string GuestCookieName = "numinds_guest_id";
    private const int MaxScannersCap = 4;
    private const int MaxPartySize = 50;

    // ---- Owner (dashboard) -------------------------------------------------

    // GET /api/invitations/{id}/qr
    [HttpGet("api/invitations/{id:guid}/qr")]
    public async Task<ActionResult<QrEntryStateDto>> GetState(Guid id, CancellationToken cancellationToken)
    {
        var (invitation, error) = await LoadOwnedAsync(id, cancellationToken);
        if (invitation is null) return error!;

        var scanners = await db.QrScanners
            .AsNoTracking()
            .Where(s => s.InvitationId == id)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync(cancellationToken);
        var checkins = await db.QrCheckins
            .AsNoTracking()
            .Where(c => c.InvitationId == id)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(new QrEntryStateDto
        {
            Enabled = invitation.EnableQrEntry,
            GuestCount = invitation.QrGuestCount,
            ScannerLimit = ScannerLimit(invitation),
            ScanStart = invitation.QrScanStart,
            ScanEnd = invitation.QrScanEnd,
            ShareCode = invitation.ShareCode,
            TotalPeople = checkins.Sum(c => c.PartySize),
            Scanners = scanners.Select(s => ToDto(s)).ToList(),
            Checkins = checkins.Select(c => ToDto(c)).ToList(),
        });
    }

    // POST /api/invitations/{id}/qr/scanners
    [HttpPost("api/invitations/{id:guid}/qr/scanners")]
    public async Task<ActionResult<QrScannerDto>> CreateScanner(
        Guid id,
        CreateQrScannerRequest request,
        CancellationToken cancellationToken)
    {
        var (invitation, error) = await LoadOwnedAsync(id, cancellationToken);
        if (invitation is null) return error!;
        if (!invitation.EnableQrEntry)
        {
            return BadRequest(new { message = "QR guest entry is not enabled for this invitation." });
        }

        var active = await db.QrScanners.CountAsync(s => s.InvitationId == id && s.RevokedAt == null, cancellationToken);
        var limit = ScannerLimit(invitation);
        if (active >= limit)
        {
            return BadRequest(new { message = $"Scanner limit reached ({limit})." });
        }

        var label = (request.Label ?? string.Empty).Trim();
        if (label.Length == 0) label = $"Scanner {active + 1}";
        if (label.Length > 80) label = label[..80];

        var scanner = new QrScanner
        {
            Id = Guid.NewGuid(),
            InvitationId = id,
            Label = label,
            Token = NewToken(),
            CreatedAt = DateTime.UtcNow,
        };
        db.QrScanners.Add(scanner);
        await db.SaveChangesAsync(cancellationToken);

        return Ok(ToDto(scanner));
    }

    // DELETE /api/invitations/{id}/qr/scanners/{scannerId}
    // Revokes (the link stops working at once) rather than deleting, so the
    // check-in history keeps its scanner label.
    [HttpDelete("api/invitations/{id:guid}/qr/scanners/{scannerId:guid}")]
    public async Task<IActionResult> RevokeScanner(Guid id, Guid scannerId, CancellationToken cancellationToken)
    {
        var (invitation, error) = await LoadOwnedAsync(id, cancellationToken);
        if (invitation is null) return error!;

        var scanner = await db.QrScanners.FirstOrDefaultAsync(
            s => s.Id == scannerId && s.InvitationId == id, cancellationToken);
        if (scanner is null) return NotFound();

        if (scanner.RevokedAt is null)
        {
            scanner.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
        return NoContent();
    }

    // DELETE /api/invitations/{id}/qr/checkins/{checkinId}
    // For a mistyped or duplicated entry.
    [HttpDelete("api/invitations/{id:guid}/qr/checkins/{checkinId:guid}")]
    public async Task<IActionResult> DeleteCheckin(Guid id, Guid checkinId, CancellationToken cancellationToken)
    {
        var (invitation, error) = await LoadOwnedAsync(id, cancellationToken);
        if (invitation is null) return error!;

        var checkin = await db.QrCheckins.FirstOrDefaultAsync(
            c => c.Id == checkinId && c.InvitationId == id, cancellationToken);
        if (checkin is null) return NotFound();

        db.QrCheckins.Remove(checkin);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    // ---- Scanner (public page, authorised only by the link's token) --------

    // GET /api/qr-scan/{token}
    [HttpGet("api/qr-scan/{token}")]
    public async Task<ActionResult<QrScanInfoDto>> ScanInfo(string token, CancellationToken cancellationToken)
    {
        var (scanner, invitation) = await LoadScannerAsync(token, cancellationToken);
        if (scanner is null || invitation is null) return NotFound();

        var total = await db.QrCheckins
            .Where(c => c.InvitationId == invitation.Id)
            .SumAsync(c => (int?)c.PartySize, cancellationToken) ?? 0;

        return Ok(new QrScanInfoDto
        {
            Names = DisplayNames(invitation),
            ScannerLabel = scanner.Label,
            ShareCode = invitation.ShareCode,
            GuestCount = invitation.QrGuestCount,
            TotalPeople = total,
            ScanStart = invitation.QrScanStart,
            ScanEnd = invitation.QrScanEnd,
            WindowOpen = IsWindowOpen(invitation),
        });
    }

    // POST /api/qr-scan/{token}/checkins
    [HttpPost("api/qr-scan/{token}/checkins")]
    public async Task<ActionResult<QrCheckinResultDto>> CheckIn(
        string token,
        QrCheckinRequest request,
        CancellationToken cancellationToken)
    {
        var (scanner, invitation) = await LoadScannerAsync(token, cancellationToken);
        if (scanner is null || invitation is null) return NotFound();

        // The scanned QR must be this event's own QR.
        if (string.IsNullOrEmpty(invitation.ShareCode) ||
            !string.Equals(request.ShareCode?.Trim(), invitation.ShareCode, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "invalid_qr" });
        }

        var name = (request.GuestName ?? string.Empty).Trim();
        if (name.Length == 0)
        {
            return BadRequest(new { message = "name_required" });
        }
        if (name.Length > 128) name = name[..128];
        var party = Math.Clamp(request.PartySize ?? 1, 1, MaxPartySize);

        var existing = await db.QrCheckins
            .AsNoTracking()
            .Where(c => c.InvitationId == invitation.Id)
            .Select(c => new { c.GuestName, c.PartySize })
            .ToListAsync(cancellationToken);
        var total = existing.Sum(c => c.PartySize);

        var warnings = new List<string>();
        if (existing.Any(c => string.Equals(c.GuestName, name, StringComparison.OrdinalIgnoreCase)))
        {
            warnings.Add("duplicate");
        }
        if (invitation.QrGuestCount is { } limit && total + party > limit)
        {
            warnings.Add("over_capacity");
        }
        if (IsWindowOpen(invitation) == false)
        {
            warnings.Add("outside_window");
        }

        if (warnings.Count > 0 && !request.Confirm)
        {
            return Ok(new QrCheckinResultDto { Recorded = false, Warnings = warnings, TotalPeople = total });
        }

        var checkin = new QrCheckin
        {
            Id = Guid.NewGuid(),
            InvitationId = invitation.Id,
            ScannerId = scanner.Id,
            ScannerLabel = scanner.Label,
            GuestName = name,
            PartySize = party,
            CreatedAt = DateTime.UtcNow,
        };
        db.QrCheckins.Add(checkin);
        await db.SaveChangesAsync(cancellationToken);

        return Ok(new QrCheckinResultDto
        {
            Recorded = true,
            Warnings = warnings,
            TotalPeople = total + party,
            Checkin = ToDto(checkin),
        });
    }

    // ---- helpers -----------------------------------------------------------

    private async Task<(Invitation? Invitation, ActionResult? Error)> LoadOwnedAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        Guid? userId = null;
        if (User.Identity?.IsAuthenticated == true)
        {
            var user = await userManager.GetUserAsync(User);
            userId = user?.Id;
        }

        var invitation = await db.Invitations.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invitation is null) return (null, NotFound());

        // Same ownership rule as InvitationsController.OwnsInvitation.
        var owns =
            User.IsInRole(Numinds.Api.Models.Roles.Admin) ||
            (userId is not null && invitation.UserId == userId) ||
            (invitation.UserId is null &&
             Guid.TryParse(Request.Cookies[GuestCookieName], out var guestId) &&
             invitation.GuestId == guestId);
        if (!owns) return (null, Forbid());

        return (invitation, null);
    }

    private async Task<(QrScanner? Scanner, Invitation? Invitation)> LoadScannerAsync(
        string token,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 64) return (null, null);

        var scanner = await db.QrScanners
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Token == token && s.RevokedAt == null, cancellationToken);
        if (scanner is null) return (null, null);

        var invitation = await db.Invitations
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == scanner.InvitationId, cancellationToken);
        if (invitation is null || !invitation.EnableQrEntry) return (null, null);

        return (scanner, invitation);
    }

    private static int ScannerLimit(Invitation invitation) =>
        Math.Clamp(invitation.QrScannerCount ?? 1, 1, MaxScannersCap);

    // 24 URL-safe characters from 18 random bytes (144 bits).
    private static string NewToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(18))
            .Replace('+', '-')
            .Replace('/', '_');

    private static string DisplayNames(Invitation invitation)
    {
        var names = new[] { invitation.FirstName, invitation.SecondName }
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .ToList();
        if (names.Count > 0) return string.Join(" & ", names);
        return invitation.EventTitle ?? string.Empty;
    }

    // QrScanStart/QrScanEnd are wall-clock readings in the invitation's own
    // timezone (see Invitation.QrScanStart), so "now" is converted to that
    // timezone before comparing. Returns null (no warning) when no window is
    // set or the timezone isn't known on this server.
    private static bool? IsWindowOpen(Invitation invitation)
    {
        if (invitation.QrScanStart is null && invitation.QrScanEnd is null) return null;

        DateTime now;
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(invitation.Timezone ?? string.Empty);
            now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        }
        catch (Exception)
        {
            return null;
        }

        if (invitation.QrScanStart is { } start && now < start) return false;
        if (invitation.QrScanEnd is { } end && now > end) return false;
        return true;
    }

    private static QrScannerDto ToDto(QrScanner s) => new()
    {
        Id = s.Id.ToString(),
        Label = s.Label,
        Token = s.Token,
        CreatedAt = s.CreatedAt,
        RevokedAt = s.RevokedAt,
    };

    private static QrCheckinDto ToDto(QrCheckin c) => new()
    {
        Id = c.Id.ToString(),
        GuestName = c.GuestName,
        PartySize = c.PartySize,
        ScannerLabel = c.ScannerLabel,
        CreatedAt = c.CreatedAt,
    };
}
