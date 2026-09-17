"use client";

import { useEffect, useRef, useState } from "react";
import { CardIcon, CheckIcon, ChevronLeftIcon, InfoIcon, LoaderIcon, MailIcon, UserIcon } from "@/components/icons";
import { CountrySelect } from "@/components/CountrySelect";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRICE_RATES,
  loadPriceRates,
  convertAmount,
  type PriceCurrencyCode,
  type PriceRates,
} from "@/lib/priceRates";
import { getPricingSettings } from "@/lib/services/pricingSettings.service";
import { createOrder, checkPromoCode } from "@/lib/services/orders.service";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api/client";
import type { PricingSettingsDto, OrderCreatedResponse } from "@/types/api";
import type { InvitationDetail } from "@/types/studio";

// Every line item here is USD-denominated off the real PricingSettings
// (/admin/pricing) — the same base price and QR guest rate advertised on
// the Home/Prices pages and used by Step16QrEntry's estimate — converted
// via priceRates' live FX rates so the numbers a shopper sees at checkout
// always match what they were quoted earlier in the flow. There is no
// payment gateway: "Place Order" creates a real, persisted Order and hands
// off to a confirmation screen showing the admin's manual-transfer receiving
// account; an admin marks it paid once they've actually received the money.

const CURRENCY_META: Record<PriceCurrencyCode, { symbol: string; label: Record<"ar" | "en", string> }> = {
  USD: { symbol: "$", label: { ar: "USD - دولار أمريكي", en: "USD - US Dollar" } },
  EUR: { symbol: "€", label: { ar: "EUR - يورو", en: "EUR - Euro" } },
  GBP: { symbol: "£", label: { ar: "GBP - جنيه إسترليني", en: "GBP - British Pound" } },
  SAR: { symbol: "ريال", label: { ar: "SAR - ريال سعودي", en: "SAR - Saudi Riyal" } },
  ILS: { symbol: "₪", label: { ar: "ILS - شيكل إسرائيلي", en: "ILS - Israeli Shekel" } },
};

const DEFAULT_PRICING: PricingSettingsDto = {
  basePriceUsd: 0,
  qrRateUsd: 0,
  giftFeePercent: 0,
  defaultPartnerDiscountType: "percent",
  defaultPartnerDiscountValue: 0,
  platformDiscountType: "percent",
  platformDiscountValue: 0,
  platformDiscountCode: "",
};

const COPY = {
  ar: {
    badgeTitle: "دعوة مميزة",
    badgeSubtitle: "افتح جميع المميزات لدعوتك",
    includedFeatures: ["رابط مشاركة عام", "توليد رمز QR", "جمع الردود", "صورة ستوري لوسائل التواصل"],
    partnerCodeLabel: "كود الشريك (اختياري)",
    partnerCodePlaceholder: "مثال: PARTNER2026",
    checking: "...",
    check: "تحقق",
    invalidCode: "الكود غير صالح",
    discountBadge: "تم تطبيق خصم الشريك 🏷️",
    nameLabel: "الاسم الكامل",
    emailLabel: "البريد الإلكتروني",
    countryLabel: "الدولة / المنطقة",
    currencyLabel: "العملة",
    fxNotice: "الأسعار أدناه محوّلة تقريبياً للعملة المختارة — المبلغ النهائي يُحدَّد عند التحويل الفعلي.",
    premiumInvitation: "دعوة مميزة",
    qrEntry: "دخول الضيوف عبر QR",
    giftFee: "رسم قسم الهدايا",
    total: "الإجمالي",
    placeOrder: "إتمام الطلب",
    manualPaymentNotice: "لا توجد بوابة دفع إلكترونية — بعد إتمام الطلب ستظهر لك تفاصيل حساب التحويل اليدوي.",
    backToDesign: "العودة للتصميم",
    missingFields: "الرجاء إدخال الاسم والبريد الإلكتروني واختيار الدولة.",
    orderError: "تعذّر إنشاء الطلب. حاول مرة أخرى.",
  },
  en: {
    badgeTitle: "Premium Invitation",
    badgeSubtitle: "Unlock all the features for your invitation",
    includedFeatures: ["Public share link", "QR code generation", "RSVP collection", "Social media story image"],
    partnerCodeLabel: "Partner code (optional)",
    partnerCodePlaceholder: "e.g. PARTNER2026",
    checking: "...",
    check: "Check",
    invalidCode: "Invalid code",
    discountBadge: "Partner Discount Applied 🏷️",
    nameLabel: "Full name",
    emailLabel: "Email",
    countryLabel: "Country / Region",
    currencyLabel: "Currency",
    fxNotice: "Prices below are an approximate conversion — the final amount is set when you actually transfer it.",
    premiumInvitation: "Premium invitation",
    qrEntry: "QR guest entry",
    giftFee: "Gift section fee",
    total: "Total",
    placeOrder: "Place Order",
    manualPaymentNotice: "There's no online payment gateway — after placing your order you'll see manual transfer account details.",
    backToDesign: "Back to design",
    missingFields: "Please enter your name, email, and select your country.",
    orderError: "Couldn't create the order. Please try again.",
  },
};

