"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { canUseNextImage, cn, isVideoSource } from "@/lib/utils";
import { parseWallClockDate } from "@/lib/format";
import {
  BedDoubleIcon,
  CameraIcon,
  ClipboardListIcon,
  GiftIcon,
  HeartIcon,
  ImageIcon,
  LoaderIcon,
  MapPinIcon,
  MusicIcon,
  PauseIcon,
  PhoneIcon,
  PlayIcon,
  QrCodeIcon,
  XIcon,
} from "@/components/icons";
import { getTemplates } from "@/lib/services/templates.service";
import { findPresetTrackByUrl } from "@/lib/musicLibrary";
import type { TemplateDto } from "@/types/api";
import type { InvitationDetail } from "@/types/studio";
import { BottomBar, type BottomBarItem } from "./BottomBar";
import { MusicPlayerModal } from "./MusicPlayerModal";
import { InteractiveRSVPModal } from "./InteractiveRSVPModal";
import { LocationModal } from "./LocationModal";
import { ContactModal } from "./ContactModal";
import { GiftModal } from "./GiftModal";
import { CameraOverlay } from "./CameraOverlay";
import { CrimsonWaxSealEnvelopeCover, OliveWaxSealEnvelopeCover } from "./CrimsonWaxSealEnvelopeCover";
import { NavyGoldWaxSealEnvelopeCover, PhotoWaxSealEnvelopeCover } from "./PhotoWaxSealEnvelopeCover";
import { ScrollUnrollEnvelopeCover } from "./ScrollUnrollEnvelopeCover";
import { DoorSlideEnvelopeCover } from "./DoorSlideEnvelopeCover";
import { DoorFoldEnvelopeCover } from "./DoorFoldEnvelopeCover";
import { EnvelopeCover } from "./EnvelopeCover";
import { WaxSealEnvelopeCover } from "./WaxSealEnvelopeCover";
import { EnvelopeMediaCover } from "./EnvelopeMediaCover";
import { EnvelopeCtaCaption } from "./EnvelopeCtaCaption";
import { AmbientVideoBackground } from "./AmbientVideoBackground";
import { STANDALONE_FULLSCREEN_CLASS } from "./standaloneCoverPosition";
import { ArchIslamicHeroFrame } from "./ArchIslamicHeroFrame";
import { ScratchDateCard } from "./ScratchDateCard";
import { ArchIslamicInvitationCard } from "./ArchIslamicInvitationCard";
import { CalendarCard } from "./CalendarCard";
import { WishesCarousel } from "./WishesCarousel";
import { useMusicPlayer } from "./useMusicPlayer";
import { useAutoScroll } from "./useAutoScroll";
import { AmbientParticles, type AmbientVariant } from "./AmbientParticles";
import { parseScenes, sceneStyleFor, type SceneSectionKey } from "@/lib/templateScenes";

// Keyed by the same `value` codes Step01Language hands out (see
// steps/Step01Language.tsx). "bilingual" reads Arabic-first, so it shares the
// Arabic RTL treatment and labels.
type InvitationLanguage = "en" | "ar" | "ro" | "fr" | "es" | "hi" | "id" | "bilingual";

const RTL_LANGUAGES = new Set<InvitationLanguage>(["ar", "bilingual"]);

const LOCALE_TAGS: Record<InvitationLanguage, string> = {
  en: "en",
  ar: "ar",
  ro: "ro",
  fr: "fr",
  es: "es",
  hi: "hi",
  id: "id",
  bilingual: "ar",
};

const NAV_LABELS: Record<
  InvitationLanguage,
  { contact: string; music: string; capture: string; location: string; rsvp: string; gift: string }
> = {
  ar: { contact: "تواصل", music: "موسيقى", capture: "التقاط", location: "الموقع", rsvp: "تأكيد الحضور", gift: "هدية" },
  bilingual: { contact: "تواصل", music: "موسيقى", capture: "التقاط", location: "الموقع", rsvp: "تأكيد الحضور", gift: "هدية" },
  en: { contact: "Contact", music: "Music", capture: "Capture", location: "Location", rsvp: "RSVP", gift: "Gift" },
  ro: { contact: "Contact", music: "Muzică", capture: "Captură", location: "Locație", rsvp: "Confirmare", gift: "Cadou" },
  fr: { contact: "Contact", music: "Musique", capture: "Capture", location: "Lieu", rsvp: "Confirmer", gift: "Cadeau" },
  es: { contact: "Contacto", music: "Música", capture: "Captura", location: "Ubicación", rsvp: "Confirmar", gift: "Regalo" },
  hi: { contact: "संपर्क", music: "संगीत", capture: "कैप्चर", location: "स्थान", rsvp: "उपस्थिति", gift: "उपहार" },
  id: { contact: "Kontak", music: "Musik", capture: "Ambil", location: "Lokasi", rsvp: "Konfirmasi", gift: "Hadiah" },
};

// Every other section label sprinkled across the canvas below (venue card,
// accommodation, program, rules, gallery, RSVP stats, the auto-scroll
// button, modal close buttons...) — previously hardcoded Arabic literals
// directly in the JSX regardless of `language`, the same bug NAV_LABELS/
// COUNTDOWN_LABELS above were already written to avoid.
const CANVAS_LABELS: Record<
  InvitationLanguage,
  {
    accommodation: string;
    program: string;
    eventDetails: string;
    galleryMoments: string;
    attendeeCount: string;
    wishes: string;
    openMaps: string;
    resumeAutoScroll: string;
    pauseAutoScroll: string;
    closeModal: string;
    saveDate: string;
    untitledEvent: string;
  }
> = {
  ar: {
    accommodation: "أين تقيمون",
    program: "برنامج الحفل",
    eventDetails: "تفاصيل الحدث",
    galleryMoments: "لحظات من الحفل",
    attendeeCount: "عدد الحضور",
    wishes: "التهاني",
    openMaps: "افتح خرائط جوجل",
    resumeAutoScroll: "استئناف التمرير التلقائي",
    pauseAutoScroll: "إيقاف التمرير التلقائي",
    closeModal: "إغلاق",
    saveDate: "احفظ الموعد",
    untitledEvent: "دعوة",
  },
  bilingual: {
    accommodation: "أين تقيمون",
    program: "برنامج الحفل",
    eventDetails: "تفاصيل الحدث",
    galleryMoments: "لحظات من الحفل",
    attendeeCount: "عدد الحضور",
    wishes: "التهاني",
    openMaps: "افتح خرائط جوجل",
    resumeAutoScroll: "استئناف التمرير التلقائي",
    pauseAutoScroll: "إيقاف التمرير التلقائي",
    closeModal: "إغلاق",
    saveDate: "احفظ الموعد",
    untitledEvent: "دعوة",
  },
  en: {
    accommodation: "Where to Stay",
    program: "Event Program",
    eventDetails: "Event Details",
    galleryMoments: "Moments from the Celebration",
    attendeeCount: "Attendees",
    wishes: "Well Wishes",
    openMaps: "Open Google Maps",
    resumeAutoScroll: "Resume auto-scroll",
    pauseAutoScroll: "Pause auto-scroll",
    closeModal: "Close",
    saveDate: "Save the Date",
    untitledEvent: "Invitation",
  },
  ro: {
    accommodation: "Unde să Stați",
    program: "Programul Evenimentului",
    eventDetails: "Detaliile Evenimentului",
    galleryMoments: "Momente de la Sărbătoare",
    attendeeCount: "Participanți",
    wishes: "Felicitări",
    openMaps: "Deschide Google Maps",
    resumeAutoScroll: "Reia derularea automată",
    pauseAutoScroll: "Pauză derulare automată",
    closeModal: "Închide",
    saveDate: "Salvează Data",
    untitledEvent: "Invitație",
  },
  fr: {
    accommodation: "Où Séjourner",
    program: "Programme de l'Événement",
    eventDetails: "Détails de l'Événement",
    galleryMoments: "Moments de la Célébration",
    attendeeCount: "Participants",
    wishes: "Félicitations",
    openMaps: "Ouvrir Google Maps",
    resumeAutoScroll: "Reprendre le défilement automatique",
    pauseAutoScroll: "Mettre en pause le défilement automatique",
    closeModal: "Fermer",
    saveDate: "Enregistrer la Date",
    untitledEvent: "Invitation",
  },
  es: {
    accommodation: "Dónde Alojarse",
    program: "Programa del Evento",
    eventDetails: "Detalles del Evento",
    galleryMoments: "Momentos de la Celebración",
    attendeeCount: "Asistentes",
    wishes: "Felicitaciones",
    openMaps: "Abrir Google Maps",
    resumeAutoScroll: "Reanudar desplazamiento automático",
    pauseAutoScroll: "Pausar desplazamiento automático",
    closeModal: "Cerrar",
    saveDate: "Guardar la Fecha",
    untitledEvent: "Invitación",
  },
  hi: {
    accommodation: "कहाँ ठहरें",
    program: "कार्यक्रम अनुसूची",
    eventDetails: "आयोजन विवरण",
    galleryMoments: "समारोह के पल",
    attendeeCount: "उपस्थित लोग",
    wishes: "शुभकामनाएं",
    openMaps: "गूगल मैप्स खोलें",
    resumeAutoScroll: "ऑटो-स्क्रॉल फिर से शुरू करें",
    pauseAutoScroll: "ऑटो-स्क्रॉल रोकें",
    closeModal: "बंद करें",
    saveDate: "तारीख़ सहेजें",
    untitledEvent: "निमंत्रण",
  },
  id: {
    accommodation: "Tempat Menginap",
    program: "Rangkaian Acara",
    eventDetails: "Detail Acara",
    galleryMoments: "Momen dari Perayaan",
    attendeeCount: "Jumlah Tamu",
    wishes: "Ucapan Selamat",
    openMaps: "Buka Google Maps",
    resumeAutoScroll: "Lanjutkan gulir otomatis",
    pauseAutoScroll: "Jeda gulir otomatis",
    closeModal: "Tutup",
    saveDate: "Simpan Tanggal",
    untitledEvent: "Undangan",
  },
};

function resolveLanguage(language?: string | null): InvitationLanguage {
  return language && language in NAV_LABELS ? (language as InvitationLanguage) : "ar";
}

// Full words ("أيام", "ساعات"...), matching the reference's countdown —
// not the single-letter abbreviations ("ي", "س"...) used previously.
// `heading` is the "العد التنازلي" title above the grid — previously
// hardcoded Arabic regardless of `language`; folded in here instead of a
// separate map since it's the same countdown widget's own copy.
const COUNTDOWN_LABELS: Record<
  InvitationLanguage,
  { heading: string; days: string; hours: string; minutes: string; seconds: string }
