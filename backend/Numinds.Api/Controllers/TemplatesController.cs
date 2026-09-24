using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Numinds.Api.Data;
using Numinds.Api.Models;
using Numinds.Api.Models.Dtos;
using Numinds.Api.Models.Entities;
using Numinds.Api.Services;

namespace Numinds.Api.Controllers;

[ApiController]
[Route("api/templates")]
public class TemplatesController(NumindsDbContext db, IFileStorageService storage, IMemoryCache cache) : ControllerBase
{
    // The template catalog is admin-curated and rarely changes minute to
    // minute, but GET /api/templates is hit by every visitor browsing
    // templates or opening the studio (and was previously hitting Postgres,
    // uncached, on every single one of those) — a real contributor to the
    // database-transfer usage that exhausted Neon's free-tier quota.
    //
    // _cacheVersion is folded into every cache key below and bumped by
    // BustCache() after every write. Without it, the admin's own "save" ->
    // re-fetch-the-list round trip (adminTemplatesStore.update) could read
    // back the pre-edit cached list for up to CacheTtl, making a real,
    // already-persisted save look like it silently didn't take.
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(2);
    private static int _cacheVersion;
    private static void BustCache() => Interlocked.Increment(ref _cacheVersion);
    private const long MaxImageBytes = 8 * 1024 * 1024;
    private static readonly Dictionary<string, string> AllowedImageContentTypes = new()
    {
        ["image/png"] = ".png",
        ["image/jpeg"] = ".jpg",
        ["image/webp"] = ".webp",
    };

    // Category ids mirror the frontend's CategoryId union (src/lib/categories.ts)
    // and the one-letter Code prefixes already used by SeedTemplates.cs — kept
    // here so an admin-created template's auto-generated code (e.g. "G003")
    // lands in the same series as the seeded ones for its category.
    private static readonly Dictionary<string, string> CategoryCodePrefixes = new()
    {
        ["wedding"] = "W",
        ["engagement"] = "E",
        ["marriage_contract"] = "Q",
        ["henna"] = "H",
        ["bridal_shower"] = "S",
        ["gender_reveal"] = "R",
        ["aqeeqah"] = "A",
        ["graduation"] = "G",
        ["birthday"] = "B",
    };

    // GET /api/templates?category=wedding&includeInactive=true
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TemplateDto>>> GetTemplates(
        [FromQuery] string? category,
        [FromQuery] bool includeInactive,
        CancellationToken cancellationToken)
    {
        var cacheKey = $"templates:v{_cacheVersion}:{category}:{includeInactive}";
        if (cache.TryGetValue(cacheKey, out List<TemplateDto>? cached))
        {
            return Ok(cached);
        }

        var query = db.Templates.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(t => t.Category == category);
        }
        if (!includeInactive)
        {
            query = query.Where(t => t.IsActive);
        }

