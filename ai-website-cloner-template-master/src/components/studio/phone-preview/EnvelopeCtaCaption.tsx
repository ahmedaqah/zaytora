"use client";

import { cn } from "@/lib/utils";
import { STANDALONE_FULLSCREEN_CLASS } from "./standaloneCoverPosition";

// A per-template, admin-authored hint label shown on top of whichever
// envelope cover is currently mounted (see InvitationCanvas.tsx) — e.g.
// "اضغط على الختم" / "Tap the seal". Previously this text was either
// hardcoded (EnvelopeMediaCover's own pill, image covers only) or entirely
// absent (every other cover style: WaxSeal, CrimsonWaxSeal, PhotoWaxSeal,
// DoorFold/DoorSlide, ScrollUnroll). Template.EnvelopeCtaShape being unset
// keeps both those behaviors exactly as before; setting it renders this
// shared caption instead, uniformly, regardless of which cover is active.
//
// Rendered as an independent sibling positioned near the bottom of the
// screen rather than plumbed through each cover's own seal position — every
// cover's own tap target already spans either the full screen or a small
// centered button well above this caption's position, so there's no visual
// collision to reconcile per cover style. pointer-events-none so it never
// steals the tap from whatever cover element sits underneath it.
type EnvelopeCtaTemplate = {
  envelopeCtaShape?: string | null;
  envelopeCtaTextAr?: string | null;
  envelopeCtaTextEn?: string | null;
  envelopeCtaBgColor?: string | null;
  envelopeCtaTextColor?: string | null;
};

export function resolveEnvelopeCtaText(template: EnvelopeCtaTemplate | null | undefined, language: "ar" | "en"): string | null {
  if (!template?.envelopeCtaShape || template.envelopeCtaShape === "none") return null;
  const text = language === "ar" ? template.envelopeCtaTextAr : template.envelopeCtaTextEn;
  return text?.trim() || null;
}

export function EnvelopeCtaCaption({
  template,
  language,
  namesFont,
  standalone,
}: {
  template: EnvelopeCtaTemplate | null | undefined;
  language: "ar" | "en";
  namesFont?: string | null;
  standalone: boolean;
}) {
  const shape = template?.envelopeCtaShape;
  const text = resolveEnvelopeCtaText(template, language);
  if (!shape || shape === "none" || !text) return null;

  const textColor = template?.envelopeCtaTextColor?.trim() || "#ffffff";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none z-[1001] flex justify-center",
        standalone ? STANDALONE_FULLSCREEN_CLASS : "absolute inset-0"
      )}
      style={{ alignItems: "flex-end", paddingBottom: "12%" }}
    >
      <span
        className={cn(
          "text-[11px] font-medium tracking-[0.2em] uppercase",
          shape === "badge"
            ? "rounded-full border border-white/30 px-4 py-1.5 backdrop-blur-sm"
            : "px-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]",
          namesFont || "font-cinzel"
        )}
        style={{
          backgroundColor: shape === "badge" ? template?.envelopeCtaBgColor?.trim() || "rgba(0,0,0,0.25)" : undefined,
          color: textColor,
        }}
      >
        {text}
      </span>
    </div>
  );
}
