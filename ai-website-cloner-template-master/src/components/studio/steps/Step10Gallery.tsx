"use client";

import { useRef } from "react";
import { ImageIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { HintBox } from "@/components/studio/fields/HintBox";
import { useLanguage } from "@/context/LanguageContext";
import { prepareGalleryImage } from "@/lib/galleryUpload";
import type { InvitationDetail } from "@/types/studio";

const MAX_IMAGES = 6;

const COPY = {
  ar: {
    hint: (max: number) => `ارفع حتى ${max} صور — صور عائلية، صور القاعة، أو لحظات خاصة.`,
    deleteAria: "حذف",
    add: "إضافة",
  },
  en: {
    hint: (max: number) => `Upload up to ${max} photos — family photos, venue shots, or special moments.`,
    deleteAria: "Delete",
    add: "Add",
  },
};

export function Step10Gallery({
  value,
  onChange,
}: {
  value: InvitationDetail;
  onChange: (patch: Partial<InvitationDetail>) => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  const images = value.galleryImages;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function removeAt(index: number) {
    onChange({ galleryImages: images.filter((_, i) => i !== index) });
  }

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - images.length;
    const added = await Promise.all(files.slice(0, remainingSlots).map((file) => prepareGalleryImage(value.id, file)));
    onChange({ galleryImages: [...images, ...added] });
  }

  return (
    <div className="space-y-3">
      <HintBox>{t.hint(MAX_IMAGES)}</HintBox>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <div className="grid grid-cols-3 gap-3">
        {images.map((url, index) => (
          // `relative` (for the delete button below) lives on this outer
          // div; `overflow-hidden` (for the rounded photo corners) lives on
          // an inner one instead of here — the delete button is
          // deliberately positioned half outside the photo's own box
          // (-top-2 -end-2), and putting overflow-hidden on the same
          // element it's offset from clips it to nothing, which is why it
          // was never actually visible despite being in the markup.
          <div key={index} className="group relative aspect-square">
            <div className="size-full overflow-hidden rounded-xl border border-border bg-background/5">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-6" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label={t.deleteAria}
              className="absolute -top-2 -end-2 flex size-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow transition-colors hover:text-rose-700 dark:text-rose-400"
            >
              <TrashIcon className="size-3" />
            </button>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold/40 text-gold transition-colors hover:bg-gold/5"
          >
            <PlusIcon className="size-5" />
            <span className="text-xs font-medium">{t.add}</span>
          </button>
        )}
      </div>
    </div>
  );
}
