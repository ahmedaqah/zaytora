"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderIcon, SaveIcon, TicketIcon } from "@/components/icons";
import { useLanguage } from "@/context/LanguageContext";
import { getPricingSettings, updatePricingSettings } from "@/lib/services/pricingSettings.service";
import { listPartners, updatePartnerDiscount } from "@/lib/services/partners.service";
import { ApiError } from "@/lib/api/client";
import { formatUsd } from "@/lib/format";
import { CURRENCY_CODES } from "@/context/CurrencyContext";
import type { PublicCurrencyCode } from "@/lib/priceRates";
import type { PartnerDto, PricingSettingsDto } from "@/types/api";

const CURRENCY_NAMES: Record<PublicCurrencyCode, Record<"ar" | "en", string>> = {
  USD: { ar: "دولار أمريكي", en: "US Dollar" },
  SAR: { ar: "ريال سعودي", en: "Saudi Riyal" },
  GBP: { ar: "جنيه إسترليني", en: "British Pound" },
  ILS: { ar: "شيكل إسرائيلي", en: "Israeli Shekel" },
  AED: { ar: "درهم إماراتي", en: "UAE Dirham" },
  JOD: { ar: "دينار أردني", en: "Jordanian Dinar" },
};

const COPY = {
  ar: {
    subtitle: "تحكّم بالسعر الأساسي وسعر دخول الضيوف عبر QR، وأدر أكواد الخصم.",
    basePriceLabel: "السعر الأساسي (دولار أمريكي)",
    qrRateLabel: "سعر دخول الضيف عبر QR (دولار أمريكي)",
    giftFeeLabel: "نسبة رسم تفعيل الهدايا (%)",
    giftFeeHint: "تُضاف هذه النسبة على السعر الأساسي عندما يفعّل صاحب الدعوة \"إضافة رسم الهدايا\" في خطوة الهدية.",
    defaultCurrencyLabel: "العملة الافتراضية للموقع",
    defaultCurrencyHint: "العملة اللي بتظهر تلقائياً للزائر الجديد بالصفحة الرئيسية وخطوة الدفع، قبل ما يغيّرها بنفسه.",
    save: "حفظ التغييرات",
    saved: "تم حفظ الأسعار الجديدة، وستنعكس فوراً في الصفحة الرئيسية وصفحة الأسعار والدفع.",
    previewTitle: "معاينة حية",
    previewLine: (guests: number) => `مثال: ${guests} ضيف`,
    previewBase: "السعر الأساسي",
    previewQr: "دخول الضيوف عبر QR",
    previewTotal: "الإجمالي",
    defaultDiscountTitle: "الخصم الافتراضي للشركاء الجدد",
    defaultDiscountHint: "يُطبَّق تلقائياً عند اعتماد شريك جديد من صفحة الشركاء، ويمكن تعديله لاحقاً لكل شريك على حدة.",
    promoTitle: "أكواد الخصم النشطة",
    promoPlatform: "كود المنصة الثابت",
    promoPartner: "أكواد الشركاء",
    codeLabel: "الكود",
    business: "النشاط التجاري",
    code: "الكود",
    discount: "الخصم",
    usage: "الاستخدام",
    saveDiscounts: "حفظ التغييرات",
    discountsSaved: "تم حفظ أكواد الخصم بنجاح.",
    noPartnerCodes: "لا توجد أكواد شركاء بعد — اعتمد شريكاً من صفحة الشركاء.",
    typePercent: "نسبة مئوية %",
    typeFixed: "مبلغ ثابت $",
    loadError: "تعذّر تحميل بيانات التسعير.",
    codeTaken: "هذا الكود مستخدم من قبل شريك آخر.",
  },
  en: {
    subtitle: "Control the base price and QR guest-entry rate, and manage discount codes.",
    basePriceLabel: "Base price (USD)",
    qrRateLabel: "QR guest entry rate (USD)",
    giftFeeLabel: "Gift-activation fee (%)",
    giftFeeHint: "Added on top of the base price when an invitation owner turns on \"Add gift fee\" in the Gift step.",
    defaultCurrencyLabel: "Site default currency",
    defaultCurrencyHint: "The currency a new visitor sees by default on Home and at checkout, before they switch it themselves.",
    save: "Save changes",
    saved: "New pricing saved — it reflects immediately on the Home, Prices, and checkout pages.",
    previewTitle: "Live preview",
    previewLine: (guests: number) => `Example: ${guests} guests`,
    previewBase: "Base price",
    previewQr: "QR guest entry",
    previewTotal: "Total",
    defaultDiscountTitle: "Default discount for new partners",
    defaultDiscountHint: "Applied automatically when a new partner is approved on the Partners page — editable per-partner afterward.",
    promoTitle: "Active discount codes",
    promoPlatform: "Fixed platform code",
    promoPartner: "Partner codes",
    codeLabel: "Code",
    business: "Business",
    code: "Code",
    discount: "Discount",
    usage: "Usage",
    saveDiscounts: "Save changes",
    discountsSaved: "Discount codes saved successfully.",
    noPartnerCodes: "No partner codes yet — approve a partner on the Partners page.",
    typePercent: "Percentage %",
    typeFixed: "Fixed amount $",
    loadError: "Couldn't load pricing settings.",
    codeTaken: "This code is already used by another partner.",
  },
};

