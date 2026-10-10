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
public partial class PrivateInvitesController(NumindsDbContext db, IFileStorageService storage) : ControllerBase
{
    private const long MaxMediaBytes = 30 * 1024 * 1024;
    private const int MaxConfigChars = 200_000;
    private const string MediaFolder = "private-invites";

    private static readonly Dictionary<string, string> AllowedMediaContentTypes = new()
    {
        ["image/png"] = ".png",
        ["image/jpeg"] = ".jpg",
        ["image/webp"] = ".webp",
        ["video/mp4"] = ".mp4",
        ["video/webm"] = ".webm",
        ["audio/mpeg"] = ".mp3",
        ["audio/mp3"] = ".mp3",
        ["audio/mp4"] = ".m4a",
        ["audio/aac"] = ".aac",
        ["audio/ogg"] = ".ogg",
        ["audio/wav"] = ".wav",
    };

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{1,39}$")]
    private static partial Regex SlugPattern();

    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IEnumerable<PrivateInviteDto>>> GetAll(CancellationToken cancellationToken)
    {
        var rows = await db.PrivateInvites.AsNoTracking()
            .OrderByDescending(i => i.UpdatedAt)
            .ToListAsync(cancellationToken);
        return Ok(rows.Select(ToDto));
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
        if (!SlugPattern().IsMatch(slug))
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
            return BadRequest(new { message = "Unsupported file type. Use JPG/PNG/WebP, MP4/WebM or MP3/M4A." });
        }

        var url = await storage.UploadAsync(file, MediaFolder, extension, $"{Request.Scheme}://{Request.Host}", cancellationToken);
        return Ok(new PrivateInviteMediaUploadResponse { Url = url });
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
        }
        catch (JsonException)
        {
            // Malformed stored config: nothing to clean up.
        }
        return urls;
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
}
