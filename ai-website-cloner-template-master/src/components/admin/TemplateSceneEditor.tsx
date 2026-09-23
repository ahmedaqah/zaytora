"use client";

import { useRef, useState } from "react";
import { UploadIcon, LoaderIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { uploadTemplateImage } from "@/lib/services/templates.service";
import { SCENE_SECTION_KEYS, type SceneBackgroundType, type SceneSectionKey, type TemplateScene } from "@/lib/templateScenes";

// Draft (string-only) shape for the controlled inputs below — converted to
// a real TemplateScene[] only on submit (see toScenes at the bottom).
export interface SceneDraft {
  type: SceneBackgroundType;
  solidColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: string;
  imageUrl: string;
  textColor: string;
}

export const EMPTY_SCENE_DRAFT: SceneDraft = {
  type: "solid",
  solidColor: "#f8e7c9",
  gradientFrom: "#650b17",
  gradientTo: "#3a0710",
  gradientAngle: "180",
  imageUrl: "",
  textColor: "",
};

export function createEmptySceneDrafts(): Record<SceneSectionKey, SceneDraft> {
  return Object.fromEntries(SCENE_SECTION_KEYS.map((key) => [key, { ...EMPTY_SCENE_DRAFT }])) as Record<
    SceneSectionKey,
    SceneDraft
  >;
}

// Only sections the admin actually touched (changed the background type, or
// set a color/url/text-color) are persisted — an untouched section keeps
// falling back to the template's shared background, per SceneWrapper.
export function draftsToScenes(drafts: Record<SceneSectionKey, SceneDraft>, enabled: Set<SceneSectionKey>): TemplateScene[] {
  return SCENE_SECTION_KEYS.filter((key) => enabled.has(key)).map((key) => {
    const d = drafts[key];
    return {
      sectionKey: key,
      background: {
        type: d.type,
        solidColor: d.type === "solid" ? d.solidColor : undefined,
        gradientFrom: d.type === "gradient" ? d.gradientFrom : undefined,
        gradientTo: d.type === "gradient" ? d.gradientTo : undefined,
        gradientAngle: d.type === "gradient" ? Number(d.gradientAngle) || 180 : undefined,
        imageUrl: d.type === "image" ? d.imageUrl.trim() : undefined,
      },
      textColor: d.textColor.trim() || undefined,
    };
  });
}

const SECTION_LABELS: Record<SceneSectionKey, Record<"ar" | "en", string>> = {
  venue: { ar: "الموعد والمكان", en: "Venue & location" },
  accommodation: { ar: "الإقامة", en: "Accommodation" },
  saveDate: { ar: "احفظ الموعد", en: "Save the date" },
  countdown: { ar: "العد التنازلي", en: "Countdown" },
  program: { ar: "برنامج الحدث", en: "Event program" },
  rules: { ar: "التنويهات", en: "Notes" },
  personalMessage: { ar: "رسالة شخصية", en: "Personal message" },
  gallery: { ar: "معرض الصور", en: "Photo gallery" },
  wishes: { ar: "التهاني والحضور", en: "Wishes & attendance" },
  footer: { ar: "الختام", en: "Footer" },
};

const COPY = {
  ar: {
    hint: "فعّل أي قسم تحب تعطيه خلفية مختلفة عن باقي الدعوة. أي قسم غير مفعّل بياخد خلفية القالب العامة كالمعتاد.",
    typeSolid: "لون صلب",
    typeGradient: "تدرّج",
    typeImage: "صورة",
    from: "من",
    to: "إلى",
    angle: "الزاوية",
    imageUrl: "رابط الصورة",
    upload: "رفع",
    uploading: "جارٍ الرفع...",
    textColor: "لون النص (اختياري)",
  },
  en: {
    hint: "Turn on any section you want a background different from the rest of the invitation. An untouched section keeps the template's shared background as usual.",
    typeSolid: "Solid color",
    typeGradient: "Gradient",
    typeImage: "Image",
    from: "From",
    to: "To",
    angle: "Angle",
    imageUrl: "Image URL",
    upload: "Upload",
    uploading: "Uploading...",
    textColor: "Text color (optional)",
  },
};

function SceneRow({
  sectionKey,
  enabled,
  draft,
  language,
  onToggle,
  onChange,
}: {
  sectionKey: SceneSectionKey;
  enabled: boolean;
  draft: SceneDraft;
  language: "ar" | "en";
  onToggle: (enabled: boolean) => void;
  onChange: (draft: SceneDraft) => void;
}) {
  const t = COPY[language];
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadTemplateImage(file);
      onChange({ ...draft, imageUrl: uploaded.url });
    } catch (error) {
      console.error("[TemplateSceneEditor] failed to upload scene image:", error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("rounded-xl border p-3 transition-colors", enabled ? "border-[#C8A24A]/50 bg-[#C8A24A]/5" : "border-border")}>
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} className="size-4 accent-[#C8A24A]" />
        {SECTION_LABELS[sectionKey][language]}
      </label>

      {enabled && (
        <div className="mt-3 space-y-2.5">
          <div className="flex items-center gap-1.5">
            {(["solid", "gradient", "image"] as SceneBackgroundType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ ...draft, type })}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  draft.type === type ? "bg-[#C8A24A] text-white" : "bg-background/10 text-body-foreground hover:bg-background/15"
                )}
              >
                {type === "solid" ? t.typeSolid : type === "gradient" ? t.typeGradient : t.typeImage}
              </button>
            ))}
          </div>

          {draft.type === "solid" && (
            <input
              type="color"
              value={draft.solidColor}
              onChange={(event) => onChange({ ...draft, solidColor: event.target.value })}
              className="h-9 w-16 rounded-lg border border-border"
            />
          )}

          {draft.type === "gradient" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t.from}</span>
              <input
                type="color"
                value={draft.gradientFrom}
                onChange={(event) => onChange({ ...draft, gradientFrom: event.target.value })}
                className="h-9 w-14 rounded-lg border border-border"
              />
              <span className="text-xs text-muted-foreground">{t.to}</span>
              <input
                type="color"
                value={draft.gradientTo}
                onChange={(event) => onChange({ ...draft, gradientTo: event.target.value })}
                className="h-9 w-14 rounded-lg border border-border"
              />
              <span className="text-xs text-muted-foreground">{t.angle}</span>
              <input
                type="number"
                min={0}
                max={360}
                value={draft.gradientAngle}
                onChange={(event) => onChange({ ...draft, gradientAngle: event.target.value })}
                className="w-16 rounded-lg border border-border px-2 py-1.5 text-xs text-foreground outline-none focus:border-[#C8A24A]"
              />
            </div>
          )}

          {draft.type === "image" && (
            <div className="flex items-center gap-2">
              <input
                value={draft.imageUrl}
                onChange={(event) => onChange({ ...draft, imageUrl: event.target.value })}
                placeholder={t.imageUrl}
                className="min-w-0 flex-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-[#C8A24A]"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-background/10 px-2.5 py-1.5 text-xs font-medium text-body-foreground transition-colors hover:bg-background/15 disabled:opacity-60"
              >
                {uploading ? <LoaderIcon className="size-3.5 animate-spin" /> : <UploadIcon className="size-3.5" />}
                {uploading ? t.uploading : t.upload}
              </button>
            </div>
          )}

          <input
            type="text"
            value={draft.textColor}
            onChange={(event) => onChange({ ...draft, textColor: event.target.value })}
            placeholder={t.textColor}
            className="w-40 rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-[#C8A24A]"
          />
        </div>
      )}
    </div>
  );
}

export function TemplateSceneEditor({
  language,
  drafts,
  enabledSections,
  onDraftsChange,
  onEnabledSectionsChange,
}: {
  language: "ar" | "en";
  drafts: Record<SceneSectionKey, SceneDraft>;
  enabledSections: Set<SceneSectionKey>;
  onDraftsChange: (drafts: Record<SceneSectionKey, SceneDraft>) => void;
  onEnabledSectionsChange: (enabled: Set<SceneSectionKey>) => void;
}) {
  const t = COPY[language];

  function toggle(key: SceneSectionKey, next: boolean) {
    const updated = new Set(enabledSections);
    if (next) updated.add(key);
    else updated.delete(key);
    onEnabledSectionsChange(updated);
  }

  function changeDraft(key: SceneSectionKey, draft: SceneDraft) {
    onDraftsChange({ ...drafts, [key]: draft });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t.hint}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {SCENE_SECTION_KEYS.map((key) => (
          <SceneRow
            key={key}
            sectionKey={key}
            enabled={enabledSections.has(key)}
            draft={drafts[key]}
            language={language}
            onToggle={(next) => toggle(key, next)}
            onChange={(draft) => changeDraft(key, draft)}
          />
        ))}
      </div>
    </div>
  );
}
