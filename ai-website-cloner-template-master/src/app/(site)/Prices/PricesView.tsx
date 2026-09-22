"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@/components/icons";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency, CURRENCY_CODES } from "@/context/CurrencyContext";
import { convertAmount, type PublicCurrencyCode } from "@/lib/priceRates";
import { usePricingSettings } from "@/lib/services/pricingSettings.service";

const COPY = {
  ar: {
    eyebrow: "أسعار بسيطة",
    headingLine1: "دعوة واحدة،",
    headingLine2: "سعر واحد",
    subheading: "اختر عملتك المفضلة. كل خطة تشمل تجربة الدعوة الكاملة مع جميع الميزات الفاخرة.",
    features: [
      "دعوة رقمية كاملة",
      "موسيقى ومعرض مخصص",
      "إدارة الردود",
      "رمز QR والمشاركة",
      "جميع القوالب الفاخرة",
    ],
    fxHint: "🔄 فقط اختر عملتك وسيتحول السعر تلقائياً إلى عملتك المحلية.",
    liveRates: "أسعار الصرف مباشرة",
    calculatorEyebrow: "حاسبة الأسعار",
    calculatorTitle: "احسب السعر الإجمالي",
    calculatorSubtitle: "أضف عدد الضيوف لمعرفة إجمالي التكلفة الفعلية بعملتك.",
    guestCountLabel: "دخول الضيوف عبر رمز QR",
    perGuest: "لكل ضيف",
    lineBase: "الدعوة الرقمية الأساسية",
    lineGuests: "دخول الضيوف عبر QR",
    lineTotal: "الإجمالي",
  },
  en: {
    eyebrow: "Simple pricing",
    headingLine1: "One invitation,",
    headingLine2: "one price",
    subheading: "Choose your preferred currency. Every plan includes the full invitation experience with all premium features.",
    features: [
      "Complete digital invitation",
      "Custom music & gallery",
      "RSVP management",
      "QR code & sharing",
      "All premium templates",
    ],
    fxHint: "🔄 Just pick your currency and the price converts automatically.",
    liveRates: "Live exchange rates",
    calculatorEyebrow: "Pricing Calculator",
    calculatorTitle: "Calculate your total",
    calculatorSubtitle: "Add your guest count to see your real total in your currency.",
    guestCountLabel: "QR guest check-in",
    perGuest: "per guest",
    lineBase: "Base digital invitation",
    lineGuests: "QR guest check-in",
    lineTotal: "Total",
  },
};

// Matches the reference site verbatim — its CTA reads "ابدأ الآن" regardless
// of the page's active language toggle, so this isn't run through COPY.
const START_CTA_LABEL = "ابدأ الآن";

const CURRENCY_SYMBOL: Record<PublicCurrencyCode, string> = {
  USD: "$",
  SAR: "ر.س",
  GBP: "£",
  ILS: "₪",
  AED: "د.إ",
  JOD: "د.أ",
};

const MAX_GUESTS = 1000;

function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CurrencyMeta {
  flag: string;
  name: Record<"ar" | "en", string>;
  accent: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  checkBg: string;
  checkText: string;
}

const CURRENCY_META: Record<PublicCurrencyCode, CurrencyMeta> = {
  GBP: {
    flag: "🇬🇧",
    name: { ar: "جنيه إسترليني", en: "British Pound" },
    accent: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-900/50 hover:border-violet-700",
    badgeBg: "bg-violet-100 dark:bg-violet-950/50",
    badgeText: "text-violet-700 dark:text-violet-400",
    checkBg: "bg-violet-100 dark:bg-violet-900/40",
    checkText: "text-violet-700 dark:text-violet-400",
  },
  USD: {
    flag: "🇺🇸",
    name: { ar: "دولار أمريكي", en: "US Dollar" },
    accent: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900/50 hover:border-blue-700",
    badgeBg: "bg-blue-100 dark:bg-blue-950/50",
    badgeText: "text-blue-700 dark:text-blue-400",
    checkBg: "bg-blue-100 dark:bg-blue-900/40",
    checkText: "text-blue-700 dark:text-blue-400",
  },
  SAR: {
    flag: "🇸🇦",
    name: { ar: "ريال سعودي", en: "Saudi Riyal" },
    accent: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-700",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/50",
    badgeText: "text-emerald-700 dark:text-emerald-400",
    checkBg: "bg-emerald-100 dark:bg-emerald-900/40",
    checkText: "text-emerald-700 dark:text-emerald-400",
  },
  ILS: {
    flag: "₪",
    name: { ar: "شيكل", en: "Shekel" },
    accent: "text-teal-700 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-900/50 hover:border-teal-700",
    badgeBg: "bg-teal-100 dark:bg-teal-950/50",
    badgeText: "text-teal-700 dark:text-teal-400",
    checkBg: "bg-teal-100 dark:bg-teal-900/40",
    checkText: "text-teal-700 dark:text-teal-400",
  },
  AED: {
    flag: "🇦🇪",
    name: { ar: "درهم إماراتي", en: "UAE Dirham" },
    accent: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900/50 hover:border-amber-700",
    badgeBg: "bg-amber-100 dark:bg-amber-950/50",
    badgeText: "text-amber-700 dark:text-amber-400",
    checkBg: "bg-amber-100 dark:bg-amber-900/40",
    checkText: "text-amber-700 dark:text-amber-400",
  },
  JOD: {
    flag: "🇯🇴",
    name: { ar: "دينار أردني", en: "Jordanian Dinar" },
    accent: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-900/50 hover:border-rose-700",
    badgeBg: "bg-rose-100 dark:bg-rose-950/50",
    badgeText: "text-rose-700 dark:text-rose-400",
    checkBg: "bg-rose-100 dark:bg-rose-900/40",
    checkText: "text-rose-700 dark:text-rose-400",
  },
};

