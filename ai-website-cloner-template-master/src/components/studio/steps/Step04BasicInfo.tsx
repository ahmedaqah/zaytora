"use client";

import { useEffect, useRef, useState } from "react";
import { TextField } from "@/components/studio/fields/TextField";
import { DateTimeField } from "@/components/studio/fields/DateTimeField";
import { ColorField } from "@/components/studio/fields/ColorField";
import { FontSelect } from "@/components/studio/fields/FontSelect";
import { FontSizeStepper } from "@/components/studio/fields/FontSizeStepper";
import { ToggleField } from "@/components/studio/fields/ToggleField";
import { SectionTypographyFields } from "@/components/studio/fields/SectionTypographyFields";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { listActiveThankYouSuggestions } from "@/lib/services/thankYouSuggestions.service";
import type { InvitationDetail } from "@/types/studio";
import type { ThankYouSuggestionDto } from "@/types/api";

const COPY = {
  ar: {
    eventTitle: "عنوان الحدث",
    eventTitlePlaceholder: "حفل الزفاف",
    eventTitleFont: "خط عنوان الحدث",
    invitationType: "نوع الدعوة",
    individual: "🧍 فردي",
    couple: "💑 زوجين",
    firstName: "الاسم الأول",
    firstNamePlaceholder: "أحمد",
    secondName: "الاسم الثاني",
    secondNamePlaceholder: "سارة",
    namesFont: "خط الأسماء",
    namesLayout: "ترتيب الأسماء",
    namesLayoutHorizontal: "أفقي",
    namesLayoutVertical: "عمودي",
    nameImage: "شعار / صورة الاسم",
    nameImageDescription: "استبدل الاسم بصورة شعار في القسم الأول من الدعوة.",
    uploadNameImage: "ارفع الشعار أو صورة الاسم",
    deleteImageAria: "حذف الصورة",
    eventDateTime: "تاريخ ووقت الحدث",
    timeMode: "الوقت",
    timeModeSingle: "وقت واحد",
    timeModeRange: "من - إلى",
    monthStyle: "أسماء الأشهر",
    monthStyleDefault: "نوفمبر",
    monthStyleLevant: "تشرين الثاني",
    timeFormat: "تنسيق الساعة",
    timeFormatDefault: "تلقائي",
    timeFormat12: "12 ساعة",
    timeFormat24: "24 ساعة",
    weekdayFont: "خط اليوم (مثل الخميس)",
    dateFont: "خط التاريخ (مثل نوفمبر 19)",
    countdownFont: "خط العد التنازلي (الأرقام والكلمات)",
    eventEndTime: "وقت الانتهاء",
    detectedTimezone: (tz: string) => `المنطقة الزمنية المكتشفة: ${tz}`,
    hijriDate: "التاريخ الهجري",
    hijriDateDescription: "عرض التاريخ بالتقويم الهجري (أم القرى) في الدعوة بدلاً من الميلادي",
    thankYouText: "نص الشكر",
    thankYouTextColor: "لون النص",
    thankYouTextFont: "خط نص الشكر",
    tabSuggestions: "اقتراحات",
    tabCustom: "نص الشكر",
    suggestionsEmpty: "لا توجد اقتراحات متاحة حالياً.",
  },
  en: {
    eventTitle: "Event title",
    eventTitlePlaceholder: "Wedding celebration",
    eventTitleFont: "Event title font",
    invitationType: "Invitation type",
    individual: "🧍 Individual",
    couple: "💑 Couple",
    firstName: "First name",
    firstNamePlaceholder: "Ahmed",
    secondName: "Second name",
    secondNamePlaceholder: "Sarah",
    namesFont: "Names font",
    namesLayout: "Names layout",
    namesLayoutHorizontal: "Horizontal",
    namesLayoutVertical: "Vertical",
    nameImage: "Logo / name image",
    nameImageDescription: "Replace the names with a logo image in the invitation's opening section.",
    uploadNameImage: "Upload logo or name image",
    deleteImageAria: "Delete image",
    eventDateTime: "Event date and time",
    timeMode: "Time",
    timeModeSingle: "Single time",
    timeModeRange: "From - To",
    monthStyle: "Month names",
    monthStyleDefault: "November",
    monthStyleLevant: "Levantine (Tishrin)",
    timeFormat: "Time format",
    timeFormatDefault: "Auto",
    timeFormat12: "12-hour",
    timeFormat24: "24-hour",
    weekdayFont: "Weekday font (e.g. Thursday)",
    dateFont: "Date font (e.g. November 19)",
    countdownFont: "Countdown font (numbers and words)",
    eventEndTime: "End time",
    detectedTimezone: (tz: string) => `Detected timezone: ${tz}`,
    hijriDate: "Hijri date",
    hijriDateDescription: "Show the date on the invitation using the Hijri (Umm al-Qura) calendar instead of Gregorian",
    thankYouText: "Thank you text",
    thankYouTextColor: "Text color",
    thankYouTextFont: "Thank you text font",
    tabSuggestions: "Suggestions",
    tabCustom: "Thank you text",
    suggestionsEmpty: "No suggestions available yet.",
  },
};

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

