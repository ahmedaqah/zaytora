"use client";

import { ListEditor } from "@/components/studio/fields/ListEditor";
import { TextField } from "@/components/studio/fields/TextField";
import { TextareaField } from "@/components/studio/fields/TextareaField";
import { HintBox } from "@/components/studio/fields/HintBox";
import { SectionTypographyFields } from "@/components/studio/fields/SectionTypographyFields";
import { MapPinIcon } from "@/components/icons";
import { useLanguage } from "@/context/LanguageContext";
import type { InvitationDetail, VenueItem } from "@/types/studio";

const COPY = {
  ar: {
    hint: 'مثال: اسم القاعة: "قاعة النخيل" · العنوان: "طريق الملك فهد، الرياض"',
    addVenue: "إضافة قاعة أخرى",
    emptyVenue: "لم تتم إضافة قاعة بعد",
    venueLabel: "قاعة",
    venueName: "اسم القاعة",
    venueNamePlaceholder: "قاعة الأفراح الكبرى",
    venueAddress: "عنوان القاعة",
    venueAddressPlaceholder: "شارع الزفاف، المدينة",
    mapUrl: "رابط الخريطة",
    openMaps: "افتح خرائط جوجل",
    sectionFont: "نوع خط الموقع",
  },
  en: {
    hint: 'Example: venue name: "Palm Hall" · address: "King Fahd Road, Riyadh"',
    addVenue: "Add another venue",
    emptyVenue: "No venue added yet",
    venueLabel: "Venue",
    venueName: "Venue name",
    venueNamePlaceholder: "Grand Wedding Hall",
    venueAddress: "Venue address",
    venueAddressPlaceholder: "Wedding street, city",
    mapUrl: "Map link",
    openMaps: "Open Google Maps",
    sectionFont: "Location font",
  },
};

function resolveMapsHref(venue: VenueItem) {
  if (venue.mapUrl) return venue.mapUrl;
  const query = [venue.name, venue.address].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

export function Step06Location({
  value,
  onChange,
}: {
  value: InvitationDetail;
  onChange: (patch: Partial<InvitationDetail>) => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];

  return (
    <div className="space-y-4">
      <HintBox>{t.hint}</HintBox>
      <ListEditor<VenueItem>
        items={value.venues}
        onChange={(venues) => onChange({ venues })}
        createItem={() => ({ name: "", address: "", mapUrl: "" })}
        addLabel={t.addVenue}
        emptyLabel={t.emptyVenue}
        itemLabel={t.venueLabel}
        renderItem={(venue, update) => (
          <>
            <TextField
              label={t.venueName}
              required
              value={venue.name}
              placeholder={t.venueNamePlaceholder}
              onChange={(name) => update({ name })}
            />
            <TextareaField
              label={t.venueAddress}
              value={venue.address ?? ""}
              placeholder={t.venueAddressPlaceholder}
              rows={2}
              onChange={(address) => update({ address })}
            />
            <TextField
              label={t.mapUrl}
              value={venue.mapUrl ?? ""}
              placeholder="https://maps.google.com/..."
              onChange={(mapUrl) => update({ mapUrl })}
            />
            {(() => {
              const href = resolveMapsHref(venue);
              return (
                <a
                  href={href ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!href}
                  onClick={(event) => {
                    if (!href) event.preventDefault();
                  }}
                  className={
                    href
                      ? "flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold/40 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold/5"
                      : "flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground"
                  }
                >
                  <MapPinIcon className="size-4" />
                  {t.openMaps}
                </a>
              );
            })()}
          </>
        )}
      />

      {value.venues.length > 0 && (
        <SectionTypographyFields
          fontLabel={t.sectionFont}
          font={value.venueFont}
          size={value.venueFontSize}
          color={value.venueTextColor}
          onFont={(venueFont) => onChange({ venueFont })}
          onSize={(venueFontSize) => onChange({ venueFontSize })}
          onColor={(venueTextColor) => onChange({ venueTextColor })}
        />
      )}
    </div>
  );
}