const PREVIEW_GUESTS = 100;

type DiscountType = "percent" | "fixed";

interface DiscountDraft {
  type: DiscountType;
  value: string;
}

function DiscountEditor({
  draft,
  onChange,
  typeLabels,
}: {
  draft: DiscountDraft;
  onChange: (draft: DiscountDraft) => void;
  typeLabels: { percent: string; fixed: string };
}) {
  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      <select
        value={draft.type}
        onChange={(event) => onChange({ ...draft, type: event.target.value as DiscountType })}
        className="shrink-0 rounded-lg border border-border py-1.5 ps-2 pe-1 text-xs text-body-foreground outline-none focus:border-[#C8A24A]"
      >
        <option value="percent">{typeLabels.percent}</option>
        <option value="fixed">{typeLabels.fixed}</option>
      </select>
      <div className="relative w-20 shrink-0">
        <span className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {draft.type === "fixed" ? "$" : "%"}
        </span>
        <input
          type="number"
          min={0}
          step={0.1}
          value={draft.value}
          onChange={(event) => onChange({ ...draft, value: event.target.value })}
          className="w-full rounded-lg border border-border py-1.5 ps-5 pe-2 text-xs text-foreground outline-none focus:border-[#C8A24A]"
        />
      </div>
    </div>
  );
}

const PLATFORM_KEY = "__platform__";