// The end-time input is HH:MM only (see DateTimeField's "time" variant) —
// the event is assumed to end the same calendar day it starts, so this
// grabs just the time-of-day half of a "YYYY-MM-DDTHH:mm" string.
function toTimeOnly(value?: string | null) {
  if (!value) return "";
  return value.slice(11, 16);
}

// Combines a HH:MM the guest just picked with the start's own date, so
// eventEndDateTime stays a full "YYYY-MM-DDTHH:mm" wall-clock string like
// eventDateTime — reused as-is by every date/time formatter downstream
// instead of teaching them a second, time-only format.
function combineDateWithTime(baseDateTime: string | null | undefined, time: string) {
  const datePart = baseDateTime && baseDateTime.length >= 10 ? baseDateTime.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `${datePart}T${time}`;
}

// Default end time offered the moment a guest switches to "from - to" mode,
// so the field starts populated with something sensible (start + 2h) rather
// than blank — wraps past midnight rather than producing an invalid hour.
function addTwoHours(dateTimeLocal: string) {
  const [datePart, timePart] = dateTimeLocal.split("T");
  if (!datePart || !timePart) return dateTimeLocal;
  const [hours, minutes] = timePart.split(":").map(Number);
  const total = (hours * 60 + minutes + 120) % 1440;
  const newHours = String(Math.floor(total / 60)).padStart(2, "0");
  const newMinutes = String(total % 60).padStart(2, "0");
  return `${datePart}T${newHours}:${newMinutes}`;
}

