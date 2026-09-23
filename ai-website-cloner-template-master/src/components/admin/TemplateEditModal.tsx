"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderIcon, UploadIcon, XIcon } from "@/components/icons";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/categories";
import { cn, isVideoSource } from "@/lib/utils";
import { uploadTemplateImage, uploadTemplateVideo } from "@/lib/services/templates.service";
import {
  createMusicSuggestion,
  listActiveMusicSuggestions,
  uploadMusicSuggestionAudio,
} from "@/lib/services/musicSuggestions.service";
import { PRESET_TRACKS, trackLabel } from "@/lib/musicLibrary";
import { buildMockInvitation } from "@/lib/mockInvitation";
import { FONT_OPTIONS } from "@/components/studio/fields/FontSelect";
import { PhonePreview } from "@/components/studio/PhonePreview";
import type { MusicSuggestionDto, TemplateDto, TemplateWriteRequest } from "@/types/api";

const LAYOUTS = ["full-bleed", "boxed-hero", "overlay", "none"] as const;
const AMBIENT_EFFECTS = ["", "smoke", "petals", "sparkle", "snow", "none"] as const;
const HERO_FRAME_STYLES = ["", "archIslamic"] as const;
const DATE_REVEAL_STYLES = ["", "scratch"] as const;
const INVITATION_CARD_STYLES = ["", "archIslamic"] as const;

