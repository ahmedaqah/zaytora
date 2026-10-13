"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import type { TemplateDto } from "@/types/api";
import type { InvitationDetail } from "@/types/studio";
import { InvitationCanvas } from "./phone-preview/InvitationCanvas";

const COPY = { ar: "معاينة مباشرة", en: "Live preview" };

// The guest-facing page (PublicInvitationView) lays the invitation out in a column up to 393px wide. The
// bezel here is only ~240px wide, so rendering the canvas at that width wrapped lines and spaced things
// differently from the real result. Instead the canvas is laid out at the real width (393 x 786, the same
// 9:18 shape as before) and the whole device is scaled down to fit the bezel, so what you see here is the
// final layout, just smaller.
const DEVICE_WIDTH = 393;
const DEVICE_HEIGHT = DEVICE_WIDTH * 2;
const INITIAL_SCALE = 0.6;

export function PhonePreview({
  value,
  isTemplateStep = false,
  templateOverride,
  sticky = true,
}: {
  value: InvitationDetail;
  // True while StudioWizard's active step is template selection — passed
  // straight through to InvitationCanvas's templatePreviewMode so the
  // picker shows the template's raw visual identity instead of the
  // not-yet-real placeholder content.
  isTemplateStep?: boolean;
  // Passed straight through to InvitationCanvas — see its own doc comment.
  // Used by the admin's TemplateEditModal to preview an in-progress,
  // not-yet-saved template edit.
  templateOverride?: TemplateDto | null;
  // `sticky top-24` assumes the page itself scrolls, which is right for
  // StudioWizard's own layout but wrong inside a modal's own short-lived
  // scroll container (TemplateEditModal) — false there so this just sits in
  // normal flow instead of sticking to an arbitrary offset.
  sticky?: boolean;
}) {
  const { language } = useLanguage();
  const holderRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(INITIAL_SCALE);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const update = () => {
      const width = holder.clientWidth;
      if (width > 0) setScale(width / DEVICE_WIDTH);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(holder);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("flex flex-col items-center gap-3", sticky && "sticky top-24")}>
      <div className="relative w-64">
        <div className="absolute inset-0 scale-110 rounded-[3rem] bg-gold/20 blur-3xl" />
        <div className="relative rounded-[2.5rem] border border-border bg-gradient-to-b from-gray-400 to-gray-500 p-2 shadow-2xl">
          <div className="absolute left-1/2 top-2 z-20 h-3.5 w-24 -translate-x-1/2 rounded-full bg-black" />
          <div ref={holderRef} className="relative aspect-[9/18] w-full overflow-hidden rounded-[2.1rem]">
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{ width: DEVICE_WIDTH, height: DEVICE_HEIGHT, transform: `scale(${scale})` }}
            >
              <InvitationCanvas
                value={value}
                className="h-full w-full"
                templatePreviewMode={isTemplateStep}
                templateOverride={templateOverride}
              />
            </div>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarIcon className="size-3" />
        {COPY[language]}
      </p>
    </div>
  );
}
