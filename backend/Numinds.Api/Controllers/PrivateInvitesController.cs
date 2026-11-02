using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Numinds.Api.Data;
using Numinds.Api.Models;
using Numinds.Api.Models.Dtos;
using Numinds.Api.Models.Entities;
using Numinds.Api.Services;

namespace Numinds.Api.Controllers;

// Admin-built private invitations (see /admin/invite-builder). Listing, saving and
// deleting are admin-only; reading one by slug is public because the Next.js page at
// /invites/p/<slug> fetches it server-side to render the invitation for guests. The
// slug is unguessable-by-convention, not secret: invitations stay unlisted
// (noindex, robots-disallowed, never linked from the site).
[ApiController]
[Route("api/private-invites")]
public partial class PrivateInvitesController(
    NumindsDbContext db,
    IFileStorageService storage,
    Microsoft.AspNetCore.Identity.UserManager<ApplicationUser> userManager,
    IConfiguration configuration) : ControllerBase
{
    private const long MaxMediaBytes = 30 * 1024 * 1024;
    private const int MaxConfigChars = 200_000;
    private const string MediaFolder = "private-invites";

    private static readonly Dictionary<string, string> AllowedMediaContentTypes = new()
    {
        ["image/png"] = ".png",
        ["image/jpeg"] = ".jpg",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif",
        ["font/woff2"] = ".woff2",
        ["font/woff"] = ".woff",
        ["font/ttf"] = ".ttf",
        ["font/otf"] = ".otf",
        ["video/mp4"] = ".mp4",
        ["video/webm"] = ".webm",
        ["audio/mpeg"] = ".mp3",
        ["audio/mp3"] = ".mp3",
        ["audio/mp4"] = ".m4a",
        ["audio/aac"] = ".aac",
        ["audio/ogg"] = ".ogg",
        ["audio/wav"] = ".wav",
        // The page of an imported finished invitation (config.kind == "custom-html"). Admin-only upload;
        // the Next.js route fetches it server-side and serves it under /invites/p/<slug>.
        ["text/html"] = ".html",
    };

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{1,39}$")]
    private static partial Regex SlugPattern();

    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IEnumerable<PrivateInviteDto>>> GetAll(CancellationToken cancellationToken)
    {
        var rows = await db.PrivateInvites.AsNoTracking()
            .Include(i => i.Owner)
            .OrderByDescending(i => i.UpdatedAt)
            .ToListAsync(cancellationToken);
        // The owner's e-mail is shown to admins only (GetBySlug below is public and never sets it).
        return Ok(rows.Select(r =>
        {
            var dto = ToDto(r);
            dto.OwnerEmail = r.Owner?.Email;
            return dto;
        }));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<PrivateInviteDto>> GetBySlug(string slug, CancellationToken cancellationToken)
    {
        var row = await db.PrivateInvites.AsNoTracking().FirstOrDefaultAsync(i => i.Slug == slug, cancellationToken);
        if (row is null)
        {
            return NotFound(new { message = "Invitation not found." });
        }
        return Ok(ToDto(row));
    }

    // PUT creates the invitation if the slug is new, otherwise replaces it.
    [HttpPut("{slug}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PrivateInviteDto>> Save(
        string slug,
        [FromBody] PrivateInviteWriteRequest request,
        CancellationToken cancellationToken)
    {
        if (!SlugPattern().IsMatch(slug) || slug == "media" || slug == "mine")
        {
            return BadRequest(new { message = "Slug must be 2-40 characters: lowercase English letters, digits and hyphens." });
        }
        if (request.Config.ValueKind != JsonValueKind.Object)
        {
            return BadRequest(new { message = "Config must be a JSON object." });
        }

        var configJson = request.Config.GetRawText();
        if (configJson.Length > MaxConfigChars)
        {
            return BadRequest(new { message = "Invitation content is too large." });
        }

        var title = string.IsNullOrWhiteSpace(request.Title) ? slug : request.Title.Trim();
        if (title.Length > 200)
        {
            title = title[..200];
        }

        var now = DateTime.UtcNow;
        var row = await db.PrivateInvites.FirstOrDefaultAsync(i => i.Slug == slug, cancellationToken);
        if (row is null)
        {
            row = new PrivateInvite { Id = Guid.NewGuid(), Slug = slug, CreatedAt = now };
            db.PrivateInvites.Add(row);
        }
        row.Title = title;
        row.ConfigJson = configJson;
        row.UpdatedAt = now;

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(row));
    }

    [HttpDelete("{slug}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(string slug, CancellationToken cancellationToken)
    {
        var row = await db.PrivateInvites.FirstOrDefaultAsync(i => i.Slug == slug, cancellationToken);
        if (row is null)
        {
            return NotFound(new { message = "Invitation not found." });
        }

        var urls = CollectUploadedUrls(row.ConfigJson);
        db.PrivateInvites.Remove(row);
        await db.SaveChangesAsync(cancellationToken);

        foreach (var url in urls)
        {
            await storage.DeleteAsync(url, cancellationToken);
        }
        return NoContent();
    }

    // Uploads one image/video/audio file used by an invitation and returns its public URL.
    [HttpPost("media")]
    [Authorize(Roles = Roles.Admin)]
    [RequestSizeLimit(MaxMediaBytes + 1024 * 1024)]
    public async Task<ActionResult<PrivateInviteMediaUploadResponse>> UploadMedia(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }
        if (file.Length > MaxMediaBytes)
        {
            return BadRequest(new { message = "File must be 30MB or smaller." });
        }
        if (!AllowedMediaContentTypes.TryGetValue(file.ContentType.ToLowerInvariant(), out var extension))
        {
            return BadRequest(new { message = "Unsupported file type. Use JPG/PNG/WebP/GIF, MP4/WebM, MP3/M4A, WOFF2/TTF/OTF fonts or HTML." });
        }

        var url = await storage.UploadAsync(file, MediaFolder, extension, $"{Request.Scheme}://{Request.Host}", cancellationToken);
        return Ok(new PrivateInviteMediaUploadResponse { Url = url });
    }

    // Deletes one file previously uploaded through POST media (for example the old music after it was
    // replaced). Only URLs inside this controller's own folder are accepted, and DeleteAsync itself
    // ignores anything that is not an R2-hosted file.
    [HttpDelete("media")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DeleteMedia([FromQuery] string url, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(url) || !url.Contains($"/{MediaFolder}/", StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Not an invitation media URL." });
        }

        await storage.DeleteAsync(url, cancellationToken);
        return NoContent();
    }

    // Only files this controller uploaded (their URL contains /private-invites/) are ever
    // deleted with an invitation; the shared template media is never touched.
    private static List<string> CollectUploadedUrls(string configJson)
    {
        var urls = new List<string>();
        try
        {
            using var doc = JsonDocument.Parse(configJson);
            if (doc.RootElement.TryGetProperty("media", out var media) && media.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in media.EnumerateObject())
                {
                    AddIfUploaded(urls, prop.Value);
                }
            }
            if (doc.RootElement.TryGetProperty("ogImage", out var og))
            {
                AddIfUploaded(urls, og);
            }
            if (doc.RootElement.TryGetProperty("royal", out var royal) && royal.ValueKind == JsonValueKind.Object
                && royal.TryGetProperty("customFonts", out var fonts) && fonts.ValueKind == JsonValueKind.Array)
            {
                foreach (var font in fonts.EnumerateArray())
                {
                    if (font.ValueKind == JsonValueKind.Object && font.TryGetProperty("src", out var fontSrc))
                    {
                        AddIfUploaded(urls, fontSrc);
                    }
                }
            }
            // Uploaded papers: the main one (royal.customPaper) and any extra ones (royal.paperSets), each cut into three pictures.
            if (doc.RootElement.TryGetProperty("royal", out var royalPapers) && royalPapers.ValueKind == JsonValueKind.Object)
            {
                if (royalPapers.TryGetProperty("customPaper", out var mainPaper))
                {
                    AddPaperPieces(urls, mainPaper);
                }
                if (royalPapers.TryGetProperty("paperSets", out var paperSets) && paperSets.ValueKind == JsonValueKind.Array)
                {
                    foreach (var set in paperSets.EnumerateArray())
                    {
                        AddPaperPieces(urls, set);
                    }
                }
            }
            if (doc.RootElement.TryGetProperty("schedule", out var scheduleCfg) && scheduleCfg.ValueKind == JsonValueKind.Object
                && scheduleCfg.TryGetProperty("roseImg", out var roseImg))
            {
                AddIfUploaded(urls, roseImg);
            }
            if (doc.RootElement.TryGetProperty("stickers", out var stickers) && stickers.ValueKind == JsonValueKind.Array)
            {
                foreach (var sticker in stickers.EnumerateArray())
                {
                    if (sticker.ValueKind == JsonValueKind.Object && sticker.TryGetProperty("src", out var src))
                    {
                        AddIfUploaded(urls, src);
                    }
                }
            }
        }
        catch (JsonException)
        {
            // Malformed stored config: nothing to clean up.
        }
        return urls;
    }

    private static void AddPaperPieces(List<string> urls, JsonElement paper)
    {
        if (paper.ValueKind != JsonValueKind.Object) return;
        foreach (var key in new[] { "top", "mid", "bot" })
        {
            if (paper.TryGetProperty(key, out var piece))
            {
                AddIfUploaded(urls, piece);
            }
        }
    }

    private static void AddIfUploaded(List<string> urls, JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.String)
        {
            var s = value.GetString();
            if (!string.IsNullOrEmpty(s) && s.Contains($"/{MediaFolder}/", StringComparison.Ordinal))
            {
                urls.Add(s);
            }
        }
    }

    private static PrivateInviteDto ToDto(PrivateInvite row)
    {
        using var doc = JsonDocument.Parse(row.ConfigJson);
        return new PrivateInviteDto
        {
            Slug = row.Slug,
            Title = row.Title,
            Config = doc.RootElement.Clone(),
            CreatedAt = row.CreatedAt,
            UpdatedAt = row.UpdatedAt,
        };
    }

    // ---- Hand-over to a customer account and RSVPs collected on the invitation page (config.rsvp.mode == "site") ----
    // Everything below is additive: an invitation without an owner and without rsvp.mode == "site" behaves as before.
    private const int MaxRsvpsPerInvite = 3000;
    private const int MaxWishesShown = 100;

    private string FrontendBaseUrl => configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";

    private async Task<Guid?> CurrentUserIdAsync()
    {
        if (User.Identity?.IsAuthenticated != true) return null;
        var user = await userManager.GetUserAsync(User);
        return user?.Id;
    }

    // rsvp.mode / rsvp.showWishes of the stored config. Anything unreadable counts as "WhatsApp, no wishes".
    private static (bool Site, bool ShowWishes) ReadRsvpSettings(string configJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(configJson);
            if (doc.RootElement.ValueKind == JsonValueKind.Object
                && doc.RootElement.TryGetProperty("rsvp", out var rsvp) && rsvp.ValueKind == JsonValueKind.Object)
            {
                var site = rsvp.TryGetProperty("mode", out var mode)
                    && mode.ValueKind == JsonValueKind.String && mode.GetString() == "site";
                var wishes = rsvp.TryGetProperty("showWishes", out var sw) && sw.ValueKind == JsonValueKind.True;
                return (site, site && wishes);
            }
        }
        catch (JsonException)
        {
            // fall through
        }
        return (false, false);
    }

    private static string? ReadString(JsonElement root, params string[] path)
    {
        JsonElement cur = root;
        foreach (var key in path)
        {
            if (cur.ValueKind != JsonValueKind.Object || !cur.TryGetProperty(key, out JsonElement next)) return null;
            cur = next;
        }
        return cur.ValueKind == JsonValueKind.String ? cur.GetString() : null;
    }

    private static int AttendingHeads(IEnumerable<PrivateInviteRsvp> rows) =>
        rows.Where(r => r.Attending != false).Sum(r => r.GuestCount ?? 1);

    // POST /api/private-invites/{slug}/transfer-link (admin): a one-time, 7-day link the customer opens while signed in.
    [HttpPost("{slug}/transfer-link")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PrivateInviteTransferLinkDto>> CreateTransferLink(string slug, CancellationToken cancellationToken)
    {
        var row = await db.PrivateInvites.FirstOrDefaultAsync(i => i.Slug == slug, cancellationToken);
        if (row is null)
        {
            return NotFound(new { message = "Invitation not found." });
        }

        row.TransferToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
        row.TransferTokenExpiresAt = DateTime.UtcNow.AddDays(7);
        await db.SaveChangesAsync(cancellationToken);

        return Ok(new PrivateInviteTransferLinkDto
        {
            Url = $"{FrontendBaseUrl}/claim-invitation?token={row.TransferToken}&kind=private",
        });
    }

    // POST /api/private-invites/claim-transfer: whoever is signed in when they redeem a valid token becomes the owner.
    [HttpPost("claim-transfer")]
    [Authorize]
    public async Task<ActionResult<ClaimPrivateInviteResponse>> ClaimTransfer(
        [FromBody] ClaimPrivateInviteRequest request,
        CancellationToken cancellationToken)
    {
        var userId = await CurrentUserIdAsync();
        if (userId is null)
        {
            return Unauthorized();
        }
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            return NotFound(new { message = "This handoff link is invalid or has expired." });
        }

        var row = await db.PrivateInvites.FirstOrDefaultAsync(i => i.TransferToken == request.Token, cancellationToken);
        if (row is null || row.TransferTokenExpiresAt is null || row.TransferTokenExpiresAt < DateTime.UtcNow)
        {
            return NotFound(new { message = "This handoff link is invalid or has expired." });
        }

        row.OwnerUserId = userId;
        row.TransferToken = null;
        row.TransferTokenExpiresAt = null;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new ClaimPrivateInviteResponse { Slug = row.Slug });
    }

    // GET /api/private-invites/mine: the invitations handed over to the signed-in customer (read-only cards).
    [HttpGet("mine")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<OwnedPrivateInviteDto>>> GetMine(CancellationToken cancellationToken)
    {
        var userId = await CurrentUserIdAsync();
        if (userId is null)
        {
            return Unauthorized();
        }

        var rows = await db.PrivateInvites.AsNoTracking()
            .Include(i => i.Rsvps)
            .Where(i => i.OwnerUserId == userId)
            .OrderByDescending(i => i.UpdatedAt)
            .ToListAsync(cancellationToken);

        var result = new List<OwnedPrivateInviteDto>();
        foreach (var r in rows)
        {
            string? name1 = null, name2 = null, dateText = null, start = null;
            try
            {
                using var doc = JsonDocument.Parse(r.ConfigJson);
                name1 = ReadString(doc.RootElement, "hero", "name1");
                name2 = ReadString(doc.RootElement, "hero", "name2");
                dateText = ReadString(doc.RootElement, "hero", "dateText");
                start = ReadString(doc.RootElement, "event", "start");
            }
            catch (JsonException)
            {
                // keep the card with just its title
            }

            var (site, wishes) = ReadRsvpSettings(r.ConfigJson);
            result.Add(new OwnedPrivateInviteDto
            {
                Slug = r.Slug,
                Title = r.Title,
                Url = $"{FrontendBaseUrl}/invites/p/{r.Slug}",
                Name1 = name1,
                Name2 = name2,
                DateText = dateText,
                EventStart = start,
                SiteRsvp = site,
                ShowWishes = wishes,
                ResponsesCount = r.Rsvps.Count,
                AttendingCount = AttendingHeads(r.Rsvps),
                DeclinedCount = r.Rsvps.Count(x => x.Attending == false),
                UpdatedAt = r.UpdatedAt,
            });
        }
        return Ok(result);
    }

    // The owner (or an admin) of one invitation; null when the caller may not see its answers.
    private async Task<PrivateInvite?> LoadForOwnerAsync(string slug, CancellationToken cancellationToken)
    {
        var userId = await CurrentUserIdAsync();
        if (userId is null) return null;
        var row = await db.PrivateInvites.FirstOrDefaultAsync(i => i.Slug == slug, cancellationToken);
        if (row is null) return null;
        return row.OwnerUserId == userId || User.IsInRole(Roles.Admin) ? row : null;
    }

    // GET /api/private-invites/{slug}/rsvp: every answer, newest first (owner / admin).
    [HttpGet("{slug}/rsvp")]
    [Authorize]
    public async Task<ActionResult<List<PrivateInviteRsvpDto>>> ListRsvps(string slug, CancellationToken cancellationToken)
    {
        var row = await LoadForOwnerAsync(slug, cancellationToken);
        if (row is null)
        {
            return NotFound();
        }

        var rows = await db.PrivateInviteRsvps.AsNoTracking()
            .Where(r => r.PrivateInviteId == row.Id)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
        return Ok(rows.Select(r => new PrivateInviteRsvpDto
        {
            Id = r.Id.ToString(),
            GuestName = r.GuestName,
            Attending = r.Attending,
            GuestCount = r.GuestCount,
            Message = r.Message,
            CreatedAt = r.CreatedAt,
        }).ToList());
    }

    // DELETE /api/private-invites/{slug}/rsvp/{id}: remove one answer (spam / test).
    [HttpDelete("{slug}/rsvp/{responseId:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteRsvp(string slug, Guid responseId, CancellationToken cancellationToken)
    {
        var row = await LoadForOwnerAsync(slug, cancellationToken);
        if (row is null)
        {
            return NotFound();
        }

        var response = await db.PrivateInviteRsvps.FirstOrDefaultAsync(
            r => r.Id == responseId && r.PrivateInviteId == row.Id, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }
        db.PrivateInviteRsvps.Remove(response);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    // POST /api/private-invites/{slug}/rsvp (anonymous, from the guest's invitation page). Only invitations whose
    // config says rsvp.mode == "site" accept answers; every other invitation answers 404 as if the route did not exist.
    [HttpPost("{slug}/rsvp")]
    public async Task<IActionResult> SubmitRsvp(
        string slug,
        [FromBody] PrivateInviteRsvpRequest request,
        CancellationToken cancellationToken)
    {
        var row = await db.PrivateInvites.AsNoTracking().FirstOrDefaultAsync(i => i.Slug == slug, cancellationToken);
        if (row is null || !ReadRsvpSettings(row.ConfigJson).Site)
        {
            return NotFound();
        }

        var name = (request.GuestName ?? string.Empty).Trim();
        if (name.Length == 0)
        {
            return BadRequest(new { message = "Name is required." });
        }
        if (name.Length > 128) name = name[..128];

        var message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim();
        if (message is { Length: > 1000 }) message = message[..1000];

        int? count = request.Attending == false ? null : Math.Clamp(request.GuestCount ?? 1, 1, 30);

        var total = await db.PrivateInviteRsvps.CountAsync(r => r.PrivateInviteId == row.Id, cancellationToken);
        if (total >= MaxRsvpsPerInvite)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { message = "Too many responses." });
        }

        // A double tap / retry must not create two rows: same name and message within two minutes is one answer.
        var since = DateTime.UtcNow.AddMinutes(-2);
        var duplicate = await db.PrivateInviteRsvps.AnyAsync(
            r => r.PrivateInviteId == row.Id && r.GuestName == name && r.Message == message && r.CreatedAt > since,
            cancellationToken);
        if (duplicate)
        {
            return NoContent();
        }

        db.PrivateInviteRsvps.Add(new PrivateInviteRsvp
        {
            Id = Guid.NewGuid(),
            PrivateInviteId = row.Id,
            GuestName = name,
            Attending = request.Attending,
            GuestCount = count,
            Message = message,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    // GET /api/private-invites/{slug}/wishes (public): congratulation messages shown at the end of the invitation,
    // only when the invitation asks for it (rsvp.showWishes). Names and messages only.
    [HttpGet("{slug}/wishes")]
    public async Task<ActionResult<List<PrivateInviteWishDto>>> GetWishes(string slug, CancellationToken cancellationToken)
    {
        var row = await db.PrivateInvites.AsNoTracking().FirstOrDefaultAsync(i => i.Slug == slug, cancellationToken);
        if (row is null || !ReadRsvpSettings(row.ConfigJson).ShowWishes)
        {
            return Ok(new List<PrivateInviteWishDto>());
        }

        var rows = await db.PrivateInviteRsvps.AsNoTracking()
            .Where(r => r.PrivateInviteId == row.Id && r.Message != null && r.Message != "")
            .OrderByDescending(r => r.CreatedAt)
            .Take(MaxWishesShown)
            .ToListAsync(cancellationToken);
        return Ok(rows.Select(r => new PrivateInviteWishDto
        {
            GuestName = r.GuestName,
            Message = r.Message ?? string.Empty,
            CreatedAt = r.CreatedAt,
        }).ToList());
    }
}