const COPY = {
  ar: {
    title: "تعديل القالب",
    close: "إغلاق",
    category: "التصنيف",
    imageUrl: "رابط صورة الغلاف الرئيسية (مطلوب)",
    backgroundImageUrl: "رابط صورة الخلفية الحية (اختياري — نفس الصورة أعلاه إن تُركت فارغة)",
    uploadFromDevice: "أو ارفع صورة من جهازك",
    uploadEnvelopeFromDevice: "أو ارفع صورة أو فيديو من جهازك",
    uploadVideoFromDevice: "أو ارفع فيديو من جهازك",
    uploading: "جارٍ الرفع...",
    uploadError: "تعذّر رفع الصورة. تأكد إنها JPG أو PNG أو WebP بحجم أقل من 8 ميغابايت.",
    uploadEnvelopeError: "تعذّر الرفع. تأكد إنه JPG أو PNG أو WebP أو MP4 أو WebM بحجم أقل من 6 ميغابايت — فيديو أكبر من هيك بيصير بطيء أو ما بيفتح على هاتف الضيف. اضغط الفيديو أول (مثلاً HandBrake) قبل الرفع.",
    uploadVideoError: "تعذّر رفع الفيديو. تأكد إنه MP4 أو WebM بحجم أقل من 6 ميغابايت — فيديو أكبر من هيك بيصير بطيء أو ما بيشتغل على هاتف الضيف. اضغط الفيديو أول (مثلاً HandBrake) قبل الرفع.",
    openingVideoUrl: "الظرف (صورة أو فيديو، اختياري) — يفتح عند الضغط عليه",
    envelopeInitials: "موضع حروف العروسين فوق الظرف (اختياري)",
    envelopeInitialsHint: "لتغطية أي حروف ثابتة برسمة الظرف بحروف العروسين الحقيقية — اتركه فارغاً لعدم إظهار أي طبقة",
    envelopeInitialsX: "الموضع أفقياً %",
    envelopeInitialsY: "الموضع عمودياً %",
    ambientVideoUrl: "فيديو خلفية متحرك (اختياري)",
    layout: "طريقة عرض الصورة",
    layoutHint: {
      "full-bleed": "خلفية كاملة خلف الصفحة",
      "boxed-hero": "صورة محصورة داخل بطاقة في الأعلى فقط",
      overlay: "زخرفة فوق الثيم بلا صورة خلفية",
      none: "بدون صورة — ثيم لوني فقط",
    },
    pageBg: "لون خلفية الصفحة (hex أو تدرّج hex,hex)",
    cardBg: "لون خلفية البطاقات",
    textColor: "لون النص",
    primaryAccent: "اللون المميز",
    defaultNamesFont: "خط الأسماء الافتراضي (اختياري)",
    eventTitleFont: "خط عنوان الحدث الافتراضي (اختياري)",
    thankYouTextFont: "خط نص الشكر الافتراضي (اختياري)",
    familyNamesFont: "خط أسماء العائلات الافتراضي (اختياري)",
    invitationTextFont: "خط نص الدعوة الافتراضي (اختياري)",
    chooseFontDefault: "الافتراضي",
    defaultMusic: "الموسيقى الافتراضية (اختياري)",
    chooseFromLibrary: "اختر من مكتبة الموسيقى المحفوظة",
    chooseFromLibraryPlaceholder: "-- اختر مقطوعة محفوظة --",
    libraryGroupBuiltIn: "مكتبة الموسيقى",
    libraryGroupSuggestions: "مقترحات محفوظة مسبقاً",
    orEnterManually: "أو أدخل رابطاً / ارفع ملفاً يدوياً",
    musicUrlPlaceholder: "https://youtube.com/watch?v=...",
    uploadAudioFromDevice: "أو ارفع ملف صوتي من جهازك",
    uploadingAudio: "جارٍ رفع الملف الصوتي...",
    uploadAudioError: "تعذّر رفع الملف الصوتي. تأكد إنه MP3 أو WAV أو OGG أو AAC أو M4A بحجم أقل من 8 ميغابايت.",
    musicTitlePlaceholder: "اسم المقطوعة / الفنان",
    saveAsMusicSuggestion: "احفظ هذه الموسيقى أيضاً ضمن مقترحات الموسيقى للزبائن",
    saveAsMusicSuggestionHint: "بتضيفها لمكتبة الموسيقى اللي يختار منها أي زبون بالخطوة 13، مو بس هاد القالب.",
    ambientEffect: "تأثير الجسيمات (اختياري)",
    heroFrameStyle: "إطار صورة المقدمة (اختياري)",
    dateRevealStyle: "طريقة كشف التاريخ (اختياري)",
    invitationCardStyle: "شكل بطاقة الدعوة الرئيسية (اختياري)",
    sceneStyleValues: {
      "": "افتراضي",
      archIslamic: "قوس إسلامي",
      scratch: "بطاقة خدش",
    } as Record<string, string>,
    isPopular: "قالب شائع (يظهر أولاً في الترتيب)",
    save: "حفظ التعديلات",
    cancel: "إلغاء",
    required: "رابط صورة الغلاف مطلوب.",
    saving: "جارٍ الحفظ...",
  },
  en: {
    title: "Edit Template",
    close: "Close",
    category: "Category",
    imageUrl: "Cover image URL (required)",
    backgroundImageUrl: "Live background image URL (optional — same as above if left blank)",
    uploadFromDevice: "Or upload a photo from your device",
    uploadEnvelopeFromDevice: "Or upload a photo or video from your device",
    uploadVideoFromDevice: "Or upload a video from your device",
    uploading: "Uploading...",
    uploadError: "Couldn't upload the image. Make sure it's a JPG, PNG, or WebP under 8MB.",
    uploadEnvelopeError: "Couldn't upload. Make sure it's a JPG, PNG, WebP, MP4, or WebM under 6MB -- anything bigger loads slowly or won't play on a guest's phone. Compress the video first (e.g. HandBrake) before uploading.",
    uploadVideoError: "Couldn't upload the video. Make sure it's an MP4 or WebM under 6MB -- anything bigger loads slowly or won't play on a guest's phone. Compress it first (e.g. HandBrake) before uploading.",
    openingVideoUrl: "Envelope (photo or video, optional) — opens on tap",
    envelopeInitials: "Couple-initials position over the envelope (optional)",
    envelopeInitialsHint: "Covers any baked-in letters on the envelope artwork with the real couple's initials — leave blank to show no overlay",
    envelopeInitialsX: "Horizontal position %",
    envelopeInitialsY: "Vertical position %",
    ambientVideoUrl: "Ambient background video (optional)",
    layout: "Photo layout",
    layoutHint: {
      "full-bleed": "Full-bleed photo behind the whole page",
      "boxed-hero": "Photo boxed into a card, hero only",
      overlay: "Decorative overlay on the theme, no background photo",
      none: "No photo — color theme only",
    },
    pageBg: "Page background (hex, or hex,hex gradient)",
    cardBg: "Card background color",
    textColor: "Text color",
    primaryAccent: "Accent color",
    defaultNamesFont: "Default names font (optional)",
    eventTitleFont: "Default event title font (optional)",
    thankYouTextFont: "Default thank-you text font (optional)",
    familyNamesFont: "Default family names font (optional)",
    invitationTextFont: "Default invitation text font (optional)",
    chooseFontDefault: "Default",
    defaultMusic: "Default music (optional)",
    chooseFromLibrary: "Choose from the saved music library",
    chooseFromLibraryPlaceholder: "-- Choose a saved track --",
    libraryGroupBuiltIn: "Music library",
    libraryGroupSuggestions: "Previously saved suggestions",
    orEnterManually: "Or enter a link / upload a file manually",
    musicUrlPlaceholder: "https://youtube.com/watch?v=...",
    uploadAudioFromDevice: "Or upload an audio file from your device",
    uploadingAudio: "Uploading audio...",
    uploadAudioError: "Couldn't upload the audio. Make sure it's an MP3, WAV, OGG, AAC, or M4A under 8MB.",
    musicTitlePlaceholder: "Track name / artist",
    saveAsMusicSuggestion: "Also save this track as a music suggestion for customers",
    saveAsMusicSuggestionHint: "Adds it to the library every customer can pick from in Step 13, not just this template.",
    ambientEffect: "Ambient particle effect (optional)",
    heroFrameStyle: "Hero photo frame style (optional)",
    dateRevealStyle: "Date reveal style (optional)",
    invitationCardStyle: "Main invitation card style (optional)",
    sceneStyleValues: {
      "": "Default",
      archIslamic: "Islamic arch",
      scratch: "Scratch card",
    } as Record<string, string>,
    isPopular: "Popular template (sorts first)",
    save: "Save changes",
    cancel: "Cancel",
    required: "Cover image URL is required.",
    saving: "Saving...",
  },
};