        // t.Invitations.Count is written inline (not through a shared C#
        // helper) so EF Core can translate it into a correlated COUNT
        // subquery rather than requiring the whole Invitations collection
        // to be loaded per template.
        var rows = await query
            .OrderByDescending(t => t.IsPopular)
            .ThenByDescending(t => t.Invitations.Count)
            .ThenBy(t => t.Code)
            // Safety cap, not a real limit — the admin-curated catalog is
            // nowhere near this today, it just guards against an unbounded
            // query if it ever grows a lot.
            .Take(1000)
            .Select(t => new
            {
                Dto = new TemplateDto
                {
                    Id = t.Id.ToString(),
                    Code = t.Code,
                    Category = t.Category,
                    ImageUrl = t.ImageUrl,
                    BackgroundImageUrl = t.BackgroundImageUrl,
                    Layout = t.Layout,
                    PageBg = t.PageBg,
                    CardBg = t.CardBg,
                    TextColor = t.TextColor,
                    PrimaryAccent = t.PrimaryAccent,
                    DefaultNamesFont = t.DefaultNamesFont,
                    EventTitleFont = t.EventTitleFont,
                    ThankYouTextFont = t.ThankYouTextFont,
                    FamilyNamesFont = t.FamilyNamesFont,
                    InvitationTextFont = t.InvitationTextFont,
                    DefaultMusicUrl = t.DefaultMusicUrl,
                    DefaultMusicTitle = t.DefaultMusicTitle,
                    HeroIllustrationUrl = t.HeroIllustrationUrl,
                    DecorationImageUrl = t.DecorationImageUrl,
                    OpeningVideoUrl = t.OpeningVideoUrl,
                    AmbientVideoUrl = t.AmbientVideoUrl,
                    EnvelopeInitialsXPercent = t.EnvelopeInitialsXPercent,
                    EnvelopeInitialsYPercent = t.EnvelopeInitialsYPercent,
                    EnvelopeCtaTextAr = t.EnvelopeCtaTextAr,
                    EnvelopeCtaTextEn = t.EnvelopeCtaTextEn,
                    EnvelopeCtaShape = t.EnvelopeCtaShape,
                    EnvelopeCtaBgColor = t.EnvelopeCtaBgColor,
                    EnvelopeCtaTextColor = t.EnvelopeCtaTextColor,
                    AmbientEffect = t.AmbientEffect,
                    EnvelopeStyle = t.EnvelopeStyle,
                    HeroFrameStyle = t.HeroFrameStyle,
                    DateRevealStyle = t.DateRevealStyle,
                    InvitationCardStyle = t.InvitationCardStyle,
                    SceneLayoutStyle = t.SceneLayoutStyle,
                    ScenesJson = t.ScenesJson,
                    EnvelopeId = t.EnvelopeId != null ? t.EnvelopeId.ToString() : null,
                    EnvelopePhotoUrl = t.Envelope != null ? t.Envelope.PhotoUrl : null,
                    EnvelopeSealXPercent = t.Envelope != null ? t.Envelope.SealXPercent : (double?)null,
                    EnvelopeSealYPercent = t.Envelope != null ? t.Envelope.SealYPercent : (double?)null,
                    EnvelopeOpeningStyle = t.Envelope != null ? t.Envelope.OpeningStyle : null,
                    IsPopular = t.IsPopular,
                    IsHomepageFeatured = t.IsHomepageFeatured,
                    IsActive = t.IsActive,
                    UsageCount = t.Invitations.Count,
                },
                // FoldPointsJson needs actual .NET JSON parsing (System.Text.Json
                // can't translate into SQL), so it's carried through raw here and
                // parsed below, after materialization.
                EnvelopeFoldPointsJson = t.Envelope != null ? t.Envelope.FoldPointsJson : null,
            })
            .ToListAsync(cancellationToken);

        // SQLite translates Guid.ToString() in the query above to its own hex()-style
        // function, which emits uppercase — inconsistent with the lowercase Guid.ToString()
        // .NET uses everywhere else (e.g. InvitationDto.TemplateId). Normalize here so
        // template ids (and EnvelopeId, same translation) compare equal to the lowercase
        // ids invitations are saved with and EnvelopesController.GetAll returns — otherwise
        // TemplateEditModal's envelope picker can't match the assigned id against its
        // <option> list and silently shows "none" even though the save succeeded.
        var templates = rows.Select(r =>
        {
            r.Dto.Id = r.Dto.Id.ToLowerInvariant();
            r.Dto.EnvelopeId = r.Dto.EnvelopeId?.ToLowerInvariant();
            r.Dto.EnvelopeFoldPoints = EnvelopeFoldPointsJson.Parse(r.EnvelopeFoldPointsJson);
            return r.Dto;
        }).ToList();

