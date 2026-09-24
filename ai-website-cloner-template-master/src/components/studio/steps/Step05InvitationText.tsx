"use client";

import { ToggleField } from "@/components/studio/fields/ToggleField";
import { TextField } from "@/components/studio/fields/TextField";
import { TextareaField } from "@/components/studio/fields/TextareaField";
import { FontSelect } from "@/components/studio/fields/FontSelect";
import { FontSizeStepper } from "@/components/studio/fields/FontSizeStepper";
import { HintBox } from "@/components/studio/fields/HintBox";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import type { InvitationDetail } from "@/types/studio";

const COPY = {
  ar: {
    hint: 'مثال: اسم العائلة: آل الراشد · نص الدعوة: "يتشرفون بدعوتكم لحضور حفل زفافهم..."',
    hideFamilyNames: "إخفاء أسماء العائلات",
    hideFamilyNamesDescription: "لن تظهر أسماء العائلات في الدعوة والمشاركة",
    familyName1: "اسم العائلة (الأول)",
    familyName1Placeholder: "آل الراشد",
    familyName2: "اسم العائلة (الثاني)",
    familyName2Placeholder: "آل المهنا",
    familyNamesFont: "خط أسماء العائلات",
    invitationText: "نص الدعوة",
    invitationTextPlaceholder: "يتشرفون بدعوتكم...",
    invitationTextFont: "خط نص الدعوة",
  },
  en: {
    hint: 'Example: family name: "Al Rashid" · invitation text: "You are cordially invited to their wedding celebration..."',
    hideFamilyNames: "Hide family names",
    hideFamilyNamesDescription: "Family names won't appear in the invitation or when sharing",
    familyName1: "Family name (first)",
    familyName1Placeholder: "Al Rashid",
    familyName2: "Family name (second)",
    familyName2Placeholder: "Al Muhanna",
    familyNamesFont: "Family names font",
    invitationText: "Invitation text",
    invitationTextPlaceholder: "You are cordially invited...",
    invitationTextFont: "Invitation text font",
  },
};

export function Step05InvitationText({
  value,
  onChange,
}: {
  value: InvitationDetail;
  onChange: (patch: Partial<InvitationDetail>) => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];

  return (
    <div className="space-y-5">
      <HintBox>{t.hint}</HintBox>

      <ToggleField
        label={t.hideFamilyNames}
        description={t.hideFamilyNamesDescription}
        checked={value.hideFamilyNames}
        onChange={(hideFamilyNames) => onChange({ hideFamilyNames })}
      />

      {!value.hideFamilyNames && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t.familyName1}
              value={value.familyName1 ?? ""}
              placeholder={t.familyName1Placeholder}
              onChange={(familyName1) => onChange({ familyName1 })}
            />
            <TextField
              label={t.familyName2}
              value={value.familyName2 ?? ""}
              placeholder={t.familyName2Placeholder}
              onChange={(familyName2) => onChange({ familyName2 })}
            />
          </div>
          <FontSelect
            label={t.familyNamesFont}
            value={value.familyNamesFont ?? ""}
            onChange={(familyNamesFont) => onChange({ familyNamesFont })}
          />
          <FontSizeStepper
            value={value.familyNamesFontSize}
            onChange={(familyNamesFontSize) => onChange({ familyNamesFontSize })}
          />
          {(value.familyName1 || value.familyName2) && (
            <p className={cn("text-center text-base text-gold", value.familyNamesFont || "font-cinzel")}>
              {[value.familyName1, value.familyName2].filter(Boolean).join(" & ")}
            </p>
          )}
        </>
      )}

      <TextareaField
        label={t.invitationText}
        value={value.invitationText ?? ""}
        placeholder={t.invitationTextPlaceholder}
        onChange={(invitationText) => onChange({ invitationText })}
      />
      <FontSelect
        label={t.invitationTextFont}
        value={value.generalTextFont ?? ""}
        onChange={(generalTextFont) => onChange({ generalTextFont })}
      />
      <FontSizeStepper
        value={value.invitationTextFontSize}
        onChange={(invitationTextFontSize) => onChange({ invitationTextFontSize })}
      />
      {value.invitationText && (
        <p
          style={{ whiteSpace: "pre-line" }}
          className={cn("text-center text-sm leading-relaxed text-body-foreground", value.generalTextFont || "font-sans")}
        >
          {value.invitationText}
        </p>
      )}
    </div>
  );
}