> = {
  ar: { heading: "العد التنازلي", days: "أيام", hours: "ساعات", minutes: "دقائق", seconds: "ثواني" },
  bilingual: { heading: "العد التنازلي", days: "أيام", hours: "ساعات", minutes: "دقائق", seconds: "ثواني" },
  en: { heading: "Countdown", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds" },
  ro: { heading: "Numărătoare inversă", days: "Zile", hours: "Ore", minutes: "Minute", seconds: "Secunde" },
  fr: { heading: "Compte à rebours", days: "Jours", hours: "Heures", minutes: "Minutes", seconds: "Secondes" },
  es: { heading: "Cuenta regresiva", days: "Días", hours: "Horas", minutes: "Minutos", seconds: "Segundos" },
  hi: { heading: "उलटी गिनती", days: "दिन", hours: "घंटे", minutes: "मिनट", seconds: "सेकंड" },
  id: { heading: "Hitung Mundur", days: "Hari", hours: "Jam", minutes: "Menit", seconds: "Detik" },
};

// Replaces the ticking countdown grid once the event's own start time has
// passed — a countdown frozen at "00 00 00 00" reads as broken, not as "the
// event is happening now", and stays wrong forever after (a guest reopening
// the link as a keepsake weeks later would see the same frozen zeros). A
// warm, time-agnostic line works whether it's read right at doors-open or
// long after, without presuming the reader actually attended.
const COUNTDOWN_STARTED_MESSAGE: Record<InvitationLanguage, string> = {
  ar: "كان يوماً لا يُنسى، شكراً لحضوركم",
  bilingual: "كان يوماً لا يُنسى، شكراً لحضوركم",
  en: "It was an unforgettable day — thank you for being with us",
  ro: "A fost o zi de neuitat — mulțumim că ați fost alături de noi",
  fr: "Ce fut une journée inoubliable — merci d'avoir été avec nous",
  es: "Fue un día inolvidable — gracias por acompañarnos",
  hi: "यह एक यादगार दिन था — साथ होने के लिए धन्यवाद",
  id: "Ini adalah hari yang tak terlupakan — terima kasih telah hadir",
};

// Shown in the hero (via NamesLine, so the "&" still gets its own
// font-great-vibes treatment) in place of the couple's real names on a
// still-blank draft — every template used to fall back to a single bare "&"
// glyph there, which read as a second, disconnected ampersand sitting right
// under this same hero's own decorative "&" mark. A real placeholder pair
// reads as an actual preview of the layout instead of a broken/duplicated
// symbol, and disappears the moment the guest fills in Step04BasicInfo.
const PLACEHOLDER_NAMES: Record<InvitationLanguage, string> = {
  ar: "أحمد & سارة",
  bilingual: "أحمد & سارة",
  en: "Ahmed & Sarah",
  ro: "Ahmed & Sarah",
  fr: "Ahmed & Sarah",
  es: "Ahmed & Sarah",
  hi: "अहमद & सारा",
  id: "Ahmed & Sarah",
};

// Appends the Umm al-Qura Hijri calendar + a forced Latin numbering system
// (`-u-ca-islamic-umalqura-nu-latn`) onto a base locale tag — every date
// display on this canvas runs through this so toggling Step04BasicInfo's
// "Hijri date" switch consistently flips weekday/month/day/year everywhere
// (hero, invitation card, calendar widget, countdown subtitle) instead of
// just one spot. `-nu-latn` matches this canvas's existing convention of
// never showing Arabic-Indic digits (see calendarParts below) — Hijri or
// Gregorian, days/years always render "19"/"1447", never "١٩"/"١٤٤٧".
function resolveDateLocale(locale: string, useHijri: boolean) {
  return useHijri ? `${locale}-u-ca-islamic-umalqura-nu-latn` : locale;
}

// JS `Date` has no native Hijri accessors (getMonth()/getDate() are always
// Gregorian) — formatToParts() against the Hijri locale is what actually
// converts the calendar system, not just the display language.
function hijriDateParts(date: Date, locale: string) {
  const parts = new Intl.DateTimeFormat(resolveDateLocale(locale, true), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { weekday: get("weekday"), day: get("day"), month: get("month"), year: get("year") };
}

function formatEventDate(
  iso: string | null | undefined,
  locale: string,
  useHijri: boolean,
  endIso?: string | null
) {
  if (!iso) return null;
  const date = parseWallClockDate(iso);
  if (Number.isNaN(date.getTime())) return null;
  const dateLocale = resolveDateLocale(locale, useHijri);
  const endDate = endIso ? parseWallClockDate(endIso) : null;
  const hasEnd = endDate && !Number.isNaN(endDate.getTime());
  if (!hasEnd) {
    return new Intl.DateTimeFormat(dateLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  // A time range can't reuse Intl's single combined date+time format above
  // (it only ever states one time) — built manually instead: the date
  // portion stays exactly as it reads today, with "من X إلى Y"/"X – Y"
  // appended for the two times.
  const dateWords = new Intl.DateTimeFormat(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const timeFormatter = new Intl.DateTimeFormat(dateLocale, { hour: "numeric", minute: "2-digit" });
  const startTime = timeFormatter.format(date);
  const endTime = timeFormatter.format(endDate);
  return locale === "ar" ? `${dateWords}، من ${startTime} إلى ${endTime}` : `${dateWords}, ${startTime} – ${endTime}`;
}

// Short "DD/MM/YYYY" form for the closing footer — distinct from the long,
// localized formatEventDate() used in the hero.
function formatShortDate(iso: string | null | undefined) {
  if (!iso) return null;
  const date = parseWallClockDate(iso);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

// Feeds the CalendarCard "desk calendar" widget — day-of-month stays plain
// Latin digits regardless of locale (matching the countdown grid's own
// digits, and the reference's "19", never "١٩"), while month/weekday read
// localized. Time is pinned to en-US/hour12 so it always reads "9:00 PM"
// like the reference's calendar face, independent of invitation language.
// When useHijriDate is on, day/month/weekday all come from hijriDateParts
// instead — a Hijri desk calendar showing a Gregorian day-of-month would be
// actively wrong, not just unlocalized.
function calendarParts(iso: string | null | undefined, locale: string, useHijri: boolean, endIso?: string | null) {
  if (!iso) return null;
  const date = parseWallClockDate(iso);
  if (Number.isNaN(date.getTime())) return null;
  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  let time = timeFormatter.format(date);
  const endDate = endIso ? parseWallClockDate(endIso) : null;
  if (endDate && !Number.isNaN(endDate.getTime())) {
    time = `${time} – ${timeFormatter.format(endDate)}`;
  }
  if (useHijri) {
    const hijri = hijriDateParts(date, locale);
    return { day: hijri.day, month: hijri.month, weekday: hijri.weekday, time };
  }
  return {
    day: String(date.getDate()),
    month: new Intl.DateTimeFormat(locale, { month: "long" }).format(date),
    weekday: new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date),
    time,
  };
}

function useCountdown(iso?: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!iso) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [iso]);

  return useMemo(() => {
    if (!iso) return null;
    const target = parseWallClockDate(iso).getTime();
    if (Number.isNaN(target)) return null;
    const rawDiff = target - now;
    const diff = Math.max(0, rawDiff);
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const seconds = Math.floor((diff % 60_000) / 1000);
    return { days, hours, minutes, seconds, started: rawDiff <= 0 };
  }, [iso, now]);
}

const RULES_DELIMITER = " · ";

// Section cards blend into whatever's behind them (template photo or plain
// page) as tinted glass, using the --tpl-card-* custom properties a nearby
// ancestor sets via resolveCanvasTheme() below — never a hardcoded white/
// black split. backdrop-blur-md still softens whatever texture shows through.
// Vertical rhythm between cards comes from the content wrapper's
// `space-y-16`, not a per-card margin, so the page reads as a long, roomy
// scroll rather than tightly stacked panels.
// backdrop-blur-lg + the inset top highlight line (--tpl-card-highlight) is
// what pushes this from "translucent panel" to a genuine frosted-glass
// bevel — a thin brighter edge along the top inner border, the same detail
// numinds.me's own dark templates (W038) use on their calendar/countdown/
// program cards rather than a flat semi-transparent rectangle.
// Briefly bumped to blur-xl alongside cardBg's lower opacity, to keep the
// now-more-visible backdrop smooth — reverted back to blur-lg because
// backdrop-filter's cost scales sharply with radius, and with a full
// invitation stacking a dozen+ of these cards, blur-xl visibly hitched
// scrolling. Legibility over the more-visible backdrop is carried by
// textShadow's stronger layered shadow (below) instead of a heavier blur.
//
// content-visibility:auto turned out to matter far more than the blur radius
// itself: opening the envelope auto-starts a slow unattended scroll ride
// (useAutoScroll) that calls window.scrollTo() every animation frame for the
// whole invitation — with every backdrop-blur card on the page repainting on
// every one of those frames regardless of whether it's anywhere near the
// viewport, that compounded into 20+ seconds of continuous main-thread
// blocking (measured directly during the ride, not estimated). Skipping
// layout/paint for off-screen cards cuts that cost down to roughly the
// number of cards actually visible at once instead of all of them.
// `transparent` drops the glass-card box (background/border/blur/shadow)
// entirely, leaving just spacing + the content-visibility perf hint --
// used when the template has an AmbientVideoBackground behind it (see
// InvitationCanvas's `transparentCards`), so the couple's names/date/program
// text reads as sitting directly on the moving scene instead of floating in
// a disconnected glass box on top of it. TONE's TEXT_SHADOW already carries
// the legibility every section's text needs either way.
function sectionCardClass(padding: string = "p-8", transparent: boolean = false) {
  return cn(
    "tpl-card mx-3 [content-visibility:auto] [contain-intrinsic-size:1px_400px]",
    padding,
    transparent
      ? ""
      : "rounded-[24px] border backdrop-blur-lg border-[var(--tpl-card-border)] bg-[var(--tpl-card-bg)] shadow-[0_8px_32px_var(--tpl-card-shadow),inset_0_1px_0_var(--tpl-card-highlight)]"
  );
}

// Scales one text element's font-size on top of its own Tailwind-set base
// size (see FontSizeStepper) -- returns undefined at the 100%/unset default
// so the Tailwind class keeps doing its normal job untouched, and an
// explicit rem override only when the guest actually picked a size. A plain
// `fontSize: "X%"` would instead resolve against the *parent's* computed
// size once it lands on the same element as the Tailwind class, not against
// that class's own rem value, which is why this takes the class's real base
// size in rem and computes the absolute result itself.
function fontSizeStyle(baseRem: number, percent?: number | null): CSSProperties | undefined {
  if (!percent || percent === 100) return undefined;
  return { fontSize: `${(baseRem * percent) / 100}rem` };
}

// Centralized typographic tone so every header/body/muted string across the
// program, rules, accommodation, gallery, personal-message and footer
// sections reads consistently — driven entirely by the --tpl-text-* custom
// properties resolveCanvasTheme() sets on the canvas root, not a per-call
// boolean, so a plain constant works fine here. Every role also carries
// --tpl-text-shadow — a soft dark glow behind light text (legible over an
// unpredictable full-bleed photo) or a soft light halo behind dark text
// (legible over a bright/busy background) computed once from the resolved
// theme's brightness, so contrast stays pixel-perfect without a per-spot
// manual drop-shadow.
const TEXT_SHADOW = "[text-shadow:var(--tpl-text-shadow)]";
const TONE = {
  heading: cn("text-[var(--tpl-text-heading)]", TEXT_SHADOW),
  body: cn("text-[var(--tpl-text-body)]", TEXT_SHADOW),
  strong: cn("text-[var(--tpl-text-strong)]", TEXT_SHADOW),
  muted: cn("text-[var(--tpl-text-muted)]", TEXT_SHADOW),
  chip: "bg-[var(--tpl-chip-bg)] text-[var(--tpl-text-muted)]",
} as const;

// --- Per-template theme resolution -----------------------------------------
// Every color in this canvas that used to hinge on a single `hasPhoto`
// boolean (dark glass on a full-bleed photo vs. cream/gold everywhere else)
// now reads from the template's own PageBg/CardBg/TextColor/PrimaryAccent
// tokens (see the Template entity's doc comments on the backend), resolved
// once per render into CSS custom properties on the canvas root so every
// descendant — including CalendarCard and WishesCarousel — can reference
// them via plain `var(--tpl-*)` without any prop drilling or per-component
// hasPhoto plumbing. A template with no palette assigned (the four legacy
// screenshot templates, or a previewImageUrl demo with no backend template)
// falls back to exactly the old hasPhoto-driven look, driven by isFullBleed
// instead — so nothing regresses for templates that predate this system.
const DEFAULT_ACCENT = "#C8A24A";
const DEFAULT_PAGE_BG = "linear-gradient(to bottom, #F5F0E8, #ffffff)";
const DEFAULT_PAGE_BG_SOLID = "#F5F0E8";

function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^#?([0-9a-fA-F]{6})$/.exec(value.trim());
  return match ? `#${match[1]}` : null;
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const num = parseInt(hex.slice(1), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function withAlpha(hex: string, alphaValue: number): string {
  const [r, g, b] = hexToRgbTuple(hex);
  return `rgba(${r}, ${g}, ${b}, ${alphaValue})`;
}

// A solid (opaque) lightened variant of accent — for spots like the bottom
// nav's action-button gradient, where an alpha-blended --tpl-accent-NN would
// let whatever's behind the button show through the gradient's middle stop
// instead of reading as a highlight.
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgbTuple(hex);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// Cheap perceived-brightness check (not gamma-correct, but plenty accurate
// for "should this card render as light or dark glass") used only when a
// template supplies its own CardBg — a template author picks one card color
// per template, so this only ever runs against a handful of known values.
function isDarkColor(hex: string): boolean {
  const [r, g, b] = hexToRgbTuple(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function resolveCanvasTheme(
  template: TemplateDto | null,
  isFullBleed: boolean,
  // The guest's own manual pick from Step18Additional's "لون نص الدعوة"
  // ColorField — wins over the template's own TextColor when set, so a
  // guest who finds a template's automatic color hard to read against
  // their chosen photo/background can just fix it themselves instead of
  // being stuck with whatever that template's author picked.
  textColorOverride?: string | null,
  // True when this template also renders an AmbientVideoBackground (see
  // InvitationCanvas's `transparentCards`) -- sectionCardClass drops its
  // glass-card fill/blur entirely in that case, which was the layer this
  // function's textShadow formula relied on to dim/soften whatever busy
  // background sat behind the text before the shadow did its part. Without
  // it, the same two-layer shadow reads as too weak against a sharp, moving
  // video, so this adds a third tight all-around glow layer for a proper
  // subtitle-style outline instead.
  hasAmbientVideo: boolean = false
) {
  const cardBase = normalizeHex(template?.cardBg);
  const isDark = cardBase ? isDarkColor(cardBase) : isFullBleed;

  const accent = normalizeHex(template?.primaryAccent) ?? DEFAULT_ACCENT;
  const textColor = normalizeHex(textColorOverride) ?? normalizeHex(template?.textColor);
  const headingColor = textColor ?? (isDark ? "#DEC1A0" : "#44403c");
  const bodyColor = textColor ?? (isDark ? "#DEC1A0" : "#57534e");
  const strongColor = textColor ?? (isDark ? "#DEC1A0" : "#292524");
  const mutedColor = textColor ? withAlpha(textColor, 0.65) : isDark ? "#C4C6B8" : "#a8a29e";
  // Shadow direction (dark glow behind light text vs. light halo behind
  // dark text) has to track the *resolved text color's* own brightness,
  // not the card/photo's — a manually-picked dark override on a dark
  // template would otherwise still get a glow meant for light text,
  // undermining the exact legibility fix this override exists for.
  const textIsLight = textColor ? !isDarkColor(textColor) : isDark;

  const cardColorBase = cardBase ?? (isDark ? "#000000" : "#ffffff");
  // Full-bleed templates sit these "glass" surfaces directly over a real
  // photo, whose own light/dark patches vary block-to-block regardless of
  // the template's assigned isDark/textColor — 0.45-0.5 opacity (an older
  // value) let too much of that unpredictable photo bleed through, so a
  // dark-brown photo patch under light "isDark: false" text (or vice versa)
  // could wreck contrast even though the theme's own colors were fine on
  // paper. 0.72-0.8 (a later bump) fixed that but read as flatly opaque
  // wherever the photo itself was already close in tone to the card (a dark
  // night-sky template's card over its own dark sky, for instance) — the
  // glass-over-photo look the template is going for never actually showed.
  // Settled here at 0.62-0.68: enough of the photo still shows through for
  // "tinted glass" to read as intended even on a same-tone photo, while
  // sectionCardClass's stronger blur-xl (was blur-lg) smooths out whatever
  // busy texture that lets through so it can't sit directly under text, and
  // textShadow below picks up the rest of the contrast work.
  const cardBg = withAlpha(cardColorBase, isDark ? 0.62 : 0.68);
  const cardBorder = isDark ? "rgba(255,255,255,0.15)" : cardBase ? withAlpha(accent, 0.25) : "#e9dfc8";
  const cardShadow = isDark ? "rgba(0,0,0,0.35)" : "rgba(120,95,50,0.08)";
  // The glass bevel's inner top edge — a touch brighter than the card body,
  // same on dark or light glass (a highlight, not a themed color).
  const cardHighlight = isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.65)";
  // Pixel-perfect legibility over unpredictable backgrounds (a full-bleed
  // photo, a busy page gradient) without per-spot manual drop-shadows. Two
  // layered shadows: a tight, high-opacity one that hugs the glyph edges
  // (does the actual contrast work, since cardBg is translucent enough now
  // to let real photo detail through) plus the original soft wide glow for
  // depth — a single soft blur alone got lost against busy photo texture.
  const textShadow = textIsLight
    ? hasAmbientVideo
      ? "0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.9), 0 2px 14px rgba(0,0,0,0.75)"
      : "0 1px 2px rgba(0,0,0,0.85), 0 2px 10px rgba(0,0,0,0.5)"
    : hasAmbientVideo
      ? "0 1px 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.9), 0 2px 14px rgba(255,255,255,0.75)"
      : "0 1px 2px rgba(255,255,255,0.85), 0 2px 8px rgba(255,255,255,0.55)";

  // Same reasoning as cardBg above — chips (wishes pills, countdown boxes,
  // program-item badges) are smaller than a full card section, so an even
  // thinner accent-only wash (the old 0.12-0.16) left them almost entirely
  // photo-colored. Based on cardColorBase (the theme's own light/dark
  // neutral) rather than accent, at a comparable near-opaque strength, so
  // text over a chip gets the same reliable footing as text over a card.
  const chipBg = withAlpha(cardColorBase, isDark ? 0.6 : 0.66);
  // "Emphasis" is the accent role used for decorative/interactive marks
  // (timeline dots, event tagline, "&" glow) — on a dark card the raw accent
  // hue can read low-contrast against a busy photo, so dark mode borrows the
  // already-tuned heading color instead of the accent itself; light mode
  // uses the accent directly.
  const emphasis = isDark ? headingColor : accent;

  const rawPageBg = template?.pageBg?.trim() || null;
  let pageBg = DEFAULT_PAGE_BG;
  let pageBgSolid = DEFAULT_PAGE_BG_SOLID;
  if (rawPageBg?.includes(",")) {
    const [fromRaw, toRaw] = rawPageBg.split(",");
    const from = normalizeHex(fromRaw);
    const to = normalizeHex(toRaw) ?? from;
    if (from) {
      pageBg = `linear-gradient(to bottom, ${from}, ${to})`;
      pageBgSolid = from;
    }
  } else if (rawPageBg) {
    const solid = normalizeHex(rawPageBg);
    if (solid) {
      pageBg = solid;
      pageBgSolid = solid;
    }
  }

  const vars = {
    "--tpl-page-bg": pageBg,
    "--tpl-page-bg-solid": pageBgSolid,
    "--tpl-card-bg": cardBg,
    "--tpl-card-border": cardBorder,
    "--tpl-card-shadow": cardShadow,
    "--tpl-card-highlight": cardHighlight,
    "--tpl-text-shadow": textShadow,
    "--tpl-text-heading": headingColor,
    "--tpl-text-body": bodyColor,
    "--tpl-text-strong": strongColor,
    "--tpl-text-muted": mutedColor,
    "--tpl-chip-bg": chipBg,
    "--tpl-accent": accent,
    "--tpl-accent-light": lighten(accent, 0.35),
    "--tpl-accent-70": withAlpha(accent, 0.7),
    "--tpl-accent-40": withAlpha(accent, 0.4),
    "--tpl-accent-30": withAlpha(accent, 0.3),
    "--tpl-accent-15": withAlpha(accent, 0.15),
    "--tpl-emphasis": emphasis,
    "--tpl-emphasis-40": withAlpha(emphasis, 0.4),
    "--tpl-emphasis-15": withAlpha(emphasis, 0.15),
    "--tpl-mark": isDark ? withAlpha(headingColor, 0.85) : withAlpha(accent, 0.7),
    "--tpl-mark-glow": withAlpha(emphasis, 0.5),
  } as const;

  return { vars, isDark };
}

const AMBIENT_VARIANTS = new Set<AmbientVariant>(["smoke", "petals", "sparkle", "snow", "none"]);

// Which particle motion plays across the whole canvas (see AmbientParticles.tsx).
// A template's own AmbientEffect always wins; an unset/unrecognized value
// defers to the resolved theme's brightness — dark themes read as moody, so
// they get slow rising smoke, light themes get soft twinkling sparkle —
// rather than requiring every template to pick a variant explicitly.
function resolveAmbientVariant(template: TemplateDto | null, isDark: boolean): AmbientVariant {
  const raw = template?.ambientEffect;
  if (raw && AMBIENT_VARIANTS.has(raw as AmbientVariant)) return raw as AmbientVariant;
  return isDark ? "smoke" : "sparkle";
}

// Every template composites its live guest data differently — see the
// Layout doc-comment on the backend's Template entity (backend/Numinds.Api/Models/Entities/Template.cs)
// for the full rationale (in short: the four original seed templates are
// finished preview *screenshots* with a demo couple's name already baked
// into the pixels, which is exactly what caused names not to visibly
// update and photos to be stretched/cropped oddly when they were reused as
// full-page backgrounds — they were never meant to have live text
// composited over them at all).
type TemplateLayout = "none" | "full-bleed" | "boxed-hero" | "overlay";

// "overlay" doesn't depend on a background image existing — its frame is
// drawn in this file, not sourced from the template — so it's checked
// before the hasBackgroundImage gate below. Every other non-"none",
// non-"boxed-hero" value (including "full-bleed" itself, and any layout
// string a future template introduces that this build doesn't know about
// yet) falls back to "full-bleed", this canvas's original single-mode photo
// treatment, so a newer backend never regresses to a blank canvas here.
function resolveTemplateLayout(rawLayout: string | null | undefined, hasBackgroundImage: boolean): TemplateLayout {
  if (rawLayout === "overlay") return "overlay";
  if (!hasBackgroundImage) return "none";
  if (rawLayout === "none") return "none";
  if (rawLayout === "boxed-hero") return "boxed-hero";
  return "full-bleed";
}

// Explicit initial/animate + incrementing delay per hero line, rather than
// framer-motion's variants + staggerChildren orchestration — the hero
// re-renders every second (the countdown ticks via useCountdown's own
// setInterval), and a freshly-mounted countdown pill re-entering the
// staggered parent's child list intermittently left sibling variants stuck
// at their "hidden" values. Independent per-element animations sidestep
// that entirely.
function heroFade(index: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: 0.05 + index * 0.1, ease: "easeOut" as const },
  };
}

const sectionReveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

// Slow, continuous Ken Burns zoom for every hero photo layer (full-bleed
// background, hero illustration, arch-window photo) — without it a static
// BackgroundImageUrl just sits there once its one-time entrance fade
// finishes, which reads as "a picture" rather than "a living invitation".
// Mirrors back down instead of resetting/jumping, and runs slow enough
// (18s) that it's felt more than seen — the same subtle-zoom treatment
// numinds.me's own photo templates use behind their hero.
const kenBurns = {
  initial: { scale: 1 },
  animate: { scale: 1.08 },
  transition: { duration: 18, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const },
};

// Collapses framer-motion's intersection root down to a thin band straddling
// the viewport's vertical center (-42% off both the top and bottom edges).
// Used only by the program timeline: with the section card's own default
// "-50px" margin, every row within a short program sits inside the viewport
// simultaneously and reveals as one block the moment the card scrolls into
// view. A center-band margin instead makes each row cross that band one at a
// time as the guest scrolls, so the timeline lights up step-by-step no
// matter how many stops it has or how tall the card is.
const TIMELINE_REVEAL_VIEWPORT = { once: true, margin: "-42% 0px -42% 0px" } as const;

// Renders the couple's joined "First & Second" string with only the "&"
// itself swapped to font-great-vibes — matching the reference invitation
// markup, which sets every couple-name ampersand in a dedicated cursive
// script while the names on either side stay in the invitation's own font.
// Falls back to the plain string when there's no " & " to split on (a solo
// invitationType, or a name containing no literal ampersand-joined pair),
// so this is a pure presentational swap, never a data reshape. `layout`
// (default "horizontal", the original single-line behavior) stacks the two
// names with the "&" centered between them on its own line instead — the
// hero's own value.namesLayout choice; every other caller (the closing
// footer's own signature line) leaves this at its default.
function NamesLine({ names, layout = "horizontal" }: { names: string; layout?: "horizontal" | "vertical" }) {
  const parts = names.split(" & ");
  if (parts.length !== 2) return <>{names}</>;
  const [first, second] = parts;
  if (layout === "vertical") {
    return (
      <span className="flex flex-col items-center gap-1">
        <span>{first}</span>
        <span className="font-great-vibes text-[0.7em] leading-none">&amp;</span>
        <span>{second}</span>
      </span>
    );
  }
  return (
    <>
      {first} <span className="font-great-vibes">&amp;</span> {second}
    </>
  );
}

// The actual invitation content + bottom nav + modals — shared by the small
// phone-bezel mockup (PhonePreview) and the full-screen preview overlay, so
// both surfaces render exactly the same guest-facing experience instead of
// two versions that can drift apart.
export function InvitationCanvas({
  value,
  className,
  variant = "embedded",
  previewImageUrl,
  templatePreviewMode = false,
  readOnly = false,
  templateOverride,
}: {
  value: InvitationDetail;
  className?: string;
  // "embedded" (default): bounded to its parent's box — the small phone-bezel
  // mockup (PhonePreview) gives this a fixed-height box, so the canvas
  // scrolls internally and its nav/modals are positioned relative to that box.
  // "standalone": the guest-facing /invitationpublic page — no bezel, no
  // bounded box, the page itself scrolls natively and the nav/modals anchor
  // to the viewport, matching numinds.me's public preview layout.
  variant?: "embedded" | "standalone";
  // Escape hatch for demo/showcase invitations that have no backend-hosted
  // template (so `templates.find(...)` never resolves an imageUrl) but still
  // want the photo hero treatment — e.g. a standalone mock built from a
  // hand-authored InvitationDetail rather than a real draft. Ignored whenever
  // the resolved template already carries its own imageUrl.
  previewImageUrl?: string | null;
  // True only for the phone-bezel preview while the designer is on
  // StudioWizard's template-selection step (see PhonePreview's isTemplateStep)
  // — before any real content exists yet, so the picker's job is "does this
  // template's own visual identity look right", not "does the couple's not-
  // yet-real placeholder text look right". Suppresses every text overlay
  // (names/placeholder, family names, event title, thank-you, QR, and the
  // whole invitation-card-through-footer content stack) plus the bottom nav,
  // while leaving every background layer — photo/gradient, the overlay
  // layout's decorative frame, hero/decoration artwork, paper grain, and
  // AmbientParticles — rendering exactly as it otherwise would, since none
  // of those are "content", they're the template's raw aesthetic itself.
  templatePreviewMode?: boolean;
  // True for every "just looking, not really RSVPing" surface: the mock
  // catalog/homepage template preview (buildMockInvitation, no real backend
  // invitation behind it) and the studio's own "?preview=true" full-preview
  // of an in-progress draft (the designer checking their own design, not a
  // guest). Passed to InteractiveRSVPModal so it skips the real
  // POST /invitations/{id}/rsvp call — pointless for the mock's fake "demo"
  // id, and semantically wrong for the designer's own unpublished draft,
  // which would otherwise pollute that invitation's real RSVP list once
  // published. The actual guest-facing link (/invitationpublic?id=X with no
  // preview flag) leaves this false, so real guests' RSVPs still reach the
  // owner's dashboard normally.
  readOnly?: boolean;
  // Escape hatch for the admin's template-edit preview (TemplateEditModal):
  // renders this exact in-progress, not-yet-saved draft instead of fetching
  // the real templates list and looking one up by value.templateId — an
  // admin tweaking a color or font needs to see it reflected immediately,
  // before "Save" has even been clicked, which the normal fetch-then-find
  // flow has no way to do.
  templateOverride?: TemplateDto | null;
}) {
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  // Resolved early (right after the state it reads) rather than down by the
  // templates-fetch effect where it conceptually lives, specifically so
  // useMusicPlayer below can already fall back to the template's own
  // DefaultMusicUrl -- a plain derived value, not a hook, so hoisting it
  // ahead of other hooks changes nothing about hook-call order.
  const template = templateOverride ?? templates.find((item) => item.id === value.templateId) ?? null;
  // "scenes" templates give each section after the hero its own background
  // (src/lib/templateScenes.ts) instead of sharing the template's one
  // PageBg for the whole canvas -- every other template resolves an empty
  // array here, so sceneStyle(key) below always returns undefined for them
  // and every section renders exactly as before this existed.
  const scenes = useMemo(
    () => (template?.sceneLayoutStyle === "scenes" ? parseScenes(template.scenesJson) : []),
    [template?.sceneLayoutStyle, template?.scenesJson]
  );
  const sceneStyle = (key: SceneSectionKey) => sceneStyleFor(scenes, key);
  // Which envelope-cover branch to render (the template's own library photo
  // vs. a named style vs. the generic fallback) depends on `template` below,
  // which is only known once this fetch resolves — without this flag the
  // generic EnvelopeCover briefly flashes on first paint, then gets swapped
  // for the template's real one the instant the fetch finishes. Already
  // "loaded" when templateOverride supplies the template directly — there's
  // nothing left to fetch.
  const [templatesLoaded, setTemplatesLoaded] = useState(Boolean(templateOverride));
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Owned here (not inside MusicPlayerModal) so the track keeps playing
  // across the modal opening/closing, and so the envelope's "OPEN" tap can
  // start it directly.
  // The guest's own Step13Music pick always wins; otherwise the template
  // plays its own curated default track (Template.DefaultMusicUrl) so a
  // guest previewing it with nothing customized yet hears the same mood the
  // admin set up, instead of silence. Resolved once here (not inline at
  // each call site) so the bottom-nav music button's visibility and the
  // player modal's title/preset lookup all agree with what's actually
  // playing.
  const resolvedMusicUrl = value.musicUrl || template?.defaultMusicUrl || null;
  // Only borrows the template's title alongside its own url -- pairing the
  // guest's own musicTitle (if any) with a template's fallback url would
  // mislabel whatever track that url actually plays.
  const resolvedMusicTitle = value.musicUrl ? value.musicTitle : template?.defaultMusicTitle;
  const music = useMusicPlayer(resolvedMusicUrl, value.musicStartSeconds ?? 0);
  const { audioRef: musicAudioRef, youtubeContainerRef: musicYoutubeContainerRef } = music;
  const standalone = variant === "standalone";
  // Owned here rather than inside EnvelopeCover — it needs to drive the
  // *canvas's* scroll position (window in standalone, scrollRef in
  // embedded), which EnvelopeCover has no reference to.
  const autoScroll = useAutoScroll({ standalone, containerRef: scrollRef });

  // Hands control back to the guest the moment they touch the page
  // themselves — wheel/touch/pointer are genuine input gestures, unlike the
  // `scroll` events autoScroll's own rAF loop produces by writing
  // scrollTop/scrollTo, so this can't fight its own programmatic scrolling.
  useEffect(() => {
    if (!autoScroll.isActive) return;
    const target: Window | HTMLDivElement | null = standalone ? window : scrollRef.current;
    if (!target) return;
    const handleInteraction = () => autoScroll.pauseForInteraction();
    target.addEventListener("wheel", handleInteraction, { passive: true });
    target.addEventListener("touchstart", handleInteraction, { passive: true });
    target.addEventListener("pointerdown", handleInteraction, { passive: true });
    return () => {
      target.removeEventListener("wheel", handleInteraction);
      target.removeEventListener("touchstart", handleInteraction);
      target.removeEventListener("pointerdown", handleInteraction);
    };
    // autoScroll is a fresh object every render — depending on the two
    // stable members this effect actually reads (isActive, the memoized
    // pauseForInteraction) instead of the whole object avoids re-attaching
    // these listeners on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScroll.isActive, autoScroll.pauseForInteraction, standalone]);

  useEffect(() => {
    if (templateOverride) return;
    let cancelled = false;
    getTemplates()
      .then((list) => {
        if (!cancelled) setTemplates(list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTemplatesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [templateOverride]);

  // A moving video background reads busier than any static photo/gradient
  // this canvas already renders behind section cards — dropping the glass
  // box (see sectionCardClass's `transparent` param) lets the text sit
  // directly on the scene instead of floating in a disconnected box on top
  // of it, matching how the source design (no card wrapper, text-shadow
  // only) actually looked.
  const transparentCards = Boolean(template?.ambientVideoUrl);
  // backgroundImageUrl (not imageUrl!) is the compositable asset — imageUrl
  // is purely the picker-grid thumbnail and may have baked-in demo text.
  // previewImageUrl (no backend template resolved) always renders
  // full-bleed, matching this prop's original single-mode demo purpose.
  const backgroundImageUrl = template?.backgroundImageUrl ?? previewImageUrl ?? null;
  const usingPreviewImage = !template?.backgroundImageUrl && Boolean(previewImageUrl);
  const templateLayout: TemplateLayout = template
    ? resolveTemplateLayout(template.layout, Boolean(template.backgroundImageUrl))
    : previewImageUrl
      ? "full-bleed"
      : "none";
  const isFullBleed = templateLayout === "full-bleed";
  const isBoxedHero = templateLayout === "boxed-hero";
  const isOverlay = templateLayout === "overlay";
  // The hero's arch-window frame (further below) is the shared "bounded
  // photo card" treatment for both full-bleed (where it's an accent on top
  // of the full-page photo) and boxed-hero (where it's the *only* photo on
  // the canvas) — so it reads heroImageUrl for either. "overlay" never gets
  // a photo at all, only its drawn frame.
  const heroImageUrl = isFullBleed || isBoxedHero ? backgroundImageUrl : null;
  // Decorative artwork (floral wreath, graduation cap, balloon cluster...)
  // independent of BackgroundImageUrl/Layout — a template with no photo at
  // all (Layout "overlay"/"none") still gets these, which is exactly what
  // was missing before: those templates rendered nothing between the hero
  // label and the names/main card, just empty space. heroIllustrationUrl
  // only renders when heroImageUrl doesn't already occupy that spot (a
  // photo template's arch frame is that template's own illustration slot);
  // decorationImageUrl is independent and can accompany either.
  const heroIllustrationUrl = !heroImageUrl ? (template?.heroIllustrationUrl ?? null) : null;
  const decorationImageUrl = template?.decorationImageUrl ?? null;
  // Resolves the template's own PageBg/CardBg/TextColor/PrimaryAccent
  // tokens into the --tpl-* CSS custom properties every section below reads
  // — see resolveCanvasTheme's doc comment. `theme.isDark` is the only
  // remaining boolean threaded through JSX below, for the handful of spots
  // (forced-white hero text over an unpredictable full-bleed photo, a
  // drop-shadow that only matters over a photo) that can't be expressed as
  // a plain CSS variable.
  const theme = resolveCanvasTheme(template, isFullBleed, value.textColor, transparentCards);
  const ambientVariant = resolveAmbientVariant(template, theme.isDark);
  // The guest's own Step04BasicInfo font pick always wins; otherwise the
  // template supplies its own default (see Template.DefaultNamesFont) so a
  // script-styled template like w019 doesn't read in the same font as a
  // bold-caps one like w024 just because neither has a background photo.
  const namesFont = value.namesFont || template?.defaultNamesFont || "font-cinzel";
  // The hero event-title line, and (since Step04 shares one control for
  // both) the thank-you caption right below it — same guest-choice-then-
  // template-default precedence as namesFont above. thankYouFont checks its
  // own, more specific template default first so an admin can give the two
  // captions genuinely different looks before a guest has picked either.
  const eventTitleFont = value.eventTitleFont || template?.eventTitleFont || "font-cinzel";
  const thankYouFont = value.eventTitleFont || template?.thankYouTextFont || template?.eventTitleFont || "font-cinzel";
  // The hero's "family of X & family of Y" line.
  const familyNamesFont = value.familyNamesFont || template?.familyNamesFont || "font-cinzel";
  // One font choice drives only the invitation card's own text (title,
  // invitation copy, date line, the "بانتظار تشريفكم" note) — Step18
  // Additional's "Invitation card font" picker. Everything else on the
  // canvas (hero names/event title, family names, venue name, envelope)
  // keeps its own independent font field, unaffected by this one. Same
  // guest-choice-then-template-default precedence as namesFont above,
  // checking the more specific InvitationTextFont before the broader
  // DefaultNamesFont (set on templates from before that dedicated field
  // existed).
  const cardTextFont = value.generalTextFont || template?.invitationTextFont || template?.defaultNamesFont || "";

  const language = resolveLanguage(value.language);
  const isRtl = RTL_LANGUAGES.has(language);
  const labels = NAV_LABELS[language];
  const canvas = CANVAS_LABELS[language];
  const countdownLabels = COUNTDOWN_LABELS[language];
  const countdownStartedMessage = COUNTDOWN_STARTED_MESSAGE[language];

  const names = [value.firstName, value.invitationType === "couple" ? value.secondName : null]
    .filter(Boolean)
    .join(" & ");
  const familyNames = value.hideFamilyNames
    ? ""
    : [value.familyName1, value.familyName2].filter(Boolean).join(" & ");
  const useHijri = Boolean(value.useHijriDate);
  const eventDate = formatEventDate(value.eventDateTime, LOCALE_TAGS[language], useHijri, value.eventEndDateTime);
  const countdown = useCountdown(value.eventDateTime);
  const calendar = calendarParts(value.eventDateTime, LOCALE_TAGS[language], useHijri, value.eventEndDateTime);
  const primaryVenue = value.venues[0] ?? null;
  const rules = (value.eventRulesText ?? "").split(RULES_DELIMITER).map((rule) => rule.trim()).filter(Boolean);

  const navItems: BottomBarItem[] = [
    { key: "contact", icon: PhoneIcon, label: labels.contact, show: value.contacts.length > 0 },
    { key: "music", icon: MusicIcon, label: labels.music, show: Boolean(resolvedMusicUrl) },
    { key: "capture", icon: CameraIcon, label: labels.capture, show: !value.hideCameraButton, isAction: true },
    { key: "location", icon: MapPinIcon, label: labels.location, show: value.venues.length > 0 },
    { key: "gift", icon: GiftIcon, label: labels.gift, show: value.enableGifts },
    { key: "rsvp", icon: HeartIcon, label: labels.rsvp, show: value.enableRsvp },
  ];

  const modalTitles: Record<string, string> = {
    contact: labels.contact,
    location: labels.location,
    music: labels.music,
    gift: labels.gift,
    rsvp: labels.rsvp,
  };

  function handleNavSelect(key: string) {
    if (key === "capture") {
      setCameraOpen(true);
    } else {
      setOpenModal(key);
    }
  }

  function renderModalBody(key: string) {
    switch (key) {
      case "contact":
        return <ContactModal contacts={value.contacts} isRtl={isRtl} />;
      case "location":
        return <LocationModal venues={value.venues} openMapsLabel={canvas.openMaps} />;
      case "music": {
        const preset = findPresetTrackByUrl(resolvedMusicUrl);
        return (
          <MusicPlayerModal
            title={resolvedMusicTitle}
            coverImageUrl={heroImageUrl}
            coverColor={preset?.color}
            fallbackLabel={labels.music}
            player={music}
          />
        );
      }
      case "gift":
        return <GiftModal value={value} isRtl={isRtl} />;
      case "rsvp":
        return <InteractiveRSVPModal value={value} isRtl={isRtl} readOnly={readOnly} />;
      default:
        return null;
    }
  }

  // The envelope-open cover is a guest-facing entry animation — the studio's
  // own embedded phone-bezel mockup (where the designer is actively typing
  // and expects to see every keystroke reflected immediately) never shows
  // it, and neither does a not-yet-named draft.
  const showEnvelope = standalone && Boolean(names);
  // Gates AmbientVideoBackground below -- while the envelope is still
  // closed, nothing should be playing/visible behind it at all (a guest on
  // a slow connection would otherwise see the ambient video load and play
  // through the still-loading envelope before its own cover paints). Starts
  // true whenever there's no envelope to wait for in the first place.
  const [envelopeOpened, setEnvelopeOpened] = useState(!showEnvelope);

  // Split in two because they need to fire at genuinely different moments
  // for EnvelopeMediaCover's video-based covers (see its onRevealed prop):
  // handleEnvelopeOpen fires on the guest's tap, before anything has
  // actually played -- music.play() has to run synchronously inside that
  // click for the browser's autoplay policy to allow it, and resetting
  // scroll here (while the envelope still fully covers the content) is what
  // guarantees the reveal starts at the top. handleEnvelopeRevealed fires
  // once the cover has actually finished showing whatever it shows (a short
  // CSS transition for every other cover, but a multi-second opening video
  // for EnvelopeMediaCover) and the invitation is really about to become
  // visible -- that's the right moment to start the ambient video and the
  // auto-scroll ride, not the tap. Every cover except EnvelopeMediaCover has
  // no such gap (its own transition IS the reveal), so its onOpen just
  // calls both together, unchanged from before this split.
  const ENVELOPE_TRANSITION_MS = 550;
  // Fires on the guest's tap, same moment as handleEnvelopeOpen below (every
  // cover calls one or the other on tap, before its own fade-out animation
  // even starts) -- gates EnvelopeCtaCaption so the hint label disappears
  // the instant the guest taps, instead of lingering through the cover's
  // fade or (for EnvelopeMediaCover's video covers) the whole opening video.
  const [envelopeTapped, setEnvelopeTapped] = useState(false);
  function handleEnvelopeOpen() {
    setEnvelopeTapped(true);
    // The browser's own scroll-restoration (or just a scroll position left
    // over from an earlier visit to this exact URL) can leave the page
    // already scrolled partway down -- invisible while the opaque envelope
    // covers it, but revealed the instant it fades away. Forcing scroll
    // back to 0 here, while the envelope still fully covers the content,
    // guarantees the reveal always starts at the top (family names) rather
    // than wherever a stale scroll position happened to be.
    if (standalone) {
      window.scrollTo(0, 0);
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    if (music.canPlay) music.play();
  }
  function handleEnvelopeRevealed() {
    setEnvelopeOpened(true);
    // Deliberately deferred a beat: the envelope cover itself fades out
    // (and then unmounts) over its own ~500ms transition, and starting the
    // ride's scroll ticks immediately meant they landed right on top of
    // that fade-out/unmount's own reflow — real-device screen recordings
    // showed a single stutter at almost exactly that mark (a frozen frame
    // or two, then a catch-up jump), not a continuous jitter. Letting the
    // cover's own transition finish first before the ride's timer starts
    // competing for the main thread removes that collision without
    // changing how anything looks or sounds.
    window.setTimeout(() => autoScroll.start(), ENVELOPE_TRANSITION_MS);
  }
  function handleEnvelopeOpenAndReveal() {
    handleEnvelopeOpen();
    handleEnvelopeRevealed();
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={LOCALE_TAGS[language]}
      // Backdrop-blur on ~15 stacked cards, repainted on every single
      // scrollTo() call of the unattended auto-scroll ride (useAutoScroll),
      // measured directly at 20+ seconds of continuous main-thread blocking
      // for the ride alone — content-visibility helps but doesn't remove
      // this, since every card still has to pay the blur cost once it
      // actually reaches the viewport during the ride. data-riding drops
      // backdrop-filter entirely (see globals.css) for exactly the window
      // where nothing is holding the frame steady long enough to notice —
      // full glass quality is back the instant the guest touches the screen
      // and the ride pauses, or once it finishes.
      data-riding={autoScroll.isActive && !autoScroll.isPaused ? "true" : undefined}
      style={{ ...theme.vars, background: "var(--tpl-page-bg)" } as CSSProperties}
      className={cn(
        "relative",
        standalone ? "w-full" : "flex flex-col overflow-hidden",
        isRtl ? "text-right" : "text-left",
        className
      )}
    >
      {/* Scrollable canvas: the template image + its darkening overlay are
          absolutely sized to match the *entire* content height below (not
          just the hero), so the background never runs out and shows a cream
          gap, no matter how far the user scrolls. In standalone mode there's
          no bounded box to scroll within — the page itself scrolls, and the
          image/overlay still stretch to fill this div because its height is
          set by the in-flow content below (absolutely positioned children
          don't participate in that calculation). */}
      <div
        ref={standalone ? undefined : scrollRef}
        className={cn("relative", standalone ? "" : "flex-1 overflow-y-auto scroll-smooth")}
      >
        {/* Only full-bleed stretches a photo behind the entire scrollable
            canvas — boxed-hero's photo stays confined to the arch-window
            frame further down, and overlay never has a background photo at
            all (heroImageUrl is null for both, so this simply doesn't
            render, but the isFullBleed check is the actual source of truth
            in case that ever changes). */}
        {isFullBleed && heroImageUrl && (
          <>
            <div className="absolute inset-0 overflow-hidden">
              <motion.div className="absolute inset-0" {...kenBurns}>
                {isVideoSource(heroImageUrl) ? (
                  <video
                    src={heroImageUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : canUseNextImage(heroImageUrl) ? (
                  <Image
                    src={heroImageUrl}
                    alt=""
                    fill
                    // Always unoptimized here (not just usingPreviewImage) —
                    // next/image's own resizer picks a width purely from this
                    // `fill` container's CSS *width* (~480px), oblivious to the
                    // fact that object-cover in this narrow-but-tall box (the
                    // canvas's real, much taller scroll height) actually needs
                    // resolution matched to *height*. That mismatch was
                    // serving a 480x320 source stretched to cover thousands of
                    // px tall — a visibly blurry background. SeedTemplates.cs's
                    // BackgroundImageUrl already requests an appropriately-sized
                    // crop straight from Unsplash (?w=1200), so skipping
                    // next/image's local re-resize here serves that resolution
                    // as-is instead of a second, worse guess on top of it.
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
              </motion.div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/70" />
          </>
        )}

        {/* The template's decorative artwork, promoted to a full-screen
            background — `fill` + object-cover renders it absolutely
            positioned edge-to-edge (absolute inset-0, 100% width/height),
            exactly like the full-bleed photo above, instead of floating as
            a small centered box inside the hero's own padding/flex
            constraints. Only ever set for a template with no BackgroundImageUrl
            (heroIllustrationUrl is null whenever heroImageUrl is present —
            see its resolution above), so this and the full-bleed block
            never both render at once. */}
        {heroIllustrationUrl && (
          <>
            <div className="absolute inset-0 overflow-hidden">
              <motion.div className="absolute inset-0" {...kenBurns}>
                {isVideoSource(heroIllustrationUrl) ? (
                  <video
                    src={heroIllustrationUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : canUseNextImage(heroIllustrationUrl) ? (
                  <Image
                    src={heroIllustrationUrl}
                    alt=""
                    fill
                    // Always unoptimized — see the matching comment on the
                    // full-bleed Image above; same next/image width-vs-height
                    // mismatch, same fix.
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroIllustrationUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
              </motion.div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/70" />
          </>
        )}

        {/* Decorative frame for the "overlay" layout — a hand-drawn gold
            corner flourish rather than a background photo, since an
            overlay template carries no compositable image at all. Fixed to
            the viewport (not the scrolling content) so it reads as a
            constant "frame" around the canvas the way a physical card's
            printed border would, instead of scrolling away after the hero. */}
        {isOverlay && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none z-[6]",
              standalone ? "fixed inset-4" : "absolute inset-3"
            )}
          >
            <div className="absolute inset-0 rounded-[28px] border border-[var(--tpl-accent-30)]" />
            <div className="absolute inset-[6px] rounded-[22px] border border-[var(--tpl-accent-15)]" />
            {(["-top-1 -start-1", "-top-1 -end-1", "-bottom-1 -start-1", "-bottom-1 -end-1"] as const).map(
              (corner) => (
                <span
                  key={corner}
                  className={cn(
                    "absolute size-3 rotate-45 border border-[var(--tpl-accent-40)] bg-[var(--tpl-page-bg-solid)]",
                    corner
                  )}
                />
              )
            )}
          </div>
        )}

        {/* Warm paper/canvas grain over the whole canvas (photo or plain
            gradient alike) — faint enough to stay invisible as a texture in
            isolation, but it's what keeps every flat gold gradient from
            reading as a digital wash. */}
        <div className="paper-texture pointer-events-none absolute inset-0 z-[5] opacity-[0.07]" aria-hidden />

        {template?.ambientVideoUrl && envelopeOpened && (
          <AmbientVideoBackground videoSrc={template.ambientVideoUrl} standalone={standalone} textIsLight={theme.isDark} />
        )}

        <AmbientParticles standalone={standalone} variant={ambientVariant} />

        <div className="relative z-10 space-y-16 pb-32">
          {/* Hero — fades and slides each line in with an incrementing delay
              on mount, so the couple's names and date settle into place
              instead of popping in all at once. Each line's delay is fixed
              at mount time (not tied to render count), so the countdown's
              once-a-second re-render never restarts or disturbs them.
              min-h-full was a no-op (this div's own ancestors never define a
              height for "full" to resolve against), so a full-bleed hero
              photo's short text cluster hugged the top instead of centering
              in the photo — leaving a bare gap of pure photo beneath it
              before the next card. Pinning a real height only when there's
              an actual full-bleed photo behind it (never for a plain/
              gradient background, which has no such gap to fill) lets
              justify-center do its actual job. */}
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
              isFullBleed && heroImageUrl ? "min-h-[70dvh]" : "min-h-full"
            )}
          >
            {/* The hero's only "&" glyph now lives inside the names line
                below (real names via NamesLine, or PLACEHOLDER_NAMES on a
                still-blank draft) — a separate always-on decorative mark
                used to sit here too, which meant a blank draft showed two
                disconnected ampersands stacked on top of each other. One
                authoritative "&", always attached to an actual name pair,
                reads as an invitation instead of a broken glyph. */}
            {!templatePreviewMode && value.eventTitle && (
              <motion.p
                {...heroFade(0)}
                style={fontSizeStyle(1, value.eventTitleFontSize)}
                className={cn(
                  "text-base tracking-[0.2em] text-[var(--tpl-emphasis)]",
                  TEXT_SHADOW,
                  eventTitleFont
                )}
              >
                {value.eventTitle}
              </motion.p>
            )}
            {!templatePreviewMode && familyNames && (
              <motion.p
                {...heroFade(1)}
                style={fontSizeStyle(0.6875, value.familyNamesFontSize)}
                className={cn("text-[11px] tracking-wide", familyNamesFont, TONE.body)}
              >
                {familyNames}
              </motion.p>
            )}

            {/* Invitation copy — sits right after the event title/family
                names per the guest's own fill-in order (event, then family,
                then the invitation text itself), ahead of the couple's
                names/photo below. archIslamic's own card already renders the
                couple's names + family labels as part of its design, so it
                intentionally duplicates what NamesLine shows further down
                rather than needing this section reordered around it too. */}
            {!templatePreviewMode && value.invitationText && template?.invitationCardStyle === "archIslamic" && (
              <ArchIslamicInvitationCard
                firstName={value.firstName ?? ""}
                secondName={value.invitationType === "couple" ? value.secondName : null}
                namesFont={namesFont}
                familyName1={value.familyName1}
                familyName2={value.familyName2}
                invitationText={value.invitationText}
                invitationTextFontSize={value.invitationTextFontSize}
                isRtl={isRtl}
                accent={theme.vars["--tpl-accent"]}
              />
            )}
            {!templatePreviewMode && value.invitationText && template?.invitationCardStyle !== "archIslamic" && (
              <motion.div
                {...sectionReveal}
                className={cn(sectionCardClass(undefined, transparentCards), "flex flex-col items-center gap-4 text-center")}
              >
                {/* whiteSpace: pre-line -- plain HTML collapses the guest's
                    own manual line breaks (Step05InvitationText's textarea)
                    into a single space, so the paragraph only ever wrapped
                    wherever the container happened to run out of width
                    instead of where the guest actually broke their lines. */}
                <p
                  style={{ whiteSpace: "pre-line", ...fontSizeStyle(1, value.invitationTextFontSize) }}
                  className={cn("text-base leading-relaxed", cardTextFont || "font-sans", TONE.body)}
                >
                  {value.invitationText}
                </p>
              </motion.div>
            )}

            {/* Arched window image frame — a warm-backlit arch "window"
                onto the template's photo. Doubles as two different things
                depending on templateLayout: for full-bleed it's an accent
                on top of the full-page photo behind it; for boxed-hero it
                *is* the only photo on the canvas, since that layout has no
                full-page background at all — matching the reference's own
                "small bounded photo card in the hero, plain theme
                everywhere else" template style rather than stretching the
                same photo behind the whole page regardless of how tall it
                gets. Fixed w-36/h-56 box + object-cover keeps the crop
                intentional and consistent instead of the ad-hoc
                over-zoom/stretch a naive full-height background produces
                on a portrait-oriented source photo. */}
            {heroImageUrl && template?.heroFrameStyle === "archIslamic" && (
              <motion.div {...heroFade(2)}>
                <ArchIslamicHeroFrame
                  imageUrl={heroImageUrl}
                  unoptimized={usingPreviewImage}
                  kenBurnsProps={kenBurns}
                  accent={theme.vars["--tpl-accent"]}
                />
              </motion.div>
            )}
            {heroImageUrl && template?.heroFrameStyle !== "archIslamic" && (
              <motion.div {...heroFade(2)} className="relative mx-auto mt-1 w-36">
                <span
                  aria-hidden
                  className="absolute inset-x-0 -top-4 mx-auto h-40 w-40 rounded-full bg-[radial-gradient(circle,var(--tpl-accent-40),transparent_70%)] blur-2xl"
                />
                <div className="relative h-56 w-36 overflow-hidden rounded-t-[72px] border border-white/30 shadow-[0_0_30px_rgba(255,214,160,0.35)]">
                  <motion.div className="absolute inset-0" {...kenBurns}>
                    {isVideoSource(heroImageUrl) ? (
                      <video
                        src={heroImageUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : canUseNextImage(heroImageUrl) ? (
                      <Image src={heroImageUrl} alt="" fill unoptimized={usingPreviewImage} className="object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                  </motion.div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
                </div>
              </motion.div>
            )}

            {!templatePreviewMode &&
              (value.useNameImage && value.nameImageUrl ? (
                <motion.div {...heroFade(3)} className="mx-auto w-40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={value.nameImageUrl} alt={names} className="w-full object-contain drop-shadow" />
                </motion.div>
              ) : (
                <motion.p
                  {...heroFade(3)}
                  style={fontSizeStyle(2.25, value.namesFontSize)}
                  className={cn(
                    "text-4xl font-light",
                    namesFont,
                    names ? TONE.strong : cn(TONE.strong, "opacity-50"),
                    theme.isDark && "drop-shadow"
                  )}
                >
                  <NamesLine
                    names={names || PLACEHOLDER_NAMES[language]}
                    layout={value.namesLayout === "vertical" ? "vertical" : "horizontal"}
                  />
                </motion.p>
              ))}
            {!templatePreviewMode && value.thankYouImageUrl ? (
              <motion.img
                {...heroFade(4)}
                src={value.thankYouImageUrl}
                alt=""
                className="mt-1 max-h-16 max-w-[60%] object-contain"
              />
            ) : (
              !templatePreviewMode && value.thankYouText && (
                <motion.p
                  {...heroFade(4)}
                  className={cn("mt-1 text-[10px] uppercase tracking-widest", thankYouFont)}
                  style={{
                    color: theme.isDark ? "#ffffff" : (value.thankYouTextColor ?? "#111111"),
                    ...fontSizeStyle(0.625, value.thankYouTextFontSize),
                  }}
                >
                  {value.thankYouText}
                </motion.p>
              )
            )}
            {!templatePreviewMode && value.enableQrEntry && (
              <motion.div {...heroFade(5)}>
                <QrCodeIcon className={cn("mt-2 size-6", TONE.muted)} />
              </motion.div>
            )}
          </div>

          {/* Section-divider decoration — a small recurring ornament (a
              thin floral sprig, a graduation tassel flourish, a confetti
              scatter...) the template supplies to break up the gap between
              the hero and the main card, instead of leaving that stretch of
              the page bare. Independent of heroIllustrationUrl above: a
              photo template (full-bleed/boxed-hero) has no hero illustration
              slot but can still carry this. Deliberately one fixed size
              everywhere (unlike the hero illustration) since it's a subtle
              recurring accent, not a per-occasion centerpiece. */}
          {decorationImageUrl && (
            <motion.div {...sectionReveal} className="relative mx-auto size-20 opacity-80">
              {canUseNextImage(decorationImageUrl) ? (
                <Image
                  src={decorationImageUrl}
                  alt=""
                  fill
                  unoptimized={usingPreviewImage}
                  className="object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={decorationImageUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
              )}
            </motion.div>
          )}

          {!templatePreviewMode && template?.dateRevealStyle === "scratch" && (
            <ScratchDateCard
              eventDateTime={value.eventDateTime}
              locale={LOCALE_TAGS[language]}
              isRtl={isRtl}
              accent={theme.vars["--tpl-accent"]}
            />
          )}

          {/* Everything from here through the closing footer is the guest's
              actual content — venue, program, rules, gallery, wishes... —
              none of which exists yet while the designer is still on the
              template-selection step, and all of which would just be
              "أحمد & سارة"/placeholder clutter over the template's own
              artwork if it rendered there. templatePreviewMode skips this
              entire stack (but not the background layer above it) for
              exactly that one step. */}
          {!templatePreviewMode && (
            <>
          {/* Location/venue card — always-visible summary (hotel name +
              full address) distinct from the bottom-nav Location modal,
              which adds the embedded map/"Open Google Maps" action on top
              of this same info. */}
          {primaryVenue && (
            <motion.div
              {...sectionReveal}
              style={sceneStyle("venue")}
              className={cn(sectionCardClass(undefined, transparentCards), "text-center")}
            >
              <p className={cn("mb-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold", TONE.heading)}>
                <MapPinIcon className="size-3.5 text-[var(--tpl-accent)]" />
                {labels.location}
              </p>
              <p className={cn("text-sm font-medium", TONE.strong)}>{primaryVenue.name}</p>
              {primaryVenue.address && (
                <p className={cn("mt-1 text-xs leading-relaxed", TONE.body)}>{primaryVenue.address}</p>
              )}
            </motion.div>
          )}

          {/* Accommodation — not part of the reference's own flow (it has no
              lodging section), but a real toggle this app supports beyond
              pure fidelity-cloning, so it stays, placed next to the venue
              info it's thematically closest to rather than dropped. */}
          {value.showAccommodation && value.accommodations.length > 0 && (
            <motion.div {...sectionReveal} style={sceneStyle("accommodation")} className={sectionCardClass(undefined, transparentCards)}>
              <p className={cn("mb-2 flex items-center gap-1.5 text-[11px] font-semibold", TONE.heading)}>
                <BedDoubleIcon className="size-3.5 text-[var(--tpl-accent)]" />
                {canvas.accommodation}
              </p>
              <div className="space-y-2">
                {value.accommodations.map((hotel, index) => (
                  <div key={index} className={cn("rounded-xl px-2.5 py-2", TONE.chip)}>
                    <p className={cn("text-[11px] font-medium", TONE.strong)}>{hotel.name || "—"}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Save-the-date desk calendar widget — its own distinct framed
              object rather than another glass section card, matching the
              reference's torn-calendar-page treatment, plus the
              "احفظ الموعد" button that hands the guest a real .ics file. */}
          {calendar && (
            <div style={sceneStyle("saveDate")}>
              <CalendarCard
                month={calendar.month}
                day={calendar.day}
                weekday={calendar.weekday}
                time={calendar.time}
                eventIso={value.eventDateTime ?? null}
                endEventIso={value.eventEndDateTime ?? null}
                eventTitle={value.eventTitle}
                venueName={primaryVenue?.name}
                saveDateLabel={canvas.saveDate}
                untitledEventLabel={canvas.untitledEvent}
              />
            </div>
          )}

          {/* Countdown — its own widget (heading + live 4-box grid) rather
              than merged into the calendar card above, matching the
              reference's separate "العد التنازلي" section. */}
          {countdown && (
            <motion.div
              {...sectionReveal}
              style={sceneStyle("countdown")}
              className={cn(sectionCardClass(undefined, transparentCards), "flex flex-col items-center gap-3 text-center")}
            >
              {eventDate && <p className={cn("text-xs", TONE.muted)}>{eventDate}</p>}
              {countdown.started ? (
                <p className={cn("max-w-[220px] text-sm font-medium leading-relaxed", TONE.strong)}>
                  {countdownStartedMessage}
                </p>
              ) : (
                <>
                  <p className={cn("text-[11px] font-semibold", TONE.heading)}>{countdownLabels.heading}</p>
                  <div className="grid w-full grid-cols-4 gap-2">
                    {[
                      [countdown.days, countdownLabels.days],
                      [countdown.hours, countdownLabels.hours],
                      [countdown.minutes, countdownLabels.minutes],
                      [countdown.seconds, countdownLabels.seconds],
                    ].map(([value, label]) => (
                      <div
                        key={label}
                        className="rounded-xl border border-[var(--tpl-card-border)] bg-[var(--tpl-chip-bg)] p-3 text-center"
                      >
                        <p className={cn("text-base font-medium", TONE.strong)}>{value}</p>
                        <p className={cn("mt-0.5 text-[10px]", TONE.muted)}>{label}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Program — a scroll-driven timeline. Every node starts as a
              hollow ring with a bare, unfilled rail; only the row currently
              crossing the viewport's vertical center (TIMELINE_REVEAL_VIEWPORT)
              lights up — its ring fills solid and glows, and the rail
              segment below it pours in — so the schedule reveals one stop at
              a time as the guest scrolls, instead of the whole list
              appearing together the moment the card comes into view. */}
          {value.showEventProgram && value.programItems.length > 0 && (
            <motion.div {...sectionReveal} style={sceneStyle("program")} className={sectionCardClass("p-4", transparentCards)}>
              <p className={cn("mb-8 flex items-center gap-1.5 text-[11px] font-semibold", TONE.heading)}>
                <ClipboardListIcon className="size-3.5 text-[var(--tpl-accent)]" />
                {canvas.program}
              </p>
              <ul>
                {value.programItems.map((item, index) => {
                  const isLast = index === value.programItems.length - 1;
                  return (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0.35, x: isRtl ? 12 : -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={TIMELINE_REVEAL_VIEWPORT}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="flex gap-3"
                    >
                      <div className="flex flex-col items-center">
                        {/* Hollow ring, always present, so a not-yet-reached
                            stop still reads as a placeholder on the rail
                            rather than empty space. */}
                        <span className="relative mt-1 size-2.5 shrink-0 rounded-full border border-[var(--tpl-emphasis-40)]">
                          {/* Solid glowing fill — only painted in once this
                              row crosses the center band. */}
                          <motion.span
                            initial={{ scale: 0, opacity: 0, boxShadow: "0 0 0 0 rgba(200,162,74,0)" }}
                            whileInView={{ scale: 1, opacity: 1, boxShadow: "0 0 10px 3px var(--tpl-accent-40)" }}
                            viewport={TIMELINE_REVEAL_VIEWPORT}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="absolute inset-0 rounded-full bg-[var(--tpl-emphasis)]"
                          />
                        </span>
                        {!isLast && (
                          <span className="relative w-px flex-1 overflow-hidden">
                            <span className="absolute inset-0 bg-[var(--tpl-emphasis-15)]" />
                            {/* Fill overlay — scales in from the top only
                                once *this* row (not the card as a whole)
                                crosses the center band, so the rail pours
                                downward in step with the guest's scroll
                                instead of being fully drawn on mount. */}
                            <motion.span
                              initial={{ scaleY: 0 }}
                              whileInView={{ scaleY: 1 }}
                              viewport={TIMELINE_REVEAL_VIEWPORT}
                              transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
                              style={{ transformOrigin: "top" }}
                              className="absolute inset-0 bg-[var(--tpl-emphasis)]"
                            />
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          "flex flex-1 items-center justify-between text-[11px]",
                          isLast ? "pb-0" : "pb-4"
                        )}
                      >
                        {/* A crisp drop shadow (dark themes only) rather than
                            the shared TONE palette alone — this row's text
                            sits directly on whatever backdrop peeks through
                            the card's glass, so a dark/photo theme needs the
                            strongest legibility guarantee on the canvas. */}
                        <span className={cn("font-medium", TONE.body, theme.isDark && "drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]")}>
                          {item.title}
                        </span>
                        {item.time && (
                          <span className={cn("font-medium", TONE.muted, theme.isDark && "drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]")}>
                            {item.time}
                          </span>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>
          )}

          {/* Rules */}
          {value.showEventRules && rules.length > 0 && (
            <motion.div {...sectionReveal} style={sceneStyle("rules")} className={sectionCardClass(undefined, transparentCards)}>
              <p className={cn("mb-6 flex items-center gap-1.5 text-[11px] font-semibold", TONE.heading)}>
                <ClipboardListIcon className="size-3.5 text-[var(--tpl-accent)]" />
                {canvas.eventDetails}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rules.map((rule) => (
                  <span
                    key={rule}
                    className={cn(
                      "rounded-full border border-[var(--tpl-accent-40)] bg-[var(--tpl-chip-bg)] px-2.5 py-1 text-[10px] font-medium text-[var(--tpl-emphasis)]",
                      theme.isDark && "drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                    )}
                  >
                    {rule}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Personal message */}
          {value.showPersonalMessage && value.personalMessageText && (
            <motion.div
              {...sectionReveal}
              style={sceneStyle("personalMessage")}
              className={cn(sectionCardClass(undefined, transparentCards), "text-center")}
            >
              {value.personalMessageTitle && (
                <p className={cn("text-[11px] font-semibold", TONE.heading)}>{value.personalMessageTitle}</p>
              )}
              <p className={cn("mt-1 text-[11px] leading-relaxed", TONE.body)}>{value.personalMessageText}</p>
              {value.personalMessageSignature && (
                <p className="mt-1 text-[10px] text-[var(--tpl-accent)]">{value.personalMessageSignature}</p>
              )}
            </motion.div>
          )}

          {/* Gallery — unlike the other sections this renders directly on
              the canvas background with no glass card (matches the
              reference: a plain heading + 2-column grid, no border/blur). */}
          {value.galleryImages.filter(Boolean).length > 0 && (
            <motion.div {...sectionReveal} style={sceneStyle("gallery")} className="px-4">
              <h3 className={cn("mb-4 flex items-center justify-center gap-1.5 text-xl font-normal", TONE.muted)}>
                <ImageIcon className="size-4 text-[var(--tpl-accent)]" />
                {canvas.galleryMoments}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {value.galleryImages.filter(Boolean).map((url, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
                    className="aspect-square overflow-hidden rounded-3xl bg-white/55 backdrop-blur-[12px]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="size-full object-cover" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Guest wishes — live attendee count (sum of confirmed RSVP
              guest counts) plus the messages guests left when RSVPing.
              Derived from real submissions (backend RsvpAttendingCount /
              RsvpWishes), not fabricated — so it only renders when there's
              actually something to show. */}
          {((value.rsvpShowLiveCount && value.rsvpAttendingCount > 0) ||
            (value.rsvpShowMessage && value.rsvpWishes.length > 0)) && (
            <div style={sceneStyle("wishes")}>
              {value.rsvpShowLiveCount && value.rsvpAttendingCount > 0 && (
                <motion.div {...sectionReveal} className="text-center">
                  <p className={cn("mb-2 flex items-center justify-center gap-2 text-xs", TONE.heading)}>{canvas.attendeeCount}</p>
                  <p className={cn("mb-3 text-4xl font-light", TONE.strong)}>{value.rsvpAttendingCount}</p>
                </motion.div>
              )}

              {value.rsvpShowMessage && value.rsvpWishes.length > 0 && (
                <motion.div {...sectionReveal} className="px-4">
                  <p className={cn("mb-2 flex items-center justify-center gap-2 text-xs", TONE.heading)}>{canvas.wishes}</p>
                  <WishesCarousel wishes={value.rsvpWishes} />
                </motion.div>
              )}
            </div>
          )}

          {/* Closing footer — names, short date, and the Numinds mark that
              close out every guest-facing invitation page. */}
          {(names || value.eventDateTime) && (
            <motion.div
              {...sectionReveal}
              style={sceneStyle("footer")}
              className="flex flex-col items-center gap-2 px-6 py-8 text-center"
            >
              {names && (
                <p className={cn("text-sm", namesFont, TONE.muted)}>
                  <NamesLine names={names} />
                </p>
              )}
              {formatShortDate(value.eventDateTime) && (
                <p className={cn("text-xs", TONE.muted)}>{formatShortDate(value.eventDateTime)}</p>
              )}
              <HeartIcon className="size-3.5 text-[var(--tpl-accent)] opacity-60" />
              {/* The one CTA on the whole guest-facing page that isn't part
                  of the invitation itself -- every share is free reach to a
                  wedding-adjacent audience, but only if this is actually a
                  legible, clickable link. Opens in a new tab so a curious
                  guest doesn't lose their place on the invitation they're
                  viewing. */}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold uppercase tracking-widest text-olive-vivid transition-opacity hover:opacity-75"
              >
                Made by ZAYTORA
              </a>
            </motion.div>
          )}
            </>
          )}
        </div>
      </div>

      {!templatePreviewMode && (
        <BottomBar items={navItems} activeKey={openModal} onSelect={handleNavSelect} standalone={standalone} />
      )}

      {/* Floating auto-scroll pause/resume — shown only while a ride is
          underway (from envelope-open until it reaches the bottom).
          stopPropagation on pointerdown keeps the interaction-pause
          listener above from immediately re-pausing right after a tap here
          resumes it. */}
      {autoScroll.isActive && (
        <motion.button
          type="button"
          onClick={autoScroll.togglePause}
          onPointerDown={(event) => event.stopPropagation()}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileTap={{ scale: 0.9 }}
          aria-label={autoScroll.isPaused ? canvas.resumeAutoScroll : canvas.pauseAutoScroll}
          className={cn(
            "flex size-11 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md",
            standalone ? "fixed bottom-24 end-4 z-[999]" : "absolute bottom-20 end-3 z-30"
          )}
        >
          {autoScroll.isPaused ? <PlayIcon className="size-4 ms-0.5" /> : <PauseIcon className="size-4" />}
        </motion.button>
      )}

      <AnimatePresence>
        {openModal && (
          <>
            <motion.button
              key="modal-backdrop"
              type="button"
              aria-label={canvas.closeModal}
              onClick={() => setOpenModal(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn("z-40 bg-black/30", standalone ? STANDALONE_FULLSCREEN_CLASS : "absolute inset-0")}
            />
            <motion.div
              key="modal-sheet"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className={cn(
                "z-50 flex max-h-[70%] flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/95 shadow-[0_8px_40px_rgba(0,0,0,0.18)] backdrop-blur-2xl",
                standalone ? "fixed inset-x-4 bottom-20 mx-auto max-w-[400px]" : "absolute inset-x-3 bottom-20"
              )}
            >
              <div className="relative flex shrink-0 items-center justify-center border-b border-gray-100/80 bg-gradient-to-r from-gray-50/60 to-white/60 px-4 py-2.5">
                <h3 className="text-xs font-semibold tracking-wide text-gray-700">{modalTitles[openModal]}</h3>
                <button
                  type="button"
                  onClick={() => setOpenModal(null)}
                  aria-label={canvas.closeModal}
                  className="absolute end-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
                >
                  <XIcon className="size-3.5 text-gray-500" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">{renderModalBody(openModal)}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {cameraOpen && (
        <CameraOverlay
          isRtl={isRtl}
          onClose={() => setCameraOpen(false)}
          standalone={standalone}
          names={names}
          eventDate={eventDate}
          invitationId={value.id}
          readOnly={readOnly}
        />
      )}

      {/* Which envelope-cover branch below applies depends on `template`,
          which isn't resolved until the templates fetch above finishes — a
          neutral loading cover here (instead of nothing) keeps the guest
          from ever seeing the raw, uncovered invitation content or the
          generic fallback envelope flash before the template's real one
          swaps in. */}
      {showEnvelope && !templatesLoaded && (
        <div
          className={cn(
            "z-[1000] flex items-center justify-center bg-black",
            standalone ? STANDALONE_FULLSCREEN_CLASS : "absolute inset-0"
          )}
        >
          <LoaderIcon className="size-6 animate-spin text-white/70" />
        </div>
      )}
      {showEnvelope && templatesLoaded && !template?.envelopePhotoUrl && template?.envelopeStyle === "waxseal" && (
        <WaxSealEnvelopeCover
          firstName={value.firstName ?? ""}
          secondName={value.invitationType === "couple" ? value.secondName : null}
          namesFont={value.envelopeNameFont}
          onOpen={handleEnvelopeOpenAndReveal}
          standalone={standalone}
        />
      )}
      {showEnvelope && templatesLoaded && !template?.envelopePhotoUrl && template?.envelopeStyle === "crimsonSeal" && (
        <CrimsonWaxSealEnvelopeCover
          onOpen={handleEnvelopeOpenAndReveal}
          standalone={standalone}
        />
      )}
      {showEnvelope && templatesLoaded && !template?.envelopePhotoUrl && template?.envelopeStyle === "oliveSeal" && (
        <OliveWaxSealEnvelopeCover
          onOpen={handleEnvelopeOpenAndReveal}
          standalone={standalone}
        />
      )}
      {showEnvelope && templatesLoaded && !template?.envelopePhotoUrl && template?.envelopeStyle === "navyGoldSeal" && (
        <NavyGoldWaxSealEnvelopeCover
          onOpen={handleEnvelopeOpenAndReveal}
          standalone={standalone}
        />
      )}
      {showEnvelope && templatesLoaded && template?.openingVideoUrl && (
        <EnvelopeMediaCover
          mediaSrc={template.openingVideoUrl}
          namesFont={value.envelopeNameFont}
          language={language === "ar" ? "ar" : "en"}
          onOpen={handleEnvelopeOpen}
          onRevealed={handleEnvelopeRevealed}
          standalone={standalone}
          firstName={value.firstName}
          secondName={value.invitationType === "couple" ? value.secondName : null}
          initialsXPercent={template.envelopeInitialsXPercent}
          initialsYPercent={template.envelopeInitialsYPercent}
          hideOpenHint={Boolean(template.envelopeCtaShape)}
        />
      )}
      {/* An admin-assigned library envelope (see /admin/envelopes) is legacy
          data — TemplateEditModal dropped its picker once openingVideoUrl
          became the one unified "envelope" field, so these four only mount
          for an old template whose envelopeId was never cleared, and only
          when openingVideoUrl is unset (that field always wins now — see
          the branch above). Which of these four mounts depends on the
          envelope's own shape (Envelope.openingStyle, picked when the admin
          added it): a flat diamond-flap envelope peels open from the seal
          (PhotoWaxSealEnvelopeCover); a rolled, string-tied scroll unrolls
          instead (ScrollUnrollEnvelopeCover); a photo split into two equal
          panels either slides apart straight (DoorSlideEnvelopeCover) or
          hinges open in 3D like a real door (DoorFoldEnvelopeCover) — both
          independent of the seal position, genuinely different physical
          motions from each other and from the other two styles. */}
      {showEnvelope &&
        templatesLoaded &&
        template?.envelopePhotoUrl &&
        !template?.openingVideoUrl &&
        template?.envelopeOpeningStyle === "scroll" && (
        <ScrollUnrollEnvelopeCover
          imageSrc={template.envelopePhotoUrl}
          imageAlt=""
          sealXPercent={template.envelopeSealXPercent ?? 50}
          sealYPercent={template.envelopeSealYPercent ?? 50}
          onOpen={handleEnvelopeOpenAndReveal}
          standalone={standalone}
        />
      )}
      {showEnvelope &&
        templatesLoaded &&
        template?.envelopePhotoUrl &&
        !template?.openingVideoUrl &&
        template?.envelopeOpeningStyle === "doorSlide" && (
        <DoorSlideEnvelopeCover
          imageSrc={template.envelopePhotoUrl}
          imageAlt=""
          onOpen={handleEnvelopeOpenAndReveal}
          standalone={standalone}
        />
      )}
      {showEnvelope &&
        templatesLoaded &&
        template?.envelopePhotoUrl &&
        !template?.openingVideoUrl &&
        template?.envelopeOpeningStyle === "doorFold" && (
        <DoorFoldEnvelopeCover
          imageSrc={template.envelopePhotoUrl}
          imageAlt=""
          onOpen={handleEnvelopeOpenAndReveal}
          standalone={standalone}
        />
      )}
      {showEnvelope &&
        templatesLoaded &&
        template?.envelopePhotoUrl &&
        !template?.openingVideoUrl &&
        template?.envelopeOpeningStyle !== "scroll" &&
        template?.envelopeOpeningStyle !== "doorSlide" &&
        template?.envelopeOpeningStyle !== "doorFold" && (
        <PhotoWaxSealEnvelopeCover
          imageSrc={template.envelopePhotoUrl}
          imageAlt=""
          sealXPercent={template.envelopeSealXPercent ?? 50}
          sealYPercent={template.envelopeSealYPercent ?? 50}
          foldPoints={template.envelopeFoldPoints ?? []}
          onOpen={handleEnvelopeOpenAndReveal}
          standalone={standalone}
        />
      )}
      {showEnvelope &&
        templatesLoaded &&
        !template?.envelopePhotoUrl &&
        template?.envelopeStyle !== "waxseal" &&
        template?.envelopeStyle !== "crimsonSeal" &&
        template?.envelopeStyle !== "oliveSeal" &&
        template?.envelopeStyle !== "navyGoldSeal" &&
        !template?.openingVideoUrl && (
        <EnvelopeCover
          firstName={value.firstName ?? ""}
          secondName={value.invitationType === "couple" ? value.secondName : null}
          namesFont={value.envelopeNameFont}
          backgroundImageUrl={heroImageUrl}
          unoptimized={usingPreviewImage}
          onOpen={handleEnvelopeOpenAndReveal}
          standalone={standalone}
        />
      )}

      {/* Admin-authored hint label (see Template.EnvelopeCtaShape), layered
          on top of whichever cover above just mounted — a single shared
          overlay instead of teaching all eight cover components their own
          caption rendering. !envelopeTapped hides it the instant the guest
          taps (matching every cover's own tap-to-open affordances, which all
          disappear immediately rather than lingering through their own
          fade-out or, for a video cover, the whole opening clip) — without
          it the label stayed visible for the entire opening animation and
          beyond, since showEnvelope/templatesLoaded alone don't reflect
          whether the guest has actually opened the envelope yet. */}
      {showEnvelope && templatesLoaded && !envelopeTapped && (
        <EnvelopeCtaCaption
          template={template}
          language={language === "ar" ? "ar" : "en"}
          namesFont={value.envelopeNameFont}
          standalone={standalone}
        />
      )}

      {/* Mounted once at the canvas root (not inside the Music modal) so the
          track keeps playing in the background across the modal opening and
          closing, and so the envelope's "OPEN" tap can start it directly.
          preload="auto" (not "metadata") so the browser starts buffering the
          actual audio bytes from the moment the envelope mounts — by the
          time a guest taps to open it, play() has real data to start from
          instead of needing to fetch it first, which is what made music feel
          like it started a beat after the touch rather than with it. */}
      {music.mode === "html5" && music.effectiveUrl && (
        <audio key={music.effectiveUrl} ref={musicAudioRef} src={music.effectiveUrl} preload="auto" />
      )}
      {music.mode === "youtube" && (
        <div className="pointer-events-none size-px overflow-hidden opacity-0" aria-hidden>
          <div ref={musicYoutubeContainerRef} />
        </div>
      )}
    </div>
  );
}