        cache.Set(cacheKey, templates, CacheTtl);
        return Ok(templates);
    }

    // GET /api/templates/homepage — the homepage teaser grid's data source
    // (TemplatesGrid.tsx). Always resolves to exactly `slotCount` templates:
    // admin-pinned ones (IsHomepageFeatured, capped at slotCount by
    // SetHomepageFeatured) first, ordered by real usage among themselves,
    // then any remaining slots auto-filled by real usage (most invitations
    // built on that template) among the rest — so the grid is never sparse
    // just because an admin hasn't pinned anything yet, and a pin always
    // wins over the automatic ranking.
    [HttpGet("homepage")]
    public async Task<ActionResult<IEnumerable<TemplateDto>>> GetHomepageTemplates(CancellationToken cancellationToken)
    {
        var cacheKey = $"templates:v{_cacheVersion}:homepage";
        if (cache.TryGetValue(cacheKey, out List<TemplateDto>? cachedHomepage))
        {
            return Ok(cachedHomepage);
        }

        const int slotCount = 4;

        var featuredIds = await db.Templates.AsNoTracking()
            .Where(t => t.IsActive && t.IsHomepageFeatured)
            .OrderByDescending(t => t.Invitations.Count)
            .ThenBy(t => t.Code)
            .Select(t => t.Id)
            .Take(slotCount)
            .ToListAsync(cancellationToken);

        var finalIds = new List<Guid>(featuredIds);
        if (finalIds.Count < slotCount)
        {
            var fillIds = await db.Templates.AsNoTracking()
                .Where(t => t.IsActive && !finalIds.Contains(t.Id))
                .OrderByDescending(t => t.Invitations.Count)
                .ThenBy(t => t.Code)
                .Select(t => t.Id)
                .Take(slotCount - finalIds.Count)
                .ToListAsync(cancellationToken);
            finalIds.AddRange(fillIds);
        }

        var rows = await db.Templates.AsNoTracking()
            .Where(t => finalIds.Contains(t.Id))
            .Select(t => new
            {
                Dto = new TemplateDto
                {
                    Id = t.Id.ToString(),
                    Code = t.Code,
                    Category = t.Category,
                    ImageUrl = t.ImageUrl,
                    BackgroundImageUrl = t.BackgroundImageUrl,
                    Layout = t.Layout,
                    PageBg = t.PageBg,
                    CardBg = t.CardBg,
                    TextColor = t.TextColor,
                    PrimaryAccent = t.PrimaryAccent,
                    DefaultNamesFont = t.DefaultNamesFont,
                    EventTitleFont = t.EventTitleFont,
                    ThankYouTextFont = t.ThankYouTextFont,
                    FamilyNamesFont = t.FamilyNamesFont,
                    InvitationTextFont = t.InvitationTextFont,
                    DefaultMusicUrl = t.DefaultMusicUrl,
                    DefaultMusicTitle = t.DefaultMusicTitle,
                    HeroIllustrationUrl = t.HeroIllustrationUrl,
                    DecorationImageUrl = t.DecorationImageUrl,
                    OpeningVideoUrl = t.OpeningVideoUrl,
                    AmbientVideoUrl = t.AmbientVideoUrl,
                    EnvelopeInitialsXPercent = t.EnvelopeInitialsXPercent,
                    EnvelopeInitialsYPercent = t.EnvelopeInitialsYPercent,
                    EnvelopeCtaTextAr = t.EnvelopeCtaTextAr,
                    EnvelopeCtaTextEn = t.EnvelopeCtaTextEn,
                    EnvelopeCtaShape = t.EnvelopeCtaShape,
                    EnvelopeCtaBgColor = t.EnvelopeCtaBgColor,
                    EnvelopeCtaTextColor = t.EnvelopeCtaTextColor,
                    AmbientEffect = t.AmbientEffect,
                    EnvelopeStyle = t.EnvelopeStyle,
                    HeroFrameStyle = t.HeroFrameStyle,
                    DateRevealStyle = t.DateRevealStyle,
                    InvitationCardStyle = t.InvitationCardStyle,
                    SceneLayoutStyle = t.SceneLayoutStyle,
                    ScenesJson = t.ScenesJson,
                    EnvelopeId = t.EnvelopeId != null ? t.EnvelopeId.ToString() : null,
                    EnvelopePhotoUrl = t.Envelope != null ? t.Envelope.PhotoUrl : null,
                    EnvelopeSealXPercent = t.Envelope != null ? t.Envelope.SealXPercent : (double?)null,
                    EnvelopeSealYPercent = t.Envelope != null ? t.Envelope.SealYPercent : (double?)null,
                    EnvelopeOpeningStyle = t.Envelope != null ? t.Envelope.OpeningStyle : null,
                    IsPopular = t.IsPopular,
                    IsHomepageFeatured = t.IsHomepageFeatured,
                    IsActive = t.IsActive,
                    UsageCount = t.Invitations.Count,
                },
                EnvelopeFoldPointsJson = t.Envelope != null ? t.Envelope.FoldPointsJson : null,
            })
            .ToListAsync(cancellationToken);

        var order = finalIds.Select((id, index) => (id, index)).ToDictionary(x => x.id, x => x.index);
        var ordered = rows
            .OrderBy(r => order[Guid.Parse(r.Dto.Id)])
            .Select(r =>
            {
                r.Dto.Id = r.Dto.Id.ToLowerInvariant();
                r.Dto.EnvelopeId = r.Dto.EnvelopeId?.ToLowerInvariant();
                r.Dto.EnvelopeFoldPoints = EnvelopeFoldPointsJson.Parse(r.EnvelopeFoldPointsJson);
                return r.Dto;
            })
            .ToList();

        cache.Set(cacheKey, ordered, CacheTtl);
        return Ok(ordered);
    }

    // GET /api/templates/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TemplateDto>> GetTemplate(Guid id, CancellationToken cancellationToken)
    {
        var row = await db.Templates.AsNoTracking()
            .Where(t => t.Id == id)
            .Select(t => new
            {
                Dto = new TemplateDto
                {
                    Id = t.Id.ToString(),
                    Code = t.Code,
                    Category = t.Category,
                    ImageUrl = t.ImageUrl,
                    BackgroundImageUrl = t.BackgroundImageUrl,
                    Layout = t.Layout,
                    PageBg = t.PageBg,
                    CardBg = t.CardBg,
                    TextColor = t.TextColor,
                    PrimaryAccent = t.PrimaryAccent,
                    DefaultNamesFont = t.DefaultNamesFont,
                    EventTitleFont = t.EventTitleFont,
                    ThankYouTextFont = t.ThankYouTextFont,
                    FamilyNamesFont = t.FamilyNamesFont,
                    InvitationTextFont = t.InvitationTextFont,
                    DefaultMusicUrl = t.DefaultMusicUrl,
                    DefaultMusicTitle = t.DefaultMusicTitle,
                    HeroIllustrationUrl = t.HeroIllustrationUrl,
                    DecorationImageUrl = t.DecorationImageUrl,
                    OpeningVideoUrl = t.OpeningVideoUrl,
                    AmbientVideoUrl = t.AmbientVideoUrl,
                    EnvelopeInitialsXPercent = t.EnvelopeInitialsXPercent,
                    EnvelopeInitialsYPercent = t.EnvelopeInitialsYPercent,
                    EnvelopeCtaTextAr = t.EnvelopeCtaTextAr,
                    EnvelopeCtaTextEn = t.EnvelopeCtaTextEn,
                    EnvelopeCtaShape = t.EnvelopeCtaShape,
                    EnvelopeCtaBgColor = t.EnvelopeCtaBgColor,
                    EnvelopeCtaTextColor = t.EnvelopeCtaTextColor,
                    AmbientEffect = t.AmbientEffect,
                    EnvelopeStyle = t.EnvelopeStyle,
                    HeroFrameStyle = t.HeroFrameStyle,
                    DateRevealStyle = t.DateRevealStyle,
                    InvitationCardStyle = t.InvitationCardStyle,
                    SceneLayoutStyle = t.SceneLayoutStyle,
                    ScenesJson = t.ScenesJson,
                    EnvelopeId = t.EnvelopeId != null ? t.EnvelopeId.ToString() : null,
                    EnvelopePhotoUrl = t.Envelope != null ? t.Envelope.PhotoUrl : null,
                    EnvelopeSealXPercent = t.Envelope != null ? t.Envelope.SealXPercent : (double?)null,
                    EnvelopeSealYPercent = t.Envelope != null ? t.Envelope.SealYPercent : (double?)null,
                    EnvelopeOpeningStyle = t.Envelope != null ? t.Envelope.OpeningStyle : null,
                    IsPopular = t.IsPopular,
                    IsHomepageFeatured = t.IsHomepageFeatured,
                    IsActive = t.IsActive,
                    UsageCount = t.Invitations.Count,
                },
                EnvelopeFoldPointsJson = t.Envelope != null ? t.Envelope.FoldPointsJson : null,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (row is null)
        {
            return NotFound();
        }

        var dto = row.Dto;
        dto.Id = dto.Id.ToLowerInvariant();
        dto.EnvelopeId = dto.EnvelopeId?.ToLowerInvariant();
        dto.EnvelopeFoldPoints = EnvelopeFoldPointsJson.Parse(row.EnvelopeFoldPointsJson);
        return Ok(dto);
    }

    // POST /api/templates/image — admin uploads a cover/background photo from
    // their own device (TemplateEditModal), gets back a real hosted URL to
    // submit as ImageUrl/BackgroundImageUrl with Create/Update. Uploaded to
    // R2 (see IFileStorageService) rather than embedded as a base64 ImageUrl
    // (what the "create template from AI" flow's file mode already does),
    // so editing an existing template's photo doesn't bloat every GET
    // /api/templates response with a multi-hundred-KB data: URL.
    [HttpPost("image")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<TemplateImageUploadResponse>> UploadImage(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }
        if (file.Length > MaxImageBytes)
        {
            return BadRequest(new { message = "Image must be 8MB or smaller." });
        }
        if (!AllowedImageContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            return BadRequest(new { message = "Image must be a JPG, PNG, or WebP file." });
        }

        var url = await storage.UploadAsync(file, "templates", extension, $"{Request.Scheme}://{Request.Host}", cancellationToken);
        return Ok(new TemplateImageUploadResponse { Url = url });
    }

    // POST /api/templates/video — admin uploads OpeningVideoUrl/AmbientVideoUrl
    // (TemplateEditModal). Despite the route/DTO names (kept as-is to avoid
    // an unnecessary migration/rename sweep), OpeningVideoUrl is really one
    // unified "envelope media" slot now — the frontend's EnvelopeMediaCover
    // detects image vs video itself (isVideoSource) and renders accordingly,
    // so this endpoint accepts both. AmbientVideoUrl stays video-only in
    // practice (nothing reads it as an image), but there's no reason to
    // reject an image there either. No server-side compression exists for
    // video (SixLabors.ImageSharp can't touch it -- R2FileStorageService.
    // TryCompressImage just uploads it unmodified); an uploaded image still
    // gets the same compression UploadImage's images get, since both paths
    // share storage.UploadAsync. The size cap is the real guard against an
    // admin uploading an unreasonably large clip -- 25MB let an actual 4K/60
    // clip (17MB) straight through once, which made a guest's phone unable
    // to load an envelope-opening video at all. A phone-sized clip a couple
    // seconds long has no legitimate reason to be anywhere near that big;
    // every video already live on the platform is under 4MB.
    private const long MaxVideoBytes = 6 * 1024 * 1024;
    private static readonly Dictionary<string, string> AllowedVideoContentTypes = new()
    {
        ["video/mp4"] = ".mp4",
        ["video/webm"] = ".webm",
        ["image/png"] = ".png",
        ["image/jpeg"] = ".jpg",
        ["image/webp"] = ".webp",
    };

    [HttpPost("video")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<TemplateVideoUploadResponse>> UploadVideo(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }
        if (file.Length > MaxVideoBytes)
        {
            return BadRequest(new { message = "File must be 6MB or smaller -- compress it first (e.g. HandBrake or ffmpeg), a phone-sized clip a few seconds long shouldn't need to be any bigger." });
        }
        if (!AllowedVideoContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            return BadRequest(new { message = "File must be an MP4, WebM, JPG, PNG, or WebP file." });
        }

        var url = await storage.UploadAsync(file, "templates-video", extension, $"{Request.Scheme}://{Request.Host}", cancellationToken);
        return Ok(new TemplateVideoUploadResponse { Url = url });
    }

    // POST /api/templates — admin "create template" flow (src/app/admin/video-templates).
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<TemplateDto>> CreateTemplate(
        [FromBody] TemplateWriteRequest request,
        CancellationToken cancellationToken)
    {
        if (!CategoryCodePrefixes.TryGetValue(request.Category, out var prefix))
        {
            return BadRequest(new { error = $"Unknown category '{request.Category}'." });
        }
        if (string.IsNullOrWhiteSpace(request.ImageUrl))
        {
            return BadRequest(new { error = "ImageUrl is required." });
        }
        var (envelope, envelopeError) = await ResolveEnvelopeAsync(request.EnvelopeId, cancellationToken);
        if (envelopeError is not null)
        {
            return BadRequest(new { error = envelopeError });
        }

        var code = await GenerateCode(prefix, cancellationToken);

        var template = new Template
        {
            Id = Guid.NewGuid(),
            Code = code,
            Category = request.Category,
            ImageUrl = request.ImageUrl,
            BackgroundImageUrl = string.IsNullOrWhiteSpace(request.BackgroundImageUrl) ? null : request.BackgroundImageUrl,
            Layout = string.IsNullOrWhiteSpace(request.Layout) ? "none" : request.Layout,
            PageBg = request.PageBg,
            CardBg = request.CardBg,
            TextColor = request.TextColor,
            PrimaryAccent = request.PrimaryAccent,
            DefaultNamesFont = request.DefaultNamesFont,
            EventTitleFont = request.EventTitleFont,
            ThankYouTextFont = request.ThankYouTextFont,
            FamilyNamesFont = request.FamilyNamesFont,
            InvitationTextFont = request.InvitationTextFont,
            DefaultMusicUrl = request.DefaultMusicUrl,
            DefaultMusicTitle = request.DefaultMusicTitle,
            HeroIllustrationUrl = request.HeroIllustrationUrl,
            DecorationImageUrl = request.DecorationImageUrl,
            OpeningVideoUrl = request.OpeningVideoUrl,
            AmbientVideoUrl = request.AmbientVideoUrl,
            EnvelopeInitialsXPercent = request.EnvelopeInitialsXPercent,
            EnvelopeInitialsYPercent = request.EnvelopeInitialsYPercent,
            EnvelopeCtaTextAr = request.EnvelopeCtaTextAr,
            EnvelopeCtaTextEn = request.EnvelopeCtaTextEn,
            EnvelopeCtaShape = request.EnvelopeCtaShape,
            EnvelopeCtaBgColor = request.EnvelopeCtaBgColor,
            EnvelopeCtaTextColor = request.EnvelopeCtaTextColor,
            AmbientEffect = request.AmbientEffect,
            EnvelopeStyle = request.EnvelopeStyle,
            HeroFrameStyle = request.HeroFrameStyle,
            DateRevealStyle = request.DateRevealStyle,
            InvitationCardStyle = request.InvitationCardStyle,
            SceneLayoutStyle = request.SceneLayoutStyle,
            ScenesJson = string.IsNullOrWhiteSpace(request.ScenesJson) ? "[]" : request.ScenesJson,
            EnvelopeId = envelope?.Id,
            IsPopular = request.IsPopular,
            IsActive = request.IsActive,
        };

        db.Templates.Add(template);
        await db.SaveChangesAsync(cancellationToken);
        BustCache();

        // Brand new row — zero invitations by construction, no query needed.
        var dto = ToDto(template, usageCount: 0, envelope);
        return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, dto);
    }

    // PUT /api/templates/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<TemplateDto>> UpdateTemplate(
        Guid id,
        [FromBody] TemplateWriteRequest request,
        CancellationToken cancellationToken)
    {
        if (!CategoryCodePrefixes.ContainsKey(request.Category))
        {
            return BadRequest(new { error = $"Unknown category '{request.Category}'." });
        }
        if (string.IsNullOrWhiteSpace(request.ImageUrl))
        {
            return BadRequest(new { error = "ImageUrl is required." });
        }
        var (envelope, envelopeError) = await ResolveEnvelopeAsync(request.EnvelopeId, cancellationToken);
        if (envelopeError is not null)
        {
            return BadRequest(new { error = envelopeError });
        }

        var template = await db.Templates.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (template is null)
        {
            return NotFound();
        }

        var oldImageUrl = template.ImageUrl;
        var oldBackgroundImageUrl = template.BackgroundImageUrl;
        var oldHeroIllustrationUrl = template.HeroIllustrationUrl;
        var oldDecorationImageUrl = template.DecorationImageUrl;
        var oldOpeningVideoUrl = template.OpeningVideoUrl;
        var oldAmbientVideoUrl = template.AmbientVideoUrl;
        // DefaultMusicUrl is deliberately NOT auto-deleted-on-replace like
        // the image/video slots below -- the same uploaded track can also be
        // saved as a standalone MusicSuggestion (TemplateEditModal's "save
        // as a customer suggestion" checkbox), and deleting the underlying
        // file here would silently break that suggestion's playback too.

        // Code is intentionally left untouched even if Category changes here —
        // re-minting it would break any already-shared invitation link's
        // ?template= query param pointing at the old code.
        template.Category = request.Category;
        template.ImageUrl = request.ImageUrl;
        template.BackgroundImageUrl = string.IsNullOrWhiteSpace(request.BackgroundImageUrl) ? null : request.BackgroundImageUrl;
        template.Layout = string.IsNullOrWhiteSpace(request.Layout) ? "none" : request.Layout;
        template.PageBg = request.PageBg;
        template.CardBg = request.CardBg;
        template.TextColor = request.TextColor;
        template.PrimaryAccent = request.PrimaryAccent;
        template.DefaultNamesFont = request.DefaultNamesFont;
        template.EventTitleFont = request.EventTitleFont;
        template.ThankYouTextFont = request.ThankYouTextFont;
        template.FamilyNamesFont = request.FamilyNamesFont;
        template.InvitationTextFont = request.InvitationTextFont;
        template.DefaultMusicUrl = request.DefaultMusicUrl;
        template.DefaultMusicTitle = request.DefaultMusicTitle;
        template.HeroIllustrationUrl = request.HeroIllustrationUrl;
        template.DecorationImageUrl = request.DecorationImageUrl;
        template.OpeningVideoUrl = request.OpeningVideoUrl;
        template.AmbientVideoUrl = request.AmbientVideoUrl;
        template.EnvelopeInitialsXPercent = request.EnvelopeInitialsXPercent;
        template.EnvelopeInitialsYPercent = request.EnvelopeInitialsYPercent;
        template.EnvelopeCtaTextAr = request.EnvelopeCtaTextAr;
        template.EnvelopeCtaTextEn = request.EnvelopeCtaTextEn;
        template.EnvelopeCtaShape = request.EnvelopeCtaShape;
        template.EnvelopeCtaBgColor = request.EnvelopeCtaBgColor;
        template.EnvelopeCtaTextColor = request.EnvelopeCtaTextColor;
        template.AmbientEffect = request.AmbientEffect;
        template.EnvelopeStyle = request.EnvelopeStyle;
        template.HeroFrameStyle = request.HeroFrameStyle;
        template.DateRevealStyle = request.DateRevealStyle;
        template.InvitationCardStyle = request.InvitationCardStyle;
        template.SceneLayoutStyle = request.SceneLayoutStyle;
        template.ScenesJson = string.IsNullOrWhiteSpace(request.ScenesJson) ? "[]" : request.ScenesJson;
        template.EnvelopeId = envelope?.Id;
        template.IsPopular = request.IsPopular;
        template.IsActive = request.IsActive;

        await db.SaveChangesAsync(cancellationToken);
        BustCache();

        // Best-effort: clean up whichever of this template's own image slots
        // just got replaced with a different URL, now that the new one is
        // safely saved. Skipped for slots that didn't change so a re-save
        // with the same photo doesn't delete-then-orphan its own URL.
        await DeleteIfReplacedAsync(oldImageUrl, template.ImageUrl, cancellationToken);
        await DeleteIfReplacedAsync(oldBackgroundImageUrl, template.BackgroundImageUrl, cancellationToken);
        await DeleteIfReplacedAsync(oldHeroIllustrationUrl, template.HeroIllustrationUrl, cancellationToken);
        await DeleteIfReplacedAsync(oldDecorationImageUrl, template.DecorationImageUrl, cancellationToken);
        await DeleteIfReplacedAsync(oldOpeningVideoUrl, template.OpeningVideoUrl, cancellationToken);
        await DeleteIfReplacedAsync(oldAmbientVideoUrl, template.AmbientVideoUrl, cancellationToken);

        var usageCount = await db.Invitations.CountAsync(i => i.TemplateId == id, cancellationToken);
        return Ok(ToDto(template, usageCount, envelope));
    }

    private async Task DeleteIfReplacedAsync(string? oldUrl, string? newUrl, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(oldUrl) && oldUrl != newUrl)
        {
            await storage.DeleteAsync(oldUrl, cancellationToken);
        }
    }

    // PATCH /api/templates/{id}/active — the table's lightweight on/off toggle,
    // separate from the full PUT so flipping visibility never risks clobbering
    // other fields with a stale form state.
    [HttpPatch("{id:guid}/active")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> SetActive(
        Guid id,
        [FromBody] SetTemplateActiveRequest request,
        CancellationToken cancellationToken)
    {
        var template = await db.Templates.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (template is null)
        {
            return NotFound();
        }

        template.IsActive = request.IsActive;
        await db.SaveChangesAsync(cancellationToken);
        BustCache();
        return NoContent();
    }

    // PATCH /api/templates/{id}/homepage-featured — the admin's manual pin
    // for the homepage teaser grid. Capped at 4 here (not just client-side)
    // so GET /api/templates/homepage's "pinned first" slice can never exceed
    // the grid's 4 slots regardless of which admin UI calls this.
    [HttpPatch("{id:guid}/homepage-featured")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> SetHomepageFeatured(
        Guid id,
        [FromBody] SetTemplateHomepageFeaturedRequest request,
        CancellationToken cancellationToken)
    {
        var template = await db.Templates.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (template is null)
        {
            return NotFound();
        }

        if (request.IsHomepageFeatured && !template.IsHomepageFeatured)
        {
            const int maxFeatured = 4;
            var currentCount = await db.Templates.CountAsync(t => t.IsHomepageFeatured, cancellationToken);
            if (currentCount >= maxFeatured)
            {
                return Conflict(new { error = $"يمكن تمييز {maxFeatured} قوالب كحد أقصى للصفحة الرئيسية. ألغِ تمييز قالب آخر أولاً." });
            }
        }

        template.IsHomepageFeatured = request.IsHomepageFeatured;
        await db.SaveChangesAsync(cancellationToken);
        BustCache();
        return NoContent();
    }

    // DELETE /api/templates/{id} — refused once any invitation has been built
    // on this template (deactivating hides it from new picks without
    // orphaning those existing invitations' template reference).
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DeleteTemplate(Guid id, CancellationToken cancellationToken)
    {
        var template = await db.Templates.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (template is null)
        {
            return NotFound();
        }

        var usageCount = await db.Invitations.CountAsync(i => i.TemplateId == id, cancellationToken);
        if (usageCount > 0)
        {
            return Conflict(new { error = "This template has invitations built on it. Deactivate it instead of deleting." });
        }

        db.Templates.Remove(template);
        await db.SaveChangesAsync(cancellationToken);
        BustCache();

        await storage.DeleteAsync(template.ImageUrl, cancellationToken);
        await storage.DeleteAsync(template.BackgroundImageUrl, cancellationToken);
        await storage.DeleteAsync(template.HeroIllustrationUrl, cancellationToken);
        await storage.DeleteAsync(template.DecorationImageUrl, cancellationToken);
        await storage.DeleteAsync(template.OpeningVideoUrl, cancellationToken);
        await storage.DeleteAsync(template.AmbientVideoUrl, cancellationToken);

        return NoContent();
    }

    private async Task<string> GenerateCode(string prefix, CancellationToken cancellationToken)
    {
        var existingCodes = await db.Templates
            .Where(t => t.Code.StartsWith(prefix))
            .Select(t => t.Code)
            .ToListAsync(cancellationToken);

        var maxNumber = 0;
        foreach (var code in existingCodes)
        {
            if (int.TryParse(code.AsSpan(prefix.Length), out var number) && number > maxNumber)
            {
                maxNumber = number;
            }
        }

        return $"{prefix}{(maxNumber + 1):D3}";
    }

    // Parses+validates a TemplateWriteRequest.EnvelopeId string (or returns
    // (null, null) for an empty one, clearing the assignment) and loads the
    // actual Envelope row in the same call, so Create/Update can both
    // validate the id and reuse the loaded row for ToDto's response without
    // a second query. Mirrors InvitationsController.ResolveTemplateIdAsync's
    // "non-empty but unresolvable id is a real error" convention.
    private async Task<(Envelope? Envelope, string? Error)> ResolveEnvelopeAsync(string? envelopeId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(envelopeId))
        {
            return (null, null);
        }
        if (!Guid.TryParse(envelopeId, out var id))
        {
            return (null, $"Unknown envelopeId '{envelopeId}'.");
        }
        var envelope = await db.Envelopes.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (envelope is null)
        {
            return (null, $"Unknown envelopeId '{envelopeId}'.");
        }
        return (envelope, null);
    }

    private static TemplateDto ToDto(Template t, int usageCount, Envelope? envelope) => new()
    {
        Id = t.Id.ToString().ToLowerInvariant(),
        Code = t.Code,
        Category = t.Category,
        ImageUrl = t.ImageUrl,
        BackgroundImageUrl = t.BackgroundImageUrl,
        Layout = t.Layout,
        PageBg = t.PageBg,
        CardBg = t.CardBg,
        TextColor = t.TextColor,
        PrimaryAccent = t.PrimaryAccent,
        DefaultNamesFont = t.DefaultNamesFont,
        EventTitleFont = t.EventTitleFont,
        ThankYouTextFont = t.ThankYouTextFont,
        FamilyNamesFont = t.FamilyNamesFont,
        InvitationTextFont = t.InvitationTextFont,
        DefaultMusicUrl = t.DefaultMusicUrl,
        DefaultMusicTitle = t.DefaultMusicTitle,
        HeroIllustrationUrl = t.HeroIllustrationUrl,
        DecorationImageUrl = t.DecorationImageUrl,
        OpeningVideoUrl = t.OpeningVideoUrl,
        AmbientVideoUrl = t.AmbientVideoUrl,
        EnvelopeInitialsXPercent = t.EnvelopeInitialsXPercent,
        EnvelopeInitialsYPercent = t.EnvelopeInitialsYPercent,
        EnvelopeCtaTextAr = t.EnvelopeCtaTextAr,
        EnvelopeCtaTextEn = t.EnvelopeCtaTextEn,
        EnvelopeCtaShape = t.EnvelopeCtaShape,
        EnvelopeCtaBgColor = t.EnvelopeCtaBgColor,
        EnvelopeCtaTextColor = t.EnvelopeCtaTextColor,
        AmbientEffect = t.AmbientEffect,
        EnvelopeStyle = t.EnvelopeStyle,
        HeroFrameStyle = t.HeroFrameStyle,
        DateRevealStyle = t.DateRevealStyle,
        InvitationCardStyle = t.InvitationCardStyle,
        SceneLayoutStyle = t.SceneLayoutStyle,
        ScenesJson = t.ScenesJson,
        EnvelopeId = t.EnvelopeId?.ToString().ToLowerInvariant(),
        EnvelopePhotoUrl = envelope?.PhotoUrl,
        EnvelopeSealXPercent = envelope?.SealXPercent,
        EnvelopeSealYPercent = envelope?.SealYPercent,
        EnvelopeOpeningStyle = envelope?.OpeningStyle,
        EnvelopeFoldPoints = EnvelopeFoldPointsJson.Parse(envelope?.FoldPointsJson),
        IsPopular = t.IsPopular,
        IsHomepageFeatured = t.IsHomepageFeatured,
        IsActive = t.IsActive,
        UsageCount = usageCount,
    };
}