export function PaymentPhase({
  value,
  onBack,
  onOrderCreated,
}: {
  value: InvitationDetail;
  onBack: () => void;
  onOrderCreated: (result: OrderCreatedResponse) => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const { user } = useAuth();
  // Seeded from the currency picked on the home page / Prices page (shared
  // context, persisted across the session) and kept in sync with it until
  // the shopper explicitly overrides it via the dropdown below.
  const { currency: sharedCurrency } = useCurrency();
  const [currency, setCurrency] = useState<PriceCurrencyCode>(sharedCurrency);
  const currencyOverriddenRef = useRef(false);
  const [usdRates, setUsdRates] = useState<PriceRates>(DEFAULT_PRICE_RATES);
  const [pricing, setPricing] = useState<PricingSettingsDto>(DEFAULT_PRICING);

  const [customerName, setCustomerName] = useState(user?.displayName ?? "");
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? "");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!currencyOverriddenRef.current) setCurrency(sharedCurrency);
  }, [sharedCurrency]);

  function handleCurrencyChange(code: PriceCurrencyCode) {
    currencyOverriddenRef.current = true;
    setCurrency(code);
  }
  const [partnerCode, setPartnerCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: "percent" | "fixed"; value: number } | null>(null);
  const partnerDiscountApplied = appliedDiscount !== null;
  const [checkingCode, setCheckingCode] = useState(false);
  // Set only after a checked code comes back invalid — cleared the instant
  // the input changes, so it never lingers after the shopper starts typing
  // a different code.
  const [codeInvalid, setCodeInvalid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPriceRates().then((loaded) => {
      if (!cancelled) setUsdRates(loaded);
    });
    getPricingSettings()
      .then((loaded) => {
        if (!cancelled) setPricing(loaded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Live preview only — the server independently re-validates the code and
  // computes the authoritative amount when the order is actually created,
  // so a stale/tampered client-side estimate here can't under-charge.
  const guestCount = value.qrGuestCount ?? 50;
  const qrPriceUsd = value.enableQrEntry ? guestCount * pricing.qrRateUsd : 0;
  const basePriceUsd = appliedDiscount
    ? applyDiscount(pricing.basePriceUsd, appliedDiscount.type, appliedDiscount.value)
    : pricing.basePriceUsd;
  const giftFeeUsd = value.enableGifts ? basePriceUsd * (pricing.giftFeePercent / 100) : 0;

  const { symbol } = CURRENCY_META[currency];
  const baseAmount = convertAmount(usdRates, currency, basePriceUsd);
  const originalBaseAmount = convertAmount(usdRates, currency, pricing.basePriceUsd);
  const giftAmount = convertAmount(usdRates, currency, giftFeeUsd);
  const qrAmount = convertAmount(usdRates, currency, qrPriceUsd);
  const totalAmount = baseAmount + qrAmount + giftAmount;

  function fmt(amount: number) {
    return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function applyDiscount(amount: number, type: "percent" | "fixed", discountValue: number) {
    return type === "fixed" ? Math.max(0, amount - discountValue) : amount * (1 - discountValue / 100);
  }

  async function checkPartnerCode() {
    const code = partnerCode.trim();
    if (!code) return;
    setCheckingCode(true);
    setCodeInvalid(false);
    try {
      // Checks both the platform-wide code and per-partner codes
      // server-side — Create re-validates independently at order time too,
      // so a stale/tampered client-side result here can't under-charge.
      const result = await checkPromoCode(code);
      if (result.valid && result.discountType && result.discountValue != null) {
        setAppliedDiscount({ type: result.discountType, value: result.discountValue });
      } else {
        setAppliedDiscount(null);
        setCodeInvalid(true);
      }
    } catch {
      setAppliedDiscount(null);
      setCodeInvalid(true);
    } finally {
      setCheckingCode(false);
    }
  }

  async function handlePlaceOrder() {
    if (!customerName.trim() || !customerEmail.trim() || !country) {
      setSubmitError(t.missingFields);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createOrder({
        invitationId: value.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        enableQrEntry: value.enableQrEntry,
        qrGuestCount: value.qrGuestCount,
        enableGifts: value.enableGifts,
        giftFeeCoverage: value.enableGifts,
        promoCode: partnerCode.trim() || null,
        country,
        currency,
        convertedAmount: totalAmount,
      });
      onOrderCreated(result);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : t.orderError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Full-width header banner */}
      <div className="flex items-center gap-3 rounded-t-2xl bg-gradient-to-l from-gold to-[#E4C878] px-6 py-5 text-white">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background/20">
          <CardIcon className="size-5" />
        </span>
        <div>
          <p className="text-base font-semibold">{t.badgeTitle}</p>
          <p className="text-xs text-white/85">{t.badgeSubtitle}</p>
        </div>
      </div>

      <div className="space-y-5 px-6 py-6">
        {/* Included features */}
        <ul className="space-y-1.5">
          {t.includedFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-body-foreground">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                <CheckIcon className="size-2.5" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {/* Customer details */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-body-foreground">{t.nameLabel}</label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="w-full rounded-xl border border-border bg-background/5 py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors focus:border-gold"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-body-foreground">{t.emailLabel}</label>
            <div className="relative">
              <MailIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                dir="ltr"
                className="w-full rounded-xl border border-border bg-background/5 py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors focus:border-gold"
              />
            </div>
          </div>
        </div>

        {/* Partner code */}
        <div>
          <label className="mb-1.5 block text-sm text-body-foreground">{t.partnerCodeLabel}</label>
          <div className="flex gap-2">
            <input
              value={partnerCode}
              onChange={(event) => {
                setPartnerCode(event.target.value);
                setAppliedDiscount(null);
                setCodeInvalid(false);
              }}
              placeholder={t.partnerCodePlaceholder}
              className="flex-1 rounded-xl border border-border bg-background/5 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-gold"
            />
            <button
              type="button"
              onClick={checkPartnerCode}
              disabled={!partnerCode.trim() || checkingCode}
              className="rounded-xl border border-gold/40 px-4 text-sm font-medium text-gold transition-colors hover:bg-gold/5 disabled:opacity-40"
            >
              {checkingCode ? t.checking : t.check}
            </button>
          </div>
          {partnerDiscountApplied && (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {t.discountBadge}
            </p>
          )}
          {codeInvalid && (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-400">
              {t.invalidCode}
            </p>
          )}
        </div>

        {/* Country / region -- picks which of the admin's PaymentAccount
            rows the confirmation screen shows after this order is placed
            (see PaymentSettingsController.ResolveForCountryAsync). */}
        <div>
          <label className="mb-1.5 block text-sm text-body-foreground">{t.countryLabel}</label>
          <CountrySelect language={language} value={country} onChange={setCountry} />
        </div>

        {/* Currency */}
        <div>
          <label className="mb-1.5 block text-sm text-body-foreground">{t.currencyLabel}</label>
          <select
            value={currency}
            onChange={(event) => handleCurrencyChange(event.target.value as PriceCurrencyCode)}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors [color-scheme:dark] focus:border-gold"
          >
            {(Object.keys(CURRENCY_META) as PriceCurrencyCode[]).map((code) => (
              <option key={code} value={code}>
                {CURRENCY_META[code].label[language]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-100 dark:bg-sky-950/30 px-3.5 py-3">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-sky-700 dark:text-sky-400" />
          <p className="text-xs leading-relaxed text-sky-600 dark:text-sky-300">{t.fxNotice}</p>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-body-foreground">{t.premiumInvitation}</span>
            <span dir="ltr" className="flex items-center gap-2">
              {partnerDiscountApplied && (
                <span className="text-xs text-muted-foreground line-through">
                  {symbol} {fmt(originalBaseAmount)}
                </span>
              )}
              <span className={partnerDiscountApplied ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-foreground"}>
                {symbol} {fmt(baseAmount)}
              </span>
            </span>
          </div>
          {value.enableQrEntry && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-body-foreground">{t.qrEntry}</span>
              <span dir="ltr" className="text-foreground">
                {symbol} {fmt(qrAmount)}
              </span>
            </div>
          )}
          {giftAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-body-foreground">{t.giftFee}</span>
              <span dir="ltr" className="text-foreground">
                {symbol} {fmt(giftAmount)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
            <span className="uppercase tracking-wide text-foreground">{t.total}</span>
            <span dir="ltr" className="text-gold">
              {symbol} {fmt(totalAmount)}
            </span>
          </div>
        </div>

        {submitError && <p className="text-sm text-rose-700 dark:text-rose-400">{submitError}</p>}

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={submitting}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-medium text-white transition-colors hover:bg-gold/90 disabled:opacity-60"
          )}
        >
          {submitting ? <LoaderIcon className="size-4 animate-spin" /> : `${t.placeOrder} — ${symbol} ${fmt(totalAmount)}`}
        </button>
        <p className="text-center text-xs text-muted-foreground">{t.manualPaymentNotice}</p>

        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center gap-1 rounded-xl border border-border py-2.5 text-sm font-medium text-body-foreground transition-colors hover:bg-background/5"
        >
          <ChevronLeftIcon className="size-4" />
          {t.backToDesign}
        </button>
      </div>
    </div>
  );
}