// [color-scheme:...] tells the browser which palette to render this
// control's own native chrome in (a <select>'s dropdown popup, in
// particular) — without it, the popup defaults to a light background while
// still inheriting this class's light --foreground text in dark mode,
// making every non-selected option nearly invisible. Same fix already used
// for native inputs elsewhere in the studio (e.g. DateTimeField.tsx).
const inputClass =
  "w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors [color-scheme:light] dark:[color-scheme:dark] focus:border-[#C8A24A]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-body-foreground">{label}</span>
      {children}
    </label>
  );
}

export function TemplateEditModal({
  record,
  language,
  onClose,
  onSave,
}: {
  record: TemplateDto | null;
  language: "ar" | "en";
  onClose: () => void;
  onSave: (id: string, payload: TemplateWriteRequest) => Promise<unknown>;
}) {
  if (!record) return null;

  return (
    <TemplateEditModalContent key={record.id} record={record} language={language} onClose={onClose} onSave={onSave} />
  );
}

function TemplateEditModalContent({
  record,
  language,
  onClose,
  onSave,
}: {
  record: TemplateDto;
  language: "ar" | "en";
  onClose: () => void;
  onSave: (id: string, payload: TemplateWriteRequest) => Promise<unknown>;
}) {
  const t = COPY[language];
  const [form, setForm] = useState<TemplateWriteRequest>({
    category: record.category,
    imageUrl: record.imageUrl,
    backgroundImageUrl: record.backgroundImageUrl ?? "",
    layout: record.layout ?? "none",
    pageBg: record.pageBg ?? "",
    cardBg: record.cardBg ?? "",
    textColor: record.textColor ?? "",
    primaryAccent: record.primaryAccent ?? "",
    defaultNamesFont: record.defaultNamesFont ?? "",
    eventTitleFont: record.eventTitleFont ?? "",
    thankYouTextFont: record.thankYouTextFont ?? "",
    familyNamesFont: record.familyNamesFont ?? "",
    invitationTextFont: record.invitationTextFont ?? "",
    defaultMusicUrl: record.defaultMusicUrl ?? "",
    defaultMusicTitle: record.defaultMusicTitle ?? "",
    heroIllustrationUrl: record.heroIllustrationUrl ?? "",
    decorationImageUrl: record.decorationImageUrl ?? "",
    openingVideoUrl: record.openingVideoUrl ?? "",
    envelopeInitialsXPercent: record.envelopeInitialsXPercent ?? null,
    envelopeInitialsYPercent: record.envelopeInitialsYPercent ?? null,
    ambientVideoUrl: record.ambientVideoUrl ?? "",
    ambientEffect: record.ambientEffect ?? "",
    heroFrameStyle: record.heroFrameStyle ?? "",
    dateRevealStyle: record.dateRevealStyle ?? "",
    invitationCardStyle: record.invitationCardStyle ?? "",
    // Not editable from this modal (multi-scene templates are only created
    // from /admin/video-templates, per product decision) -- carried through
    // as-is so saving an unrelated field here can't silently wipe them.
    sceneLayoutStyle: record.sceneLayoutStyle ?? "",
    scenesJson: record.scenesJson,
    envelopeId: record.envelopeId ?? "",
    isPopular: record.isPopular,
    isActive: record.isActive,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Which upload field is mid-flight, if any — lets every "upload from
  // device" button below share one handler per asset type while each shows
  // its own loading state independently.
  type ImageField = "imageUrl" | "backgroundImageUrl";
  type VideoField = "openingVideoUrl" | "ambientVideoUrl";
  const [uploadingField, setUploadingField] = useState<ImageField | VideoField | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadVideoError, setUploadVideoError] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadAudioError, setUploadAudioError] = useState<string | null>(null);
  // Not a template field itself -- a one-time action checked at save time:
  // when on, the same title/url about to be saved as this template's
  // DefaultMusic also gets POSTed as a standalone MusicSuggestion, so it
  // shows up in every customer's Step13Music library, not just this
  // template's own default.
  const [saveAsMusicSuggestion, setSaveAsMusicSuggestion] = useState(false);

  // The same combined library Step13Music offers a customer -- the
  // hardcoded PRESET_TRACKS plus whatever's been saved as a MusicSuggestion
  // (including via this exact modal's own "also save as a customer
  // suggestion" checkbox on an earlier template) -- so the admin can pick a
  // template's default from what's already there instead of re-pasting a
  // link or re-uploading a file every single time.
  const [librarySuggestions, setLibrarySuggestions] = useState<MusicSuggestionDto[]>([]);
  useEffect(() => {
    let cancelled = false;
    listActiveMusicSuggestions()
      .then((data) => {
        if (!cancelled) setLibrarySuggestions(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function selectLibraryTrack(url: string) {
    if (!url) return;
    const preset = PRESET_TRACKS.find((track) => track.url === url);
    if (preset) {
      patch({ defaultMusicUrl: preset.url, defaultMusicTitle: trackLabel(preset) });
      return;
    }
    const suggestion = librarySuggestions.find((track) => track.url === url);
    if (suggestion) {
      patch({
        defaultMusicUrl: suggestion.url,
        defaultMusicTitle: suggestion.artist ? `${suggestion.title} - ${suggestion.artist}` : suggestion.title,
      });
    }
  }

  // Fully-populated demo content (names, venue, program...) for the
  // occasion this template's own category implies — same generator behind
  // the homepage/templates-grid "Preview" button, reused here so the admin
  // sees a real-looking invitation rather than an empty draft. Keyed off
  // record.id/category (never changes while this modal is open), not
  // `form`, since it's just the content the template gets previewed with,
  // independent of whatever the admin is currently editing about it.
  const previewValue = useMemo(
    () => buildMockInvitation(record.id, record.category),
    [record.id, record.category]
  );
  // The in-progress, not-yet-saved edit -- merges every field this form can
  // touch on top of the last-saved record, so InvitationCanvas's
  // templateOverride renders exactly what "Save" would produce, live, as
  // the admin tweaks each field.
  const previewTemplate: TemplateDto = useMemo(() => ({ ...record, ...form }), [record, form]);

  function patch(next: Partial<TemplateWriteRequest>) {
    setForm((current) => ({ ...current, ...next }));
  }

  async function handleUpload(field: ImageField, file: File) {
    setUploadError(null);
    setUploadingField(field);
    try {
      const { url } = await uploadTemplateImage(file);
      patch({ [field]: url });
    } catch {
      setUploadError(t.uploadError);
    } finally {
      setUploadingField(null);
    }
  }

  async function handleUploadVideo(field: VideoField, file: File) {
    setUploadVideoError(null);
    setUploadingField(field);
    try {
      const { url } = await uploadTemplateVideo(file);
      patch({ [field]: url });
    } catch {
      setUploadVideoError(field === "openingVideoUrl" ? t.uploadEnvelopeError : t.uploadVideoError);
    } finally {
      setUploadingField(null);
    }
  }

  async function handleUploadAudio(file: File) {
    setUploadAudioError(null);
    setUploadingAudio(true);
    try {
      const { url } = await uploadMusicSuggestionAudio(file);
      patch({
        defaultMusicUrl: url,
        defaultMusicTitle: form.defaultMusicTitle || file.name.replace(/\.[^.]+$/, ""),
      });
    } catch {
      setUploadAudioError(t.uploadAudioError);
    } finally {
      setUploadingAudio(false);
    }
  }

  async function handleSave() {
    if (!form.imageUrl.trim()) {
      setError(t.required);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(record.id, {
        ...form,
        backgroundImageUrl: form.backgroundImageUrl?.trim() || null,
        pageBg: form.pageBg?.trim() || null,
        cardBg: form.cardBg?.trim() || null,
        textColor: form.textColor?.trim() || null,
        primaryAccent: form.primaryAccent?.trim() || null,
        defaultNamesFont: form.defaultNamesFont?.trim() || null,
        eventTitleFont: form.eventTitleFont?.trim() || null,
        thankYouTextFont: form.thankYouTextFont?.trim() || null,
        familyNamesFont: form.familyNamesFont?.trim() || null,
        invitationTextFont: form.invitationTextFont?.trim() || null,
        defaultMusicUrl: form.defaultMusicUrl?.trim() || null,
        defaultMusicTitle: form.defaultMusicTitle?.trim() || null,
        heroIllustrationUrl: form.heroIllustrationUrl?.trim() || null,
        decorationImageUrl: form.decorationImageUrl?.trim() || null,
        openingVideoUrl: form.openingVideoUrl?.trim() || null,
        ambientVideoUrl: form.ambientVideoUrl?.trim() || null,
        ambientEffect: form.ambientEffect?.trim() || null,
        // Legacy hardcoded envelope styles (waxseal/crimsonSeal/oliveSeal/
        // navyGoldSeal) are no longer editable here — force-cleared on every
        // save. Not needed for openingVideoUrl either anymore: the frontend
        // now renders EnvelopeMediaCover whenever openingVideoUrl is set,
        // full stop, regardless of this field's value.
        envelopeStyle: null,
        heroFrameStyle: form.heroFrameStyle?.trim() || null,
        dateRevealStyle: form.dateRevealStyle?.trim() || null,
        invitationCardStyle: form.invitationCardStyle?.trim() || null,
        envelopeId: form.envelopeId?.trim() || null,
      });

      // Best-effort, deliberately after the template save above: the
      // template's own DefaultMusic taking effect is the operation the
      // admin actually asked for, so a failure here shouldn't roll that
      // back or block closing the modal -- worst case the admin re-checks
      // the box and saves again to retry just the suggestion.
      const musicUrl = form.defaultMusicUrl?.trim();
      const musicTitle = form.defaultMusicTitle?.trim();
      if (saveAsMusicSuggestion && musicUrl && musicTitle) {
        try {
          await createMusicSuggestion({ title: musicTitle, url: musicUrl, isActive: true, sortOrder: 0 });
        } catch {
          // Swallowed -- see comment above.
        }
      }

      onClose();
    } catch {
      setError(t.required);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-6 pb-4">
          <div>
            <p className="text-lg font-bold text-foreground">{t.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{record.code}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/10 hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 lg:flex-row lg:overflow-hidden">
          {/* Live preview — same InvitationCanvas the guest-facing studio
              uses, fed this template's real demo content + the in-progress
              form state (not the last-saved record), so every field change
              below shows up here immediately, before "Save" is even
              clicked. */}
          <div className="flex shrink-0 justify-center lg:w-64 lg:overflow-y-auto lg:pb-2">
            <PhonePreview value={previewValue} templateOverride={previewTemplate} sticky={false} />
          </div>

          <div className="min-w-0 flex-1 lg:overflow-y-auto lg:pe-1">
            <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.category}>
            <select value={form.category} onChange={(event) => patch({ category: event.target.value as CategoryId })} className={inputClass}>
              {CATEGORY_IDS.map((id) => (
                <option key={id} value={id}>
                  {CATEGORY_LABELS[language][id]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.layout}>
            <select value={form.layout} onChange={(event) => patch({ layout: event.target.value })} className={inputClass}>
              {LAYOUTS.map((layout) => (
                <option key={layout} value={layout}>
                  {t.layoutHint[layout]}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label={t.imageUrl}>
              <div className="flex items-center gap-3">
                <input value={form.imageUrl} onChange={(event) => patch({ imageUrl: event.target.value })} className={inputClass} />
                {form.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="" className="h-14 w-9 shrink-0 rounded-lg border border-border object-cover" />
                )}
              </div>
            </Field>
            <label className="mt-1.5 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#C8A24A]/40 px-3 py-1.5 text-xs font-medium text-[#C8A24A] transition-colors hover:bg-[#C8A24A]/5">
              {uploadingField === "imageUrl" ? <LoaderIcon className="size-3.5 animate-spin" /> : <UploadIcon className="size-3.5" />}
              {uploadingField === "imageUrl" ? t.uploading : t.uploadFromDevice}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploadingField !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void handleUpload("imageUrl", file);
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="sm:col-span-2">
            <Field label={t.backgroundImageUrl}>
              <div className="flex items-center gap-3">
                <input
                  value={form.backgroundImageUrl ?? ""}
                  onChange={(event) => patch({ backgroundImageUrl: event.target.value })}
                  className={inputClass}
                />
                {form.backgroundImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.backgroundImageUrl} alt="" className="h-14 w-9 shrink-0 rounded-lg border border-border object-cover" />
                )}
              </div>
            </Field>
            <label className="mt-1.5 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#C8A24A]/40 px-3 py-1.5 text-xs font-medium text-[#C8A24A] transition-colors hover:bg-[#C8A24A]/5">
              {uploadingField === "backgroundImageUrl" ? (
                <LoaderIcon className="size-3.5 animate-spin" />
              ) : (
                <UploadIcon className="size-3.5" />
              )}
              {uploadingField === "backgroundImageUrl" ? t.uploading : t.uploadFromDevice}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploadingField !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void handleUpload("backgroundImageUrl", file);
                }}
                className="hidden"
              />
            </label>
          </div>

          {uploadError && (
            <p className="text-xs font-medium text-rose-700 sm:col-span-2 dark:text-rose-400">{uploadError}</p>
          )}

          <div className="sm:col-span-2">
            <Field label={t.openingVideoUrl}>
              <div className="flex items-center gap-3">
                <input
                  value={form.openingVideoUrl ?? ""}
                  onChange={(event) => patch({ openingVideoUrl: event.target.value })}
                  className={inputClass}
                />
                {form.openingVideoUrl &&
                  (isVideoSource(form.openingVideoUrl) ? (
                    <video src={form.openingVideoUrl} muted className="h-14 w-9 shrink-0 rounded-lg border border-border object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.openingVideoUrl} alt="" className="h-14 w-9 shrink-0 rounded-lg border border-border object-cover" />
                  ))}
              </div>
            </Field>
            <label className="mt-1.5 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#C8A24A]/40 px-3 py-1.5 text-xs font-medium text-[#C8A24A] transition-colors hover:bg-[#C8A24A]/5">
              {uploadingField === "openingVideoUrl" ? <LoaderIcon className="size-3.5 animate-spin" /> : <UploadIcon className="size-3.5" />}
              {uploadingField === "openingVideoUrl" ? t.uploading : t.uploadEnvelopeFromDevice}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                disabled={uploadingField !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void handleUploadVideo("openingVideoUrl", file);
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="sm:col-span-2">
            <Field label={t.envelopeInitials}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="mb-1 block text-xs text-muted-foreground">{t.envelopeInitialsX}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.envelopeInitialsXPercent ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      patch({ envelopeInitialsXPercent: raw === "" ? null : Number(raw) });
                    }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs text-muted-foreground">{t.envelopeInitialsY}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.envelopeInitialsYPercent ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      patch({ envelopeInitialsYPercent: raw === "" ? null : Number(raw) });
                    }}
                    className={inputClass}
                  />
                </div>
              </div>
            </Field>
            <p className="mt-1.5 text-xs text-muted-foreground">{t.envelopeInitialsHint}</p>
          </div>

          <div className="sm:col-span-2">
            <Field label={t.ambientVideoUrl}>
              <div className="flex items-center gap-3">
                <input
                  value={form.ambientVideoUrl ?? ""}
                  onChange={(event) => patch({ ambientVideoUrl: event.target.value })}
                  className={inputClass}
                />
                {form.ambientVideoUrl && (
                  <video src={form.ambientVideoUrl} muted className="h-14 w-9 shrink-0 rounded-lg border border-border object-cover" />
                )}
              </div>
            </Field>
            <label className="mt-1.5 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#C8A24A]/40 px-3 py-1.5 text-xs font-medium text-[#C8A24A] transition-colors hover:bg-[#C8A24A]/5">
              {uploadingField === "ambientVideoUrl" ? <LoaderIcon className="size-3.5 animate-spin" /> : <UploadIcon className="size-3.5" />}
              {uploadingField === "ambientVideoUrl" ? t.uploading : t.uploadVideoFromDevice}
              <input
                type="file"
                accept="video/mp4,video/webm"
                disabled={uploadingField !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void handleUploadVideo("ambientVideoUrl", file);
                }}
                className="hidden"
              />
            </label>
          </div>

          {uploadVideoError && (
            <p className="text-xs font-medium text-rose-700 sm:col-span-2 dark:text-rose-400">{uploadVideoError}</p>
          )}

          <div className="sm:col-span-2">
            <Field label={t.pageBg}>
              <input
                value={form.pageBg ?? ""}
                onChange={(event) => patch({ pageBg: event.target.value })}
                placeholder="#faf1ea,#fffdfa"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <Field label={t.cardBg}>
              <input
                type="color"
                value={form.cardBg || "#f5f5f5"}
                onChange={(event) => patch({ cardBg: event.target.value })}
                className="h-10 w-full cursor-pointer rounded-xl border border-border"
              />
            </Field>
            <Field label={t.textColor}>
              <input
                type="color"
                value={form.textColor || "#1f1f1f"}
                onChange={(event) => patch({ textColor: event.target.value })}
                className="h-10 w-full cursor-pointer rounded-xl border border-border"
              />
            </Field>
            <Field label={t.primaryAccent}>
              <input
                type="color"
                value={form.primaryAccent || "#C8A24A"}
                onChange={(event) => patch({ primaryAccent: event.target.value })}
                className="h-10 w-full cursor-pointer rounded-xl border border-border"
              />
            </Field>
          </div>

          <Field label={t.defaultNamesFont}>
            <select
              value={form.defaultNamesFont ?? ""}
              onChange={(event) => patch({ defaultNamesFont: event.target.value })}
              className={inputClass}
            >
              <option value="">{t.chooseFontDefault}</option>
              {FONT_OPTIONS[language].map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.eventTitleFont}>
            <select
              value={form.eventTitleFont ?? ""}
              onChange={(event) => patch({ eventTitleFont: event.target.value })}
              className={inputClass}
            >
              <option value="">{t.chooseFontDefault}</option>
              {FONT_OPTIONS[language].map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.thankYouTextFont}>
            <select
              value={form.thankYouTextFont ?? ""}
              onChange={(event) => patch({ thankYouTextFont: event.target.value })}
              className={inputClass}
            >
              <option value="">{t.chooseFontDefault}</option>
              {FONT_OPTIONS[language].map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.familyNamesFont}>
            <select
              value={form.familyNamesFont ?? ""}
              onChange={(event) => patch({ familyNamesFont: event.target.value })}
              className={inputClass}
            >
              <option value="">{t.chooseFontDefault}</option>
              {FONT_OPTIONS[language].map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.invitationTextFont}>
            <select
              value={form.invitationTextFont ?? ""}
              onChange={(event) => patch({ invitationTextFont: event.target.value })}
              className={inputClass}
            >
              <option value="">{t.chooseFontDefault}</option>
              {FONT_OPTIONS[language].map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <p className="mb-1.5 block text-xs font-medium text-body-foreground">{t.defaultMusic}</p>

            <Field label={t.chooseFromLibrary}>
              <select
                value={
                  // Only reflects a library match, not a free-typed/uploaded
                  // url -- otherwise picking a preset, then editing the
                  // title by hand, would visually "unselect" it here even
                  // though the underlying url hasn't changed.
                  PRESET_TRACKS.some((track) => track.url === form.defaultMusicUrl) ||
                  librarySuggestions.some((track) => track.url === form.defaultMusicUrl)
                    ? form.defaultMusicUrl ?? ""
                    : ""
                }
                onChange={(event) => selectLibraryTrack(event.target.value)}
                className={inputClass}
              >
                <option value="">{t.chooseFromLibraryPlaceholder}</option>
                <optgroup label={t.libraryGroupBuiltIn}>
                  {PRESET_TRACKS.map((track) => (
                    <option key={track.id} value={track.url}>
                      {trackLabel(track)}
                    </option>
                  ))}
                </optgroup>
                {librarySuggestions.length > 0 && (
                  <optgroup label={t.libraryGroupSuggestions}>
                    {librarySuggestions.map((track) => (
                      <option key={track.id} value={track.url}>
                        {track.artist ? `${track.title} - ${track.artist}` : track.title}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </Field>

            <p className="mb-1.5 mt-3 text-xs text-muted-foreground">{t.orEnterManually}</p>
            <input
              value={form.defaultMusicTitle ?? ""}
              onChange={(event) => patch({ defaultMusicTitle: event.target.value })}
              placeholder={t.musicTitlePlaceholder}
              className={inputClass}
            />
            <input
              value={form.defaultMusicUrl ?? ""}
              onChange={(event) => patch({ defaultMusicUrl: event.target.value })}
              placeholder={t.musicUrlPlaceholder}
              className={cn(inputClass, "mt-2")}
            />
            <label className="mt-1.5 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#C8A24A]/40 px-3 py-1.5 text-xs font-medium text-[#C8A24A] transition-colors hover:bg-[#C8A24A]/5">
              {uploadingAudio ? <LoaderIcon className="size-3.5 animate-spin" /> : <UploadIcon className="size-3.5" />}
              {uploadingAudio ? t.uploadingAudio : t.uploadAudioFromDevice}
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/aac,audio/mp4,audio/x-m4a"
                disabled={uploadingAudio}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void handleUploadAudio(file);
                }}
                className="hidden"
              />
            </label>
            {uploadAudioError && (
              <p className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">{uploadAudioError}</p>
            )}
            {form.defaultMusicUrl && (
              <label className="mt-3 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={saveAsMusicSuggestion}
                  onChange={(event) => setSaveAsMusicSuggestion(event.target.checked)}
                  className="mt-0.5 size-4 rounded border-border text-[#C8A24A] focus:ring-[#C8A24A]"
                />
                <span>
                  <span className="block text-sm text-body-foreground">{t.saveAsMusicSuggestion}</span>
                  <span className="block text-xs text-muted-foreground">{t.saveAsMusicSuggestionHint}</span>
                </span>
              </label>
            )}
          </div>

          <Field label={t.ambientEffect}>
            <select
              value={form.ambientEffect ?? ""}
              onChange={(event) => patch({ ambientEffect: event.target.value })}
              className={inputClass}
            >
              {AMBIENT_EFFECTS.map((effect) => (
                <option key={effect || "default"} value={effect}>
                  {effect || (language === "ar" ? "تلقائي" : "Auto")}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.heroFrameStyle}>
            <select
              value={form.heroFrameStyle ?? ""}
              onChange={(event) => patch({ heroFrameStyle: event.target.value })}
              className={inputClass}
            >
              {HERO_FRAME_STYLES.map((style) => (
                <option key={style || "default"} value={style}>
                  {t.sceneStyleValues[style]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.dateRevealStyle}>
            <select
              value={form.dateRevealStyle ?? ""}
              onChange={(event) => patch({ dateRevealStyle: event.target.value })}
              className={inputClass}
            >
              {DATE_REVEAL_STYLES.map((style) => (
                <option key={style || "default"} value={style}>
                  {t.sceneStyleValues[style]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.invitationCardStyle}>
            <select
              value={form.invitationCardStyle ?? ""}
              onChange={(event) => patch({ invitationCardStyle: event.target.value })}
              className={inputClass}
            >
              {INVITATION_CARD_STYLES.map((style) => (
                <option key={style || "default"} value={style}>
                  {t.sceneStyleValues[style]}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isPopular}
              onChange={(event) => patch({ isPopular: event.target.checked })}
              className="size-4 rounded border-border text-[#C8A24A] focus:ring-[#C8A24A]"
            />
            <span className="text-sm text-body-foreground">{t.isPopular}</span>
          </label>
        </div>

            {error && <p className="mt-3 text-xs font-medium text-rose-700 dark:text-rose-400">{error}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-body-foreground transition-colors hover:bg-background/10"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#C8A24A] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
