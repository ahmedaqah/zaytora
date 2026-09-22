using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Numinds.Api.Data;
using Numinds.Api.Models;
using Numinds.Api.Models.Dtos;
using Numinds.Api.Models.Entities;

namespace Numinds.Api.Controllers;

[ApiController]
[Route("api/pricing-settings")]
public class PricingSettingsController(NumindsDbContext db) : ControllerBase
{
    // Mirrors CurrencyContext's CURRENCY_CODES on the frontend.
    private static readonly HashSet<string> SupportedCurrencies = ["USD", "SAR", "GBP", "ILS", "AED", "JOD"];

    // GET /api/pricing-settings — public: Home/Prices/Studio all need the
    // live base price and QR rate to quote a price before checkout even starts.
    [HttpGet]
    public async Task<ActionResult<PricingSettingsDto>> Get(CancellationToken cancellationToken)
    {
        var settings = await db.PricingSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        return Ok(settings is null ? new PricingSettingsDto() : ToDto(settings));
    }

    [HttpPut]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PricingSettingsDto>> Update(
        [FromBody] PricingSettingsWriteRequest request,
        CancellationToken cancellationToken)
    {
        if (!SupportedCurrencies.Contains(request.DefaultCurrency))
        {
            return BadRequest(new { title = $"Unsupported currency '{request.DefaultCurrency}'." });
        }

        var settings = await db.PricingSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings is null)
        {
            settings = new PricingSettings { Id = Guid.NewGuid() };
            db.PricingSettings.Add(settings);
        }

        settings.BasePriceUsd = request.BasePriceUsd;
        settings.QrRateUsd = request.QrRateUsd;
        settings.GiftFeePercent = request.GiftFeePercent;
        settings.DefaultPartnerDiscountType = request.DefaultPartnerDiscountType;
        settings.DefaultPartnerDiscountValue = request.DefaultPartnerDiscountValue;
        settings.PlatformDiscountType = request.PlatformDiscountType;
        settings.PlatformDiscountValue = request.PlatformDiscountValue;
        settings.PlatformDiscountCode = request.PlatformDiscountCode;
        settings.DefaultCurrency = request.DefaultCurrency;

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(settings));
    }

    internal static PricingSettingsDto ToDto(PricingSettings s) => new()
    {
        BasePriceUsd = s.BasePriceUsd,
        QrRateUsd = s.QrRateUsd,
        GiftFeePercent = s.GiftFeePercent,
        DefaultPartnerDiscountType = s.DefaultPartnerDiscountType,
        DefaultPartnerDiscountValue = s.DefaultPartnerDiscountValue,
        PlatformDiscountType = s.PlatformDiscountType,
        PlatformDiscountValue = s.PlatformDiscountValue,
        PlatformDiscountCode = s.PlatformDiscountCode,
        DefaultCurrency = s.DefaultCurrency,
    };
}