export function Step04BasicInfo({
  value,
  onChange,
}: {
  value: InvitationDetail;
  onChange: (patch: Partial<InvitationDetail>) => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const nameImageInputRef = useRef<HTMLInputElement>(null);
  const [thankYouTab, setThankYouTab] = useState<"suggestions" | "custom">(
    value.thankYouImageUrl ? "suggestions" : "custom"
  );
  const [suggestions, setSuggestions] = useState<ThankYouSuggestionDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    listActiveThankYouSuggestions()
      .then((data) => {
        if (!cancelled) setSuggestions(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleNameImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    onChange({ nameImageUrl: dataUrl });
  }

  // Detected once on mount, the same way the reference site surfaces a
  // read-only "detected timezone" line next to the date field — only fills
  // it in when the draft doesn't already have one, so it never clobbers a
  // value the guest deliberately set (or that came back from the backend).
  useEffect(() => {
    if (value.timezone) return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) onChange({ timezone: detected });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <TextField
        label={t.eventTitle}
        required
        value={value.eventTitle ?? ""}
        placeholder={t.eventTitlePlaceholder}
        onChange={(eventTitle) => onChange({ eventTitle })}
      />
      <FontSelect
        label={t.eventTitleFont}
        value={value.eventTitleFont ?? ""}
        onChange={(eventTitleFont) => onChange({ eventTitleFont })}
      />
      <FontSizeStepper
        value={value.eventTitleFontSize}
        onChange={(eventTitleFontSize) => onChange({ eventTitleFontSize })}
      />
      {value.eventTitle && (
        <div className="rounded-xl border border-border bg-gold/5 px-4 py-5 text-center">
          <p className={cn("text-lg text-foreground", value.eventTitleFont || "font-cinzel")}>{value.eventTitle}</p>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-sm text-body-foreground">{t.invitationType}</p>
        <div className="grid grid-cols-2 gap-3">
          {(["individual", "couple"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ invitationType: type })}
              className={cn(
                "rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                value.invitationType === type
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border text-body-foreground hover:border-gold/40"
              )}
            >
              {type === "individual" ? t.individual : t.couple}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t.firstName}
          required
          value={value.firstName ?? ""}
          placeholder={t.firstNamePlaceholder}
          onChange={(firstName) => onChange({ firstName })}
        />
        {value.invitationType === "couple" && (
          <TextField
            label={t.secondName}
            required
            value={value.secondName ?? ""}
            placeholder={t.secondNamePlaceholder}
            onChange={(secondName) => onChange({ secondName })}
          />
        )}
      </div>
      <FontSelect
        label={t.namesFont}
        value={value.namesFont ?? ""}
        onChange={(namesFont) => onChange({ namesFont })}
      />
      <FontSizeStepper value={value.namesFontSize} onChange={(namesFontSize) => onChange({ namesFontSize })} />
      {value.invitationType === "couple" && (
        <div>
          <p className="mb-1.5 text-sm text-body-foreground">{t.namesLayout}</p>
          <div className="grid grid-cols-2 gap-3">
            {(["horizontal", "vertical"] as const).map((layout) => (
              <button
                key={layout}
                type="button"
                onClick={() => onChange({ namesLayout: layout })}
                className={cn(
                  "rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                  (value.namesLayout ?? "horizontal") === layout
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border text-body-foreground hover:border-gold/40"
                )}
              >
                {layout === "horizontal" ? t.namesLayoutHorizontal : t.namesLayoutVertical}
              </button>
            ))}
          </div>
        </div>
      )}
      {value.firstName && (
        <div className="rounded-xl border border-border bg-gold/5 px-4 py-5 text-center">
          {value.invitationType === "couple" && value.secondName && value.namesLayout === "vertical" ? (
            <p className={cn("text-lg text-gold", value.namesFont || "font-cinzel")}>
              {value.firstName}
              <br />
              &amp;
              <br />
              {value.secondName}
            </p>
          ) : (
            <p className={cn("text-lg text-gold", value.namesFont || "font-cinzel")}>
              {value.firstName}
              {value.invitationType === "couple" && value.secondName ? ` & ${value.secondName}` : ""}
            </p>
          )}
        </div>
      )}

      <ToggleField
        label={t.nameImage}
        description={t.nameImageDescription}
        checked={value.useNameImage}
        onChange={(useNameImage) => onChange({ useNameImage })}
      />
      {value.useNameImage && (
        <div>
          <input
            ref={nameImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleNameImageSelected}
          />
          {value.nameImageUrl ? (
            <div className="relative w-40">
              <div className="aspect-[4/8] overflow-hidden rounded-xl border border-border bg-background/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value.nameImageUrl} alt="" className="size-full object-cover" />
              </div>
              <button
                type="button"
                onClick={() => onChange({ nameImageUrl: null })}
                aria-label={t.deleteImageAria}
                className="absolute -top-2 -end-2 flex size-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow transition-colors hover:text-rose-700 dark:text-rose-400"
              >
                <TrashIcon className="size-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => nameImageInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold/40 py-6 text-gold transition-colors hover:bg-gold/5"
            >
              <PlusIcon className="size-5" />
              <span className="text-xs font-medium">{t.uploadNameImage}</span>
            </button>
          )}
        </div>
      )}

      <DateTimeField
        label={t.eventDateTime}
        required
        value={toDateTimeLocal(value.eventDateTime)}
        onChange={(eventDateTime) => onChange({ eventDateTime })}
      />
      {value.timezone && <p className="text-xs text-muted-foreground">{t.detectedTimezone(value.timezone)}</p>}

      <div>
        <p className="mb-1.5 text-sm text-body-foreground">{t.timeMode}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ eventEndDateTime: null })}
            className={cn(
              "rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
              !value.eventEndDateTime
                ? "border-gold bg-gold/10 text-foreground"
                : "border-border text-body-foreground hover:border-gold/40"
            )}
          >
            {t.timeModeSingle}
          </button>
          <button
            type="button"
            onClick={() => {
              if (value.eventEndDateTime) return;
              const start = toDateTimeLocal(value.eventDateTime);
              onChange({ eventEndDateTime: start ? addTwoHours(start) : combineDateWithTime(value.eventDateTime, "21:00") });
            }}
            className={cn(
              "rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
              value.eventEndDateTime
                ? "border-gold bg-gold/10 text-foreground"
                : "border-border text-body-foreground hover:border-gold/40"
            )}
          >
            {t.timeModeRange}
          </button>
        </div>
      </div>
      {value.eventEndDateTime && (
        <DateTimeField
          label={t.eventEndTime}
          type="time"
          value={toTimeOnly(value.eventEndDateTime)}
          onChange={(time) => onChange({ eventEndDateTime: combineDateWithTime(value.eventDateTime, time) })}
        />
      )}
      <ToggleField
        label={t.hijriDate}
        description={t.hijriDateDescription}
        checked={value.useHijriDate}
        onChange={(useHijriDate) => onChange({ useHijriDate })}
      />
      <div>
        <p className="mb-1.5 text-sm text-body-foreground">{t.timeFormat}</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["", t.timeFormatDefault],
              ["12", t.timeFormat12],
              ["24", t.timeFormat24],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ timeFormat: key })}
              className={cn(
                "rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                (value.timeFormat ?? "") === key
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border text-body-foreground hover:border-gold/40"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {!value.useHijriDate && (value.language === "ar" || value.language === "bilingual" || !value.language) && (
        <div>
          <p className="mb-1.5 text-sm text-body-foreground">{t.monthStyle}</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["", t.monthStyleDefault],
                ["levant", t.monthStyleLevant],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ dateMonthStyle: key })}
                className={cn(
                  "rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                  (value.dateMonthStyle ?? "") === key
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border text-body-foreground hover:border-gold/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <SectionTypographyFields
        fontLabel={t.weekdayFont}
        font={value.weekdayFont}
        size={value.weekdayFontSize}
        color={value.weekdayTextColor}
        onFont={(weekdayFont) => onChange({ weekdayFont })}
        onSize={(weekdayFontSize) => onChange({ weekdayFontSize })}
        onColor={(weekdayTextColor) => onChange({ weekdayTextColor })}
      />
      <SectionTypographyFields
        fontLabel={t.dateFont}
        font={value.dateFont}
        size={value.dateFontSize}
        color={value.dateTextColor}
        onFont={(dateFont) => onChange({ dateFont })}
        onSize={(dateFontSize) => onChange({ dateFontSize })}
        onColor={(dateTextColor) => onChange({ dateTextColor })}
      />
      <SectionTypographyFields
        fontLabel={t.countdownFont}
        font={value.countdownNumberFont}
        size={value.countdownNumberFontSize}
        color={value.countdownNumberTextColor}
        onFont={(countdownNumberFont) => onChange({ countdownNumberFont })}
        onSize={(countdownNumberFontSize) => onChange({ countdownNumberFontSize })}
        onColor={(countdownNumberTextColor) => onChange({ countdownNumberTextColor })}
      />

      <div>
        <div className="mb-3 flex items-center gap-1 rounded-full border border-border bg-background/5 p-1">
          {(["suggestions", "custom"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setThankYouTab(tab)}
              className={cn(
                "flex-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                thankYouTab === tab ? "bg-gold text-white" : "text-body-foreground hover:bg-gold/5"
              )}
            >
              {tab === "suggestions" ? t.tabSuggestions : t.tabCustom}
            </button>
          ))}
        </div>

        {thankYouTab === "suggestions" ? (
          suggestions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t.suggestionsEmpty}</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {suggestions.map((suggestion) => {
                const selected = value.thankYouImageUrl === suggestion.imageUrl;
                return (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => onChange({ thankYouImageUrl: suggestion.imageUrl, thankYouText: "" })}
                    title={suggestion.label}
                    className={cn(
                      "aspect-square overflow-hidden rounded-xl border-2 bg-background/5 transition-colors",
                      selected ? "border-gold" : "border-transparent hover:border-gold/40"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={suggestion.imageUrl} alt={suggestion.label} className="size-full object-cover" />
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div className="space-y-5">
            <TextField
              label={t.thankYouText}
              value={value.thankYouText ?? ""}
              placeholder="WITH LOVE AND GRATITUDE"
              onChange={(thankYouText) => onChange({ thankYouText, thankYouImageUrl: "" })}
            />
            <FontSelect
              label={t.thankYouTextFont}
              value={value.eventTitleFont ?? ""}
              onChange={(eventTitleFont) => onChange({ eventTitleFont })}
            />
            <FontSizeStepper
              value={value.thankYouTextFontSize}
              onChange={(thankYouTextFontSize) => onChange({ thankYouTextFontSize })}
            />
            <ColorField
              label={t.thankYouTextColor}
              value={value.thankYouTextColor ?? "#111111"}
              onChange={(thankYouTextColor) => onChange({ thankYouTextColor })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
