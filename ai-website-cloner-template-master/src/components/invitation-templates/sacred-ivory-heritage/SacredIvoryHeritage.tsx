"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { OpeningSequence } from "./sections/OpeningSequence";
import { InvitationCard } from "./sections/InvitationCard";
import { defaultTheme } from "./sacred-ivory-heritage.theme";
import { SIH_FONTS_STYLESHEET_URL, sihFontVariables } from "./sacred-ivory-heritage.fonts";
import type { SacredIvoryHeritageProps } from "./sacred-ivory-heritage.types";

const DEFAULT_TAGLINE = "We are getting married";
const DEFAULT_QUOTE = "You are invited for our special day";
const DEFAULT_SKIP_LABEL = "تخطي";

export function SacredIvoryHeritage({
  groomName,
  brideName,
  startDate,
  endDate,
  dateLocale = "en-US",
  tagline = DEFAULT_TAGLINE,
  openingQuote = DEFAULT_QUOTE,
  openingVideoSrc,
  backgroundVideoSrc,
  backgroundPosterSrc,
  skipOpening = false,
  theme: themeOverride,
  onOpeningComplete,
}: SacredIvoryHeritageProps) {
  const [phase, setPhase] = useState<"opening" | "revealed">(
    skipOpening || !openingVideoSrc ? "revealed" : "opening",
  );

  const theme = useMemo(
    () => ({
      colors: { ...defaultTheme.colors, ...themeOverride?.colors },
      fonts: { ...defaultTheme.fonts, ...themeOverride?.fonts },
    }),
    [themeOverride],
  );

  const dateLabel = useMemo(() => {
    const format = (iso: string) =>
      new Date(iso).toLocaleDateString(dateLocale, { month: "long", day: "numeric", year: "numeric" });
    return endDate ? `${format(startDate)} - ${format(endDate)}` : format(startDate);
  }, [startDate, endDate, dateLocale]);

  function handleOpeningComplete() {
    setPhase("revealed");
    onOpeningComplete?.();
  }

  return (
    <div
      className={cn("relative aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl")}
      style={sihFontVariables}
    >
      {/* React 19 hoists this into <head> and de-duplicates it; see sacred-ivory-heritage.fonts.ts. */}
      <link rel="stylesheet" href={SIH_FONTS_STYLESHEET_URL} precedence="sih-fonts" />
      {phase === "opening" && openingVideoSrc ? (
        <OpeningSequence
          videoSrc={openingVideoSrc}
          posterSrc={backgroundPosterSrc}
          quote={openingQuote}
          quoteFontFamily={theme.fonts.quote}
          accentColor={theme.colors.primary}
          skipLabel={DEFAULT_SKIP_LABEL}
          onComplete={handleOpeningComplete}
        />
      ) : (
        <InvitationCard
          groomName={groomName}
          brideName={brideName}
          tagline={tagline}
          dateLabel={dateLabel}
          theme={theme}
          backgroundVideoSrc={backgroundVideoSrc}
          backgroundPosterSrc={backgroundPosterSrc}
        />
      )}
    </div>
  );
}