export default function AdminPricingPage() {
  const { language } = useLanguage();
  const t = COPY[language];

  const [pricing, setPricing] = useState<PricingSettingsDto | null>(null);
  const [partners, setPartners] = useState<PartnerDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [basePriceInput, setBasePriceInput] = useState("0");
  const [qrRateInput, setQrRateInput] = useState("0");
  const [giftFeeInput, setGiftFeeInput] = useState("0");
  const [defaultCurrencyInput, setDefaultCurrencyInput] = useState<PublicCurrencyCode>("ILS");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [defaultDraft, setDefaultDraft] = useState<DiscountDraft>({ type: "percent", value: "0" });
  const [platformCodeInput, setPlatformCodeInput] = useState("");
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, DiscountDraft>>({});
  const [promoCodeDrafts, setPromoCodeDrafts] = useState<Record<string, string>>({});
  const [promoCodeErrors, setPromoCodeErrors] = useState<Record<string, string>>({});
  const [savingDiscounts, setSavingDiscounts] = useState(false);
  const [discountsSaved, setDiscountsSaved] = useState(false);

  const partnerCodes = partners.filter((p) => p.status === "approved" && p.promoCode);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // pageSize:500 — this page needs every approved partner to build the
      // discount-code editor, not just one paginated slice.
      const [pricingData, partnersData] = await Promise.all([getPricingSettings(), listPartners({ pageSize: 500 })]);
      setPricing(pricingData);
      setPartners(partnersData.items);
      setBasePriceInput(String(pricingData.basePriceUsd));
      setQrRateInput(String(pricingData.qrRateUsd));
      setGiftFeeInput(String(pricingData.giftFeePercent));
      setDefaultCurrencyInput(pricingData.defaultCurrency);
      setDefaultDraft({
        type: pricingData.defaultPartnerDiscountType,
        value: String(pricingData.defaultPartnerDiscountValue),
      });
      setPlatformCodeInput(pricingData.platformDiscountCode);
      setDiscountDrafts((current) => ({
        ...current,
        [PLATFORM_KEY]: {
          type: pricingData.platformDiscountType,
          value: String(pricingData.platformDiscountValue),
        },
        ...Object.fromEntries(
          partnersData.items
            .filter((p) => p.status === "approved" && p.promoCode)
            .map((p) => [
              p.id,
              {
                type: (p.discountType ?? pricingData.defaultPartnerDiscountType) as DiscountType,
                value: String(p.discountValue ?? pricingData.defaultPartnerDiscountValue),
              },
            ])
        ),
      }));
      setPromoCodeDrafts(
        Object.fromEntries(
          partnersData.items
            .filter((p) => p.status === "approved" && p.promoCode)
            .map((p) => [p.id, p.promoCode ?? ""])
        )
      );
      setPromoCodeErrors({});
    } catch (error) {
      console.error("[admin/pricing] failed to load:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const basePriceValue = Number(basePriceInput);
  const qrRateValue = Number(qrRateInput);
  const giftFeeValue = Number(giftFeeInput);
  const canSave = basePriceValue > 0 && qrRateValue > 0 && giftFeeValue >= 0;

  async function handleSave() {
    if (!canSave || !pricing) return;
    setSaving(true);
    try {
      const updated = await updatePricingSettings({
        ...pricing,
        basePriceUsd: basePriceValue,
        qrRateUsd: qrRateValue,
        giftFeePercent: giftFeeValue,
        defaultCurrency: defaultCurrencyInput,
      });
      setPricing(updated);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("[admin/pricing] failed to save pricing:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDiscounts() {
    if (!pricing) return;
    setSavingDiscounts(true);
    try {
      const defaultValue = Number(defaultDraft.value);
      const platformDraft = discountDrafts[PLATFORM_KEY];
      const platformValue = Number(platformDraft?.value ?? pricing.platformDiscountValue);

      const updated = await updatePricingSettings({
        ...pricing,
        defaultPartnerDiscountType: defaultDraft.type,
        defaultPartnerDiscountValue: Number.isFinite(defaultValue) ? defaultValue : pricing.defaultPartnerDiscountValue,
        platformDiscountType: platformDraft?.type ?? pricing.platformDiscountType,
        platformDiscountValue: Number.isFinite(platformValue) ? platformValue : pricing.platformDiscountValue,
        platformDiscountCode: platformCodeInput.trim() || pricing.platformDiscountCode,
      });
      setPricing(updated);

      // Promise.allSettled, not a sequential loop — a duplicate-code
      // conflict on one partner shouldn't stop the rest from saving.
      const results = await Promise.allSettled(
        partnerCodes.map(async (partner) => {
          const draft = discountDrafts[partner.id];
          if (!draft) return;
          const value = Number(draft.value);
          if (!Number.isFinite(value) || value < 0) return;
          const promoCode = promoCodeDrafts[partner.id]?.trim();
          await updatePartnerDiscount(partner.id, { discountType: draft.type, discountValue: value, promoCode });
        })
      );

      const newErrors: Record<string, string> = {};
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const partner = partnerCodes[index];
          const message =
            result.reason instanceof ApiError && result.reason.status === 409
              ? t.codeTaken
              : t.loadError;
          newErrors[partner.id] = message;
        }
      });
      setPromoCodeErrors(newErrors);

      const refreshedPartners = await listPartners({ pageSize: 500 });
      setPartners(refreshedPartners.items);

      if (Object.keys(newErrors).length === 0) {
        setDiscountsSaved(true);
        window.setTimeout(() => setDiscountsSaved(false), 3000);
      }
    } catch (error) {
      console.error("[admin/pricing] failed to save discounts:", error);
    } finally {
      setSavingDiscounts(false);
    }
  }

  if (loading || !pricing) {
    return (
      <div className="flex justify-center py-16">
        <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const previewBase = Number.isFinite(basePriceValue) ? basePriceValue : 0;
  const previewQr = (Number.isFinite(qrRateValue) ? qrRateValue : 0) * PREVIEW_GUESTS;
  const previewTotal = previewBase + previewQr;

  const typeLabels = { percent: t.typePercent, fixed: t.typeFixed };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.subtitle}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] lg:col-span-2">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-body-foreground">{t.basePriceLabel}</label>
              <div className="relative w-48" dir="ltr">
                <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={basePriceInput}
                  onChange={(event) => setBasePriceInput(event.target.value)}
                  className="w-full rounded-xl border border-border py-2.5 ps-7 pe-3 text-sm text-foreground outline-none transition-colors focus:border-[#C8A24A]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-body-foreground">{t.qrRateLabel}</label>
              <div className="relative w-48" dir="ltr">
                <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={qrRateInput}
                  onChange={(event) => setQrRateInput(event.target.value)}
                  className="w-full rounded-xl border border-border py-2.5 ps-7 pe-3 text-sm text-foreground outline-none transition-colors focus:border-[#C8A24A]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-body-foreground">{t.giftFeeLabel}</label>
              <div className="relative w-48" dir="ltr">
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={giftFeeInput}
                  onChange={(event) => setGiftFeeInput(event.target.value)}
                  className="w-full rounded-xl border border-border py-2.5 ps-3 pe-7 text-sm text-foreground outline-none transition-colors focus:border-[#C8A24A]"
                />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <p className="mt-1.5 max-w-md text-xs text-muted-foreground">{t.giftFeeHint}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-body-foreground">{t.defaultCurrencyLabel}</label>
              <select
                value={defaultCurrencyInput}
                onChange={(event) => setDefaultCurrencyInput(event.target.value as PublicCurrencyCode)}
                className="w-48 rounded-xl border border-border bg-card py-2.5 px-3 text-sm text-foreground outline-none transition-colors focus:border-[#C8A24A]"
              >
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code} - {CURRENCY_NAMES[code][language]}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 max-w-md text-xs text-muted-foreground">{t.defaultCurrencyHint}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#C8A24A] to-[#A68832] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? <LoaderIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
                {t.save}
              </button>
            </div>

            {saved && <p className="text-sm text-emerald-700 dark:text-emerald-400">{t.saved}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-5">
          <p className="mb-1 text-sm font-semibold text-foreground">{t.previewTitle}</p>
          <p className="mb-4 text-xs text-muted-foreground">{t.previewLine(PREVIEW_GUESTS)}</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-body-foreground">{t.previewBase}</span>
              <span className="text-foreground" dir="ltr">
                {formatUsd(previewBase)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-foreground">{t.previewQr}</span>
              <span className="text-foreground" dir="ltr">
                {formatUsd(previewQr)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
              <span className="text-foreground">{t.previewTotal}</span>
              <span className="text-[#C8A24A]" dir="ltr">
                {formatUsd(previewTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Default partner discount */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
        <p className="text-sm font-semibold text-foreground">{t.defaultDiscountTitle}</p>
        <p className="mt-1 mb-3 max-w-xl text-xs text-muted-foreground">{t.defaultDiscountHint}</p>
        <DiscountEditor draft={defaultDraft} onChange={setDefaultDraft} typeLabels={typeLabels} />
      </div>

      {/* Discount codes */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
        <p className="mb-4 text-sm font-semibold text-foreground">{t.promoTitle}</p>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.promoPlatform}</p>
        <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border px-4 py-3">
          <div className="flex items-center gap-2" dir="ltr">
            <TicketIcon className="size-3.5 shrink-0 text-[#C8A24A]" />
            <input
              value={platformCodeInput}
              onChange={(event) => setPlatformCodeInput(event.target.value.toUpperCase())}
              className="w-36 rounded-lg border border-border py-1.5 px-2 text-xs font-medium text-foreground outline-none focus:border-[#C8A24A]"
            />
          </div>
          {discountDrafts[PLATFORM_KEY] && (
            <DiscountEditor
              draft={discountDrafts[PLATFORM_KEY]}
              onChange={(draft) => setDiscountDrafts((current) => ({ ...current, [PLATFORM_KEY]: draft }))}
              typeLabels={typeLabels}
            />
          )}
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.promoPartner}</p>
        {partnerCodes.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{t.noPartnerCodes}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] table-fixed text-start text-sm">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[46%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-start font-medium">{t.business}</th>
                  <th className="py-2 text-start font-medium">{t.discount}</th>
                  <th className="py-2 text-center font-medium">{t.usage}</th>
                </tr>
              </thead>
              <tbody>
                {partnerCodes.map((partner) => (
                  <tr key={partner.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pe-3">
                      <span className="block truncate font-medium text-foreground">{partner.businessName}</span>
                      <input
                        value={promoCodeDrafts[partner.id] ?? ""}
                        onChange={(event) => {
                          const value = event.target.value.toUpperCase();
                          setPromoCodeDrafts((current) => ({ ...current, [partner.id]: value }));
                          setPromoCodeErrors((current) => {
                            if (!current[partner.id]) return current;
                            const next = { ...current };
                            delete next[partner.id];
                            return next;
                          });
                        }}
                        dir="ltr"
                        className="mt-1 w-full max-w-[180px] rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground outline-none focus:border-[#C8A24A]"
                      />
                      {promoCodeErrors[partner.id] && (
                        <span className="mt-1 block text-[11px] text-rose-700 dark:text-rose-400">{promoCodeErrors[partner.id]}</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {discountDrafts[partner.id] && (
                        <DiscountEditor
                          draft={discountDrafts[partner.id]}
                          onChange={(draft) =>
                            setDiscountDrafts((current) => ({ ...current, [partner.id]: draft }))
                          }
                          typeLabels={typeLabels}
                        />
                      )}
                    </td>
                    <td className="py-2.5 text-center text-body-foreground" dir="ltr">
                      {partner.usageCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={handleSaveDiscounts}
            disabled={savingDiscounts}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#C8A24A] to-[#A68832] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:shadow-lg disabled:opacity-60"
          >
            {savingDiscounts ? <LoaderIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            {t.saveDiscounts}
          </button>
          {discountsSaved && <p className="text-sm text-emerald-700 dark:text-emerald-400">{t.discountsSaved}</p>}
        </div>
      </div>
    </div>
  );
}
