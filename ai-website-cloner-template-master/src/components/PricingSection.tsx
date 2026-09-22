"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
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
    chooseCurrency: "اختر العملة",
    fxHint: "🔄 فقط اختر عملتك وسيتحول السعر تلقائياً إلى عملتك المحلية.",
  },
  en: {
    eyebrow: "Simple pricing",
    headingLine1: "One invitation,",
    headingLine2: "one price",
    subheading: "Choose your preferred currency. Every plan includes the full invitation experience with all premium features.",
    chooseCurrency: "Choose currency",
    fxHint: "🔄 Just pick your currency and the price converts automatically.",
  },
};

// Matches the reference site verbatim — its CTA reads "View Pricing" in
// English regardless of the page's active language toggle.
const VIEW_PRICING_CTA_LABEL = "View Pricing";

interface CurrencyMeta {
  flag: string;
  name: Record<"ar" | "en", string>;
  accentGradient: string;
}

const CURRENCY_META: Record<PublicCurrencyCode, CurrencyMeta> = {
  SAR: {
    flag: "🇸🇦",
    name: { ar: "ريال سعودي", en: "Saudi Riyal" },
    accentGradient: "from-[#006C35] to-[#00A651]",
  },
  USD: {
    flag: "🇺🇸",
    name: { ar: "دولار أمريكي", en: "US Dollar" },
    accentGradient: "from-[#3C3B6E] to-[#5A5898]",
  },
  GBP: {
    flag: "🇬🇧",
    name: { ar: "جنيه إسترليني", en: "British Pound" },
    accentGradient: "from-[#012169] to-[#1A3E9A]",
  },
  ILS: {
    flag: "₪",
    name: { ar: "شيكل", en: "Shekel" },
    accentGradient: "from-[#0038B8] to-[#3E6BE0]",
  },
  AED: {
    flag: "🇦🇪",
    name: { ar: "درهم إماراتي", en: "UAE Dirham" },
    accentGradient: "from-[#CE1126] to-[#046A38]",
  },
  JOD: {
    flag: "🇯🇴",
    name: { ar: "دينار أردني", en: "Jordanian Dinar" },
    accentGradient: "from-[#141414] to-[#CE1126]",
  },
};

export function PricingSection() {
  const { language } = useLanguage();
  const t = COPY[language];
  const { currency, setCurrency, rates } = useCurrency();
  const pricingConfig = usePricingSettings();

  const meta = CURRENCY_META[currency];
  const price = convertAmount(rates, currency, pricingConfig.basePriceUsd);

  return (
    <section id="pricing" className="py-28 relative overflow-hidden">
      <div className="absolute rounded-full blur-3xl opacity-10 w-[600px] h-[600px] top-0 right-0 bg-[#C8A24A]" />
      <div className="absolute rounded-full blur-3xl opacity-10 w-[500px] h-[500px] bottom-0 left-0 bg-[#C8A24A]" />

      <div className="max-w-3xl mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <p className="text-sm text-[#C8A24A] font-medium tracking-widest uppercase mb-3">
            {t.eyebrow}
          </p>
          <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t.headingLine1}
            <br />
            {t.headingLine2}
          </h2>
          <p className="text-body-foreground">{t.subheading}</p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C8A24A] to-[#A68832] rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-300" />

          <div className="relative bg-card rounded-2xl p-8 md:p-12 border border-border">
            <div
              className={cn(
                "h-1 w-12 rounded-full bg-gradient-to-r mb-6 mx-auto",
                meta.accentGradient
              )}
            />

            <div className="space-y-6 flex flex-col items-center text-center">
              <p className="text-sm text-muted-foreground">
                {meta.flag} {meta.name[language]}
              </p>
              <div className="flex items-end gap-2">
                <span className="text-gradient-gold text-6xl font-bold" dir="ltr">
                  {price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-lg text-muted-foreground">{currency}</span>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent my-6" />

            <Link
              href={`/Prices?currency=${currency}`}
              className="block w-full text-center py-3 px-6 rounded-lg bg-gradient-to-r from-[#C8A24A] to-[#A68832] text-white font-medium transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
            >
              {VIEW_PRICING_CTA_LABEL}
            </Link>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3 text-center mt-10">
          {t.chooseCurrency}
        </p>
        <div className="flex items-center justify-center gap-2">
          {CURRENCY_CODES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setCurrency(code)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 border",
                code === currency
                  ? "bg-[#C8A24A] text-white border-transparent"
                  : "bg-background/5 text-body-foreground border-border"
              )}
            >
              <span>{CURRENCY_META[code].flag}</span>
              <span>{code}</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">{t.fxHint}</p>
      </div>
    </section>
  );
}
