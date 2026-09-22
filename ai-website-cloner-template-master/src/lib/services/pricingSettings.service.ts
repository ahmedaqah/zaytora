"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { BASE_PRICE_USD, QR_GUEST_RATE_USD } from "@/lib/priceRates";
import type { PricingSettingsDto, PricingSettingsWriteRequest } from "@/types/api";

// Public — Home/Prices/Studio all need the live base price and QR rate to
// quote a price before checkout even starts.
export function getPricingSettings() {
  return apiClient.get<PricingSettingsDto>("/pricing-settings");
}

// Admin "/admin/pricing" form.
export function updatePricingSettings(payload: PricingSettingsWriteRequest) {
  return apiClient.put<PricingSettingsDto>("/pricing-settings", payload);
}

// Same shape as the seeded backend defaults — used only as a placeholder
// while the real fetch below is in flight, so a live price estimate never
// flashes $0 before settling on the real number.
const FALLBACK_PRICING: PricingSettingsDto = {
  basePriceUsd: BASE_PRICE_USD,
  qrRateUsd: QR_GUEST_RATE_USD,
  giftFeePercent: 5,
  defaultPartnerDiscountType: "percent",
  defaultPartnerDiscountValue: 0,
  platformDiscountType: "percent",
  platformDiscountValue: 0,
  platformDiscountCode: "",
  defaultCurrency: "ILS",
};

// Shared by every live price estimate (Home, Prices, Studio) so they all
// fetch the real settings the same way instead of duplicating the effect.
export function usePricingSettings(): PricingSettingsDto {
  const [settings, setSettings] = useState<PricingSettingsDto>(FALLBACK_PRICING);

  useEffect(() => {
    let cancelled = false;
    getPricingSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {
        // Fallback values already in state — nothing further to do.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
