using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
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
[Route("api/partners")]
public class PartnersController(
    NumindsDbContext db,
    UserManager<ApplicationUser> userManager,
    IFileStorageService storage,
    IMemoryCache cache,
    IAdminNotifier notifier,
    IConfiguration configuration) : ControllerBase
{
    // Same reasoning as TemplatesController's CacheTtl — GET /api/partners/approved
    // is public, hit by every /OurPartners visitor, and rarely changes minute
    // to minute. _cacheVersion + BustCache() mirror TemplatesController's fix
    // for the same staleness bug: without it, an admin action that changes
    // approved-partner data (approve/reject/activate/discount/delete) could
    // stay invisible on the public page for up to ApprovedCacheTtl.
    private static readonly TimeSpan ApprovedCacheTtl = TimeSpan.FromMinutes(2);
    private static int _cacheVersion;
    private static void BustCache() => Interlocked.Increment(ref _cacheVersion);
    // POST /api/partners — requires an account (PartnerApplicationModal.tsx
    // gates the form on useAuth() before showing it) so an approved partner
    // has a login to reach their self-service profile at GET/PUT
    // /api/partners/me. Always lands as "pending" for an admin to review on
    // /admin/partners.
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<PartnerDto>> Apply(PartnerApplicationRequest request, CancellationToken cancellationToken)
    {
        var userId = await GetCurrentUserIdAsync();
        if (userId is null)
        {
            return Unauthorized();
        }

        // One application per account — otherwise the same person could
        // stack multiple pending/approved rows against one login.
        var alreadyApplied = await db.Partners.AnyAsync(p => p.UserId == userId, cancellationToken);
        if (alreadyApplied)
        {
            return Conflict(new { message = "You've already submitted a partner application with this account." });
        }

        var partner = new Partner
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BusinessName = request.BusinessName,
            ApplicantName = request.ApplicantName,
            Email = request.Email,
            Category = request.Category,
            Country = request.Country,
            CountryFlag = request.CountryFlag,
            Whatsapp = request.Whatsapp,
            Tagline = string.IsNullOrWhiteSpace(request.Tagline) ? null : request.Tagline,
            InstagramUrl = string.IsNullOrWhiteSpace(request.InstagramUrl) ? null : request.InstagramUrl,
            TikTokUrl = string.IsNullOrWhiteSpace(request.TikTokUrl) ? null : request.TikTokUrl,
            FacebookUrl = string.IsNullOrWhiteSpace(request.FacebookUrl) ? null : request.FacebookUrl,
            WebsiteUrl = string.IsNullOrWhiteSpace(request.WebsiteUrl) ? null : request.WebsiteUrl,
            LogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl,
            Status = "pending",
            Active = false,
            SubmittedAt = DateTime.UtcNow,
        };

        db.Partners.Add(partner);
        await db.SaveChangesAsync(cancellationToken);

        var siteBase = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
        notifier.Notify($"🤝 طلب شراكة جديد: {partner.BusinessName} ({partner.ApplicantName})\n{siteBase}/admin/partners");

        return CreatedAtAction(nameof(GetApproved), null, ToDto(partner));
    }

    // GET /api/partners/me — the logged-in partner's own profile, for the
    // self-service page at /dashboard/partner. 404 if this account never
    // applied (distinct from a rejected/pending application, which the
    // frontend renders as a status card instead).
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<PartnerDto>> GetMyProfile(CancellationToken cancellationToken)
    {
        var userId = await GetCurrentUserIdAsync();
        var partner = await db.Partners.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
        if (partner is null)
        {
            return NotFound();
        }
        return Ok(ToDto(partner));
    }

    // PUT /api/partners/me — self-service edit, only for an approved
    // partner's own record. Category/Email/PromoCode/Discount*/Status/Active
    // stay out of UpdateMyPartnerProfileRequest on purpose — those remain
    // admin-controlled from /admin/partners and /admin/pricing.
    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult<PartnerDto>> UpdateMyProfile(UpdateMyPartnerProfileRequest request, CancellationToken cancellationToken)
    {
        var userId = await GetCurrentUserIdAsync();
        var partner = await db.Partners.FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
        if (partner is null)
        {
            return NotFound();
        }
        if (partner.Status != "approved")
        {
            return Forbid();
        }

        var oldLogoUrl = partner.LogoUrl;

        partner.BusinessName = request.BusinessName;
        partner.Whatsapp = request.Whatsapp;
        partner.Tagline = string.IsNullOrWhiteSpace(request.Tagline) ? null : request.Tagline;
        partner.InstagramUrl = string.IsNullOrWhiteSpace(request.InstagramUrl) ? null : request.InstagramUrl;
        partner.TikTokUrl = string.IsNullOrWhiteSpace(request.TikTokUrl) ? null : request.TikTokUrl;
        partner.FacebookUrl = string.IsNullOrWhiteSpace(request.FacebookUrl) ? null : request.FacebookUrl;
        partner.WebsiteUrl = string.IsNullOrWhiteSpace(request.WebsiteUrl) ? null : request.WebsiteUrl;
        partner.LogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl;

        await db.SaveChangesAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(oldLogoUrl) && oldLogoUrl != partner.LogoUrl)
        {
            await storage.DeleteAsync(oldLogoUrl, cancellationToken);
        }

        return Ok(ToDto(partner));
    }

    // POST /api/partners/logo — called by PartnerApplicationModal (before
    // submitting) and the partner's own profile editor, so the returned URL
    // can ride along in LogoUrl. Uploaded to R2 (see IFileStorageService) —
    // Render's own disk is ephemeral and wipes uploads on every deploy.
    private const long MaxLogoBytes = 5 * 1024 * 1024;
    private static readonly Dictionary<string, string> AllowedLogoContentTypes = new()
    {
        ["image/png"] = ".png",
        ["image/jpeg"] = ".jpg",
    };

    [HttpPost("logo")]
    [Authorize]
    public async Task<ActionResult<PartnerLogoUploadResponse>> UploadLogo(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }
        if (file.Length > MaxLogoBytes)
        {
            return BadRequest(new { message = "Logo must be 5MB or smaller." });
        }
        if (!AllowedLogoContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            return BadRequest(new { message = "Logo must be a JPG or PNG image." });
        }

        var url = await storage.UploadAsync(file, "partners", extension, $"{Request.Scheme}://{Request.Host}", cancellationToken);
        return Ok(new PartnerLogoUploadResponse { Url = url });
    }

    // GET /api/partners/approved — public, /OurPartners.
    [HttpGet("approved")]
    public async Task<ActionResult<List<ApprovedPartnerDto>>> GetApproved(CancellationToken cancellationToken)
    {
        var cacheKey = $"partners:v{_cacheVersion}:approved";
        if (cache.TryGetValue(cacheKey, out List<ApprovedPartnerDto>? cached))
        {
            return Ok(cached);
        }

        var partners = await db.Partners
            .AsNoTracking()
            .Where(p => p.Status == "approved" && p.Active)
            .OrderByDescending(p => p.ApprovedAt)
            .Take(200)
            .ToListAsync(cancellationToken);

        var dtos = partners.Select(p => new ApprovedPartnerDto
        {
            Id = p.Id.ToString(),
            Name = p.BusinessName,
            Category = p.Category,
            Country = p.Country,
            CountryFlag = p.CountryFlag,
            Tagline = p.Tagline,
            Whatsapp = p.Whatsapp,
            InstagramUrl = p.InstagramUrl,
            TikTokUrl = p.TikTokUrl,
            FacebookUrl = p.FacebookUrl,
            WebsiteUrl = p.WebsiteUrl,
            LogoUrl = p.LogoUrl,
        }).ToList();

        cache.Set(cacheKey, dtos, ApprovedCacheTtl);
        return Ok(dtos);
    }

    // GET /api/partners — admin, for /admin/partners. `status` narrows to
    // one lifecycle stage (the page fetches "pending" and "approved"
    // separately — pending stays a small, fully-visible review queue, while
    // approved is the one that grows unbounded and gets search+pagination).
    // `search` matches BusinessName/ApplicantName/Email/PromoCode (indexed —
    // see NumindsDbContext).
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PagedResult<PartnerDto>>> List(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.Partners.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(p => p.Status == status);
        }

        var term = search?.Trim();
        if (!string.IsNullOrEmpty(term))
        {
            query = query.Where(p =>
                p.BusinessName.Contains(term) ||
                p.ApplicantName.Contains(term) ||
                p.Email.Contains(term) ||
                (p.PromoCode != null && p.PromoCode.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var partners = await query
            .OrderByDescending(p => p.SubmittedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<PartnerDto>
        {
            Items = partners.Select(ToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        });
    }

    // PATCH /api/partners/{id}/approve — generates a promo code and seeds the
    // default partner discount from PricingSettings.
    [HttpPatch("{id:guid}/approve")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PartnerDto>> Approve(Guid id, CancellationToken cancellationToken)
    {
        var partner = await db.Partners.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (partner is null)
        {
            return NotFound();
        }

        var pricing = await db.PricingSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);

        partner.Status = "approved";
        partner.Active = true;
        partner.ApprovedAt = DateTime.UtcNow;
        partner.PromoCode ??= await GeneratePromoCode(partner.BusinessName, cancellationToken);
        partner.DiscountType ??= pricing?.DefaultPartnerDiscountType ?? "percent";
        partner.DiscountValue ??= pricing?.DefaultPartnerDiscountValue ?? 0m;

        await db.SaveChangesAsync(cancellationToken);
        BustCache();
        return Ok(ToDto(partner));
    }

    // PATCH /api/partners/{id}/reject
    [HttpPatch("{id:guid}/reject")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PartnerDto>> Reject(Guid id, CancellationToken cancellationToken)
    {
        var partner = await db.Partners.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (partner is null)
        {
            return NotFound();
        }

        partner.Status = "rejected";
        partner.Active = false;
        await db.SaveChangesAsync(cancellationToken);
        BustCache();
        return Ok(ToDto(partner));
    }

    // PATCH /api/partners/{id}/active — pause/resume an approved partner
    // without losing their stats (usage count, revenue, promo code).
    [HttpPatch("{id:guid}/active")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PartnerDto>> SetActive(Guid id, SetPartnerActiveRequest request, CancellationToken cancellationToken)
    {
        var partner = await db.Partners.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (partner is null)
        {
            return NotFound();
        }

        partner.Active = request.Active;
        await db.SaveChangesAsync(cancellationToken);
        BustCache();
        return Ok(ToDto(partner));
    }

    // PUT /api/partners/{id}/discount — used from /admin/pricing's per-partner
    // override. Also lets the admin rename the auto-generated promo code,
    // since businesses often want something more memorable than the
    // "PARTNER-<BUSINESSNAME>" default from GeneratePromoCode.
    [HttpPut("{id:guid}/discount")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PartnerDto>> UpdateDiscount(Guid id, UpdatePartnerDiscountRequest request, CancellationToken cancellationToken)
    {
        var partner = await db.Partners.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (partner is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.PromoCode))
        {
            var trimmedCode = request.PromoCode.Trim().ToUpperInvariant();
            var codeTaken = await db.Partners.AnyAsync(p => p.Id != id && p.PromoCode == trimmedCode, cancellationToken);
            if (codeTaken)
            {
                return Conflict(new { message = "This promo code is already in use by another partner." });
            }
            partner.PromoCode = trimmedCode;
        }

        partner.DiscountType = request.DiscountType;
        partner.DiscountValue = request.DiscountValue;
        await db.SaveChangesAsync(cancellationToken);
        BustCache();
        return Ok(ToDto(partner));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var partner = await db.Partners.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (partner is null)
        {
            return NotFound();
        }

        db.Partners.Remove(partner);
        await db.SaveChangesAsync(cancellationToken);
        BustCache();

        await storage.DeleteAsync(partner.LogoUrl, cancellationToken);

        return NoContent();
    }

    private async Task<Guid?> GetCurrentUserIdAsync()
    {
        if (User.Identity?.IsAuthenticated != true) return null;
        var user = await userManager.GetUserAsync(User);
        return user?.Id;
    }

    // "PARTNER-<SANITIZED-UPPER-BUSINESS-NAME>", capped and de-duplicated —
    // ports adminPartnersStore.ts's generatePromoCode to the server, now the
    // single source of truth since checkout validates codes here too.
    private async Task<string> GeneratePromoCode(string businessName, CancellationToken cancellationToken)
    {
        var sanitized = new string(businessName.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        if (sanitized.Length > 20) sanitized = sanitized[..20];
        if (sanitized.Length == 0) sanitized = "PARTNER";

        var baseCode = $"PARTNER-{sanitized}";
        var code = baseCode;
        var suffix = 2;
        while (await db.Partners.AnyAsync(p => p.PromoCode == code, cancellationToken))
        {
            code = $"{baseCode}{suffix}";
            suffix++;
        }
        return code;
    }

    private static PartnerDto ToDto(Partner p) => new()
    {
        Id = p.Id.ToString(),
        BusinessName = p.BusinessName,
        ApplicantName = p.ApplicantName,
        Email = p.Email,
        Category = p.Category,
        Country = p.Country,
        CountryFlag = p.CountryFlag,
        Whatsapp = p.Whatsapp,
        Tagline = p.Tagline,
        InstagramUrl = p.InstagramUrl,
        TikTokUrl = p.TikTokUrl,
        FacebookUrl = p.FacebookUrl,
        WebsiteUrl = p.WebsiteUrl,
        LogoUrl = p.LogoUrl,
        Status = p.Status,
        Active = p.Active,
        PromoCode = p.PromoCode,
        UsageCount = p.UsageCount,
        RevenueUsd = p.RevenueUsd,
        DiscountType = p.DiscountType,
        DiscountValue = p.DiscountValue,
        SubmittedAt = p.SubmittedAt,
        ApprovedAt = p.ApprovedAt,
    };
}
