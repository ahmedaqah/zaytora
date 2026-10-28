"use client";

import { ToggleField } from "@/components/studio/fields/ToggleField";
import { TextField } from "@/components/studio/fields/TextField";
import { CalendarIcon, ClockIcon, WhatsAppIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { DEFAULT_PRICE_RATES } from "@/lib/priceRates";
import { usePricingSettings } from "@/lib/services/pricingSettings.service";
import type { InvitationDetail } from "@/types/studio";

// The same per-guest rate used by the public pricing calculator (/Prices)
// and the Studio checkout (PaymentPhase) — live-adjustable from
// /admin/pricing — so this step's estimate always agrees with what the
// shopper is actually charged. SAR/GBP columns are display-only
// conversions off the static fallback rates (this step has no live-FX
// loading of its own).

const COPY = {
  ar: {
    enableQr: "دخول الضيوف عبر رمز QR",
    enableQrDescription: "نظام تسجيل دخول ذكي لحدثك",
    guestCount: "عدد الضيوف",
    guestCountHint: "تلميح: أدخل العدد المتوقع من الضيوف (مثال: 50 أو أكثر).",
    perGuest: (price: string) => `$${price} / ضيف`,
    qrPosition: "مكان الرمز في الدعوة",
    qrPositionTop: "أعلى الدعوة",
    qrPositionDetails: "بعد تفاصيل الحدث",
    qrPositionBottom: "في آخر الدعوة",
    confirmationNotice: "يظهر رمز QR واحد في دعوة كل ضيف. وبعد الدفع تولّد من لوحة التحكم رابطاً لكل ماسح يرسله لموظف الاستقبال، فيصوّر الرمز ويكتب اسم الضيف ويؤكد حضوره.",
    scannerSetup: "إعداد الماسح",
    scannerSetupDescription: "أدخل عدد الموظفين الذين سيتولون تسجيل دخول الضيوف. عدد الماسحين (الحد الأقصى 4)",
    scanStart: "بداية المسح",
    scanEnd: "نهاية المسح",
  },
  en: {
    enableQr: "QR guest entry",
    enableQrDescription: "A smart check-in system for your event",
    guestCount: "Guest count",
    guestCountHint: "Tip: enter the expected number of guests (e.g. 50 or more).",
    perGuest: (price: string) => `$${price}/guest`,
    qrPosition: "QR code position in the invitation",
    qrPositionTop: "Top of the invitation",
    qrPositionDetails: "After the event details",
    qrPositionBottom: "End of the invitation",
    confirmationNotice: "One QR code appears in every guest's invitation. After payment, generate a scanner link per door staff member from your dashboard; they scan the code, type the guest's name and confirm arrival.",
    scannerSetup: "Scanner setup",
    scannerSetupDescription: "Enter the number of staff who'll be checking in guests. Scanner count (max 4)",
    scanStart: "Scan start",
    scanEnd: "Scan end",
  },
};

function money(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Same treatment as Step04BasicInfo's toDateTimeLocal for eventDateTime:
// a saved value comes back from the API with a trailing "Z" (see
// InvitationsController.Update's DateTimeKind.Utc comment) which
// <input type="datetime-local"> doesn't accept as a valid value -- the
// field would silently render blank after a reload without this.
function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

export function Step16QrEntry({
  value,
  onChange,
}: {
  value: InvitationDetail;
  onChange: (patch: Partial<InvitationDetail>) => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const pricing = usePricingSettings();
  const guestCount = value.qrGuestCount ?? 50;
  const totalUsd = guestCount * pricing.qrRateUsd;
  const totalSar = totalUsd * DEFAULT_PRICE_RATES.SAR;
  const totalGbp = totalUsd * DEFAULT_PRICE_RATES.GBP;
  const scannerCount = value.qrScannerCount ?? 1;

  return (
    <div className="space-y-5">
      <ToggleField
        label={t.enableQr}
        description={t.enableQrDescription}
        checked={value.enableQrEntry}
        onChange={(enableQrEntry) =>
          onChange(
            enableQrEntry
              ? { enableQrEntry }
              : { enableQrEntry, qrGuestCount: null, qrScannerCount: null, qrScanStart: null, qrScanEnd: null }
          )
        }
      />

      {value.enableQrEntry && (
        <>
          {/* Guest count & pricing */}
          <div className="space-y-1.5">
            <TextField
              label={t.guestCount}
              type="number"
              value={String(guestCount)}
              onChange={(text) => onChange({ qrGuestCount: Math.max(1, Number(text) || 0) })}
            />
            <p className="text-xs text-muted-foreground">{t.guestCountHint}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">USD</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.perGuest(money(pricing.qrRateUsd))}</p>
              <p className="text-sm font-semibold text-gold">${money(totalUsd)}</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">SAR</p>
              <p className="mt-4 text-sm font-semibold text-foreground">SAR {money(totalSar)}</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">GBP</p>
              <p className="mt-4 text-sm font-semibold text-foreground">£{money(totalGbp)}</p>
            </div>
          </div>

          {/* Where the guest QR sits in the invitation */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t.qrPosition}</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["top", t.qrPositionTop],
                  ["details", t.qrPositionDetails],
                  ["bottom", t.qrPositionBottom],
                ] as const
              ).map(([position, label]) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => onChange({ qrPosition: position })}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors",
                    (value.qrPosition ?? "top") === position
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border text-muted-foreground hover:border-gold/40"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Confirmation info alert */}
          <div className="flex items-start gap-2 rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-100 dark:bg-sky-950/30 px-3.5 py-3">
            <WhatsAppIcon className="mt-0.5 size-4 shrink-0 text-sky-700 dark:text-sky-400" />
            <p className="text-sm text-sky-600 dark:text-sky-300">{t.confirmationNotice}</p>
          </div>

          {/* Scanner setup */}
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">{t.scannerSetup}</p>
            <p className="text-xs text-muted-foreground">{t.scannerSetupDescription}</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => onChange({ qrScannerCount: count })}
                  className={cn(
                    "rounded-xl border-2 py-2.5 text-sm font-medium transition-colors",
                    scannerCount === count
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border text-body-foreground hover:border-gold/40"
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Scan window */}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div>
              <label className="mb-1.5 block text-sm text-body-foreground">{t.scanStart}</label>
              <div className="relative">
                <CalendarIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="datetime-local"
                  value={toDateTimeLocal(value.qrScanStart)}
                  onChange={(event) => onChange({ qrScanStart: event.target.value })}
                  className="w-full rounded-xl border border-border bg-background/5 py-2.5 ps-9 pe-3 text-sm text-foreground outline-none transition-colors [color-scheme:dark] focus:border-gold"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-body-foreground">{t.scanEnd}</label>
              <div className="relative">
                <ClockIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="datetime-local"
                  value={toDateTimeLocal(value.qrScanEnd)}
                  onChange={(event) => onChange({ qrScanEnd: event.target.value })}
                  className="w-full rounded-xl border border-border bg-background/5 py-2.5 ps-9 pe-3 text-sm text-foreground outline-none transition-colors [color-scheme:dark] focus:border-gold"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