function isCurrencyCode(value: string | null): value is PublicCurrencyCode {
  return !!value && (CURRENCY_CODES as string[]).includes(value);
}

export function PricesView() {
  const { language } = useLanguage();
  const t = COPY[language];
  const { currency, setCurrency, rates, ratesLoading } = useCurrency();
  const pricingConfig = usePricingSettings();
  const searchParams = useSearchParams();
  const [guestCount, setGuestCount] = useState(100);

  // Preserve a currency passed in from the home page's "View Pricing" link
  // (e.g. /Prices?currency=USD) so a fresh page load lands on the same
  // currency the visitor already picked, instead of resetting to default.
  useEffect(() => {
    const fromQuery = searchParams.get("currency");
    if (isCurrencyCode(fromQuery) && fromQuery !== currency) {
      setCurrency(fromQuery);
    }
    // Only ever react to the query param changing, not to local selections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleGuestCountChange(raw: number) {
    if (!Number.isFinite(raw)) {
      setGuestCount(0);
      return;
    }
    setGuestCount(Math.min(MAX_GUESTS, Math.max(0, Math.round(raw))));
  }

  const symbol = CURRENCY_SYMBOL[currency];
  const baseAmount = convertAmount(rates, currency, pricingConfig.basePriceUsd);
  const guestRate = convertAmount(rates, currency, pricingConfig.qrRateUsd);
  const guestAmount = guestCount * guestRate;
  const total = baseAmount + guestAmount;

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-sm text-[#C8A24A] font-medium tracking-widest uppercase mb-3">
            {t.eyebrow}
          </p>
          <h1 className="font-cinzel text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t.headingLine1}
            <br />
            {t.headingLine2}
          </h1>
          <p className="text-body-foreground max-w-xl mx-auto">{t.subheading}</p>
          <p className="text-xs text-muted-foreground mt-3">
            {ratesLoading ? "…" : `🔄 ${t.liveRates}`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CURRENCY_CODES.map((code) => {
            const meta = CURRENCY_META[code];
            const price = convertAmount(rates, code, pricingConfig.basePriceUsd);
            const selected = code === currency;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                className={cn(
                  "text-start rounded-2xl border bg-card p-6 transition-all duration-300",
                  meta.border,
                  selected && "ring-2 ring-offset-2 ring-offset-background ring-[#C8A24A]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                    meta.badgeBg,
                    meta.badgeText
                  )}
                >
                  {meta.flag} {code}
                </span>

                <div className="mt-4 flex items-end gap-1" dir="ltr">
                  <span className={cn("text-4xl font-bold", meta.accent)}>
                    {price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{meta.name[language]}</p>

                <ul className="mt-5 space-y-2">
                  {t.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-body-foreground">
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-full",
                          meta.checkBg,
                          meta.checkText
                        )}
                      >
                        <CheckIcon className="size-2.5" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">{t.fxHint}</p>

        <div className="mt-14 rounded-2xl border border-border bg-background/5 p-6 md:p-8">
          <div className="text-center mb-8">
            <p className="text-sm text-[#C8A24A] font-medium tracking-widest uppercase mb-2">
              {t.calculatorEyebrow}
            </p>
            <h2 className="font-cinzel text-2xl md:text-3xl font-bold text-foreground mb-2">
              {t.calculatorTitle}
            </h2>
            <p className="text-body-foreground text-sm max-w-md mx-auto">{t.calculatorSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="guest-count" className="text-sm font-medium text-body-foreground">
                  {t.guestCountLabel}
                </label>
                <span className="text-xs text-muted-foreground" dir="ltr">
                  {symbol} {formatAmount(guestRate)} {t.perGuest}
                </span>
              </div>
              <input
                id="guest-count-range"
                type="range"
                min={0}
                max={MAX_GUESTS}
                step={5}
                value={guestCount}
                onChange={(event) => handleGuestCountChange(Number(event.target.value))}
                className="w-full accent-[#C8A24A]"
              />
              <input
                id="guest-count"
                type="number"
                min={0}
                max={MAX_GUESTS}
                value={guestCount}
                onChange={(event) => handleGuestCountChange(Number(event.target.value))}
                dir="ltr"
                className="mt-2 w-full rounded-lg border border-border bg-background/5 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-[#C8A24A]"
              />
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-body-foreground">{t.lineBase}</span>
                <span className="text-foreground" dir="ltr">
                  {symbol} {formatAmount(baseAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-body-foreground">
                  {t.lineGuests} ({guestCount})
                </span>
                <span className="text-foreground" dir="ltr">
                  {symbol} {formatAmount(guestAmount)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between text-base font-semibold">
                <span className="text-foreground uppercase tracking-wide">{t.lineTotal}</span>
                <span className="text-[#C8A24A] text-xl" dir="ltr">
                  {symbol} {formatAmount(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <Link
            href={`/studio?currency=${currency}`}
            className="inline-block py-3 px-10 rounded-lg bg-gradient-to-r from-[#C8A24A] to-[#A68832] text-white font-medium transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            {START_CTA_LABEL}
          </Link>
        </div>
      </div>
    </div>
  );
}
