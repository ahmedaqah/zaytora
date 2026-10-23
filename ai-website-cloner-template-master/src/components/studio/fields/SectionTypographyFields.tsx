"use client";

import { FontSelect } from "@/components/studio/fields/FontSelect";
import { FontSizeStepper } from "@/components/studio/fields/FontSizeStepper";
import { ColorField } from "@/components/studio/fields/ColorField";
import { useLanguage } from "@/context/LanguageContext";

const COPY = {
  ar: { color: "لون النص", reset: "استخدام لون القالب", templateColor: "لون القالب" },
  en: { color: "Text color", reset: "Use the template's color", templateColor: "Template color" },
};

// Font + size + color for one invitation section. An empty color means "keep
// the template's own", so the picker only becomes an override once touched.
export function SectionTypographyFields({
  fontLabel,
  font,
  size,
  color,
  onFont,
  onSize,
  onColor,
}: {
  fontLabel: string;
  font?: string | null;
  size?: number | null;
  color?: string | null;
  onFont: (value: string) => void;
  onSize: (value: number) => void;
  onColor: (value: string) => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];

  return (
    <div className="space-y-4">
      <FontSelect label={fontLabel} value={font ?? ""} onChange={onFont} />
      <FontSizeStepper value={size} onChange={onSize} />
      <div className="space-y-1.5">
        <ColorField label={t.color} value={color || "#111111"} onChange={onColor} />
        {color ? (
          <button type="button" onClick={() => onColor("")} className="text-xs text-gold underline">
            {t.reset}
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">{t.templateColor}</p>
        )}
      </div>
    </div>
  );
}
