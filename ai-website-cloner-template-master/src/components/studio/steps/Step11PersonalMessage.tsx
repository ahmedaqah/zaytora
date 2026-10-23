"use client";

import { ToggleField } from "@/components/studio/fields/ToggleField";
import { TextField } from "@/components/studio/fields/TextField";
import { TextareaField } from "@/components/studio/fields/TextareaField";
import { HintBox } from "@/components/studio/fields/HintBox";
import { SectionTypographyFields } from "@/components/studio/fields/SectionTypographyFields";
import { useLanguage } from "@/context/LanguageContext";
import type { InvitationDetail } from "@/types/studio";

const COPY = {
  ar: {
    hint: 'مثال: "أعزاءنا الأصدقاء، وجودكم يعني لنا الكثير. بمحبة، أحمد وسارة"',
    addMessage: "إضافة رسالة شخصية",
    title: "العنوان",
    titlePlaceholder: "رسالة العروسين",
    messageText: "نص الرسالة",
    messageTextPlaceholder: "أعزاءنا الأصدقاء والعائلة...",
    signature: "التوقيع",
    signaturePlaceholder: "بمحبة، أحمد وسارة",
    sectionFont: "نوع خط الرسالة",
  },
  en: {
    hint: 'Example: "Dear friends, your presence means so much to us. With love, Ahmed and Sarah"',
    addMessage: "Add a personal message",
    title: "Title",
    titlePlaceholder: "A message from the couple",
    messageText: "Message text",
    messageTextPlaceholder: "Dear friends and family...",
    signature: "Signature",
    signaturePlaceholder: "With love, Ahmed and Sarah",
    sectionFont: "Message font",
  },
};

export function Step11PersonalMessage({
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
        label={t.addMessage}
        checked={value.showPersonalMessage}
        onChange={(showPersonalMessage) => onChange({ showPersonalMessage })}
      />

      {value.showPersonalMessage && (
        <>
          <TextField
            label={t.title}
            value={value.personalMessageTitle ?? ""}
            placeholder={t.titlePlaceholder}
            onChange={(personalMessageTitle) => onChange({ personalMessageTitle })}
          />
          <TextareaField
            label={t.messageText}
            value={value.personalMessageText ?? ""}
            placeholder={t.messageTextPlaceholder}
            onChange={(personalMessageText) => onChange({ personalMessageText })}
          />
          <TextField
            label={t.signature}
            value={value.personalMessageSignature ?? ""}
            placeholder={t.signaturePlaceholder}
            onChange={(personalMessageSignature) => onChange({ personalMessageSignature })}
          />
          <SectionTypographyFields
            fontLabel={t.sectionFont}
            font={value.personalMessageFont}
            size={value.personalMessageFontSize}
            color={value.personalMessageTextColor}
            onFont={(personalMessageFont) => onChange({ personalMessageFont })}
            onSize={(personalMessageFontSize) => onChange({ personalMessageFontSize })}
            onColor={(personalMessageTextColor) => onChange({ personalMessageTextColor })}
          />
        </>
      )}
    </div>
  );
}
