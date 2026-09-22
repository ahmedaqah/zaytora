namespace Numinds.Api.Models.Dtos;

// Mirrors src/types/api.ts -> PricingSettingsDto.
public class PricingSettingsDto
{
    public decimal BasePriceUsd { get; set; }
    public decimal QrRateUsd { get; set; }
    public decimal GiftFeePercent { get; set; }
    public string DefaultPartnerDiscountType { get; set; } = "percent";
    public decimal DefaultPartnerDiscountValue { get; set; }
    public string PlatformDiscountType { get; set; } = "percent";
    public decimal PlatformDiscountValue { get; set; }
    public string PlatformDiscountCode { get; set; } = string.Empty;
    public string DefaultCurrency { get; set; } = "ILS";
}

public class PricingSettingsWriteRequest
{
    public decimal BasePriceUsd { get; set; }
    public decimal QrRateUsd { get; set; }
    public decimal GiftFeePercent { get; set; }
    public string DefaultPartnerDiscountType { get; set; } = "percent";
    public decimal DefaultPartnerDiscountValue { get; set; }
    public string PlatformDiscountType { get; set; } = "percent";
    public decimal PlatformDiscountValue { get; set; }
    public string PlatformDiscountCode { get; set; } = string.Empty;
    public string DefaultCurrency { get; set; } = "ILS";
}
