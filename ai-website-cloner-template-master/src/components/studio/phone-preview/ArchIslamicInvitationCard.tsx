"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { cuspedArchPath, cuspedArchOutline, FloralSprig } from "./decorative";

const CAP_WIDTH = 300;
const CAP_HEIGHT = 58;

// The "archIslamic" InvitationCardStyle — replaces InvitationCanvas's plain
// glass invitation card with a pointed cusped-arch card: an Arabic Bismillah
// calligraphy line, the couple's names in their own script with a "family
// of" line under each, then the free-form invitation copy, closed out with
// floral corner sprigs — cloned from the reference video's formal
// invitation-text card. The arch "cap" is a separate SVG shape filled with
// the card's own --tpl-card-bg sitting flush on the card's top edge, rather
// than clip-path on the whole card, so the card can still grow to fit
// whatever length of invitationText the guest writes.
export function ArchIslamicInvitationCard({
  firstName,
  secondName,
  namesFont,
  familyName1,
  familyName2,
  invitationText,
  invitationTextFontSize,
  isRtl,
  accent,
}: {
  firstName: string;
  secondName?: string | null;
  namesFont?: string;
  familyName1?: string | null;
  familyName2?: string | null;
  invitationText?: string | null;
  invitationTextFontSize?: number | null;
  isRtl: boolean;
  accent: string;
}) {
  const capD = cuspedArchPath({ width: CAP_WIDTH, height: CAP_HEIGHT, springlineRatio: 1, lobes: 5, bulge: 0.14 });
  const capOutlineD = cuspedArchOutline({
    width: CAP_WIDTH,
    height: CAP_HEIGHT,
    springlineRatio: 1,
    lobes: 5,
    bulge: 0.14,
  });

  const familyLabel = isRtl ? "من" : "FAMILY OF";
  const inviteLabel = isRtl ? "بكل سرور ندعوكم لحضور" : "YOU ARE INVITED TO THE CEREMONY OF";
  const withWord = isRtl ? "و" : "With";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative mx-4 mt-14"
    >
      <svg
        className="absolute inset-x-0 -top-[54px] h-14 w-full overflow-visible"
        viewBox={`0 0 ${CAP_WIDTH} ${CAP_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d={capD} fill="var(--tpl-card-bg)" />
        <path d={capOutlineD} fill="none" stroke={accent} strokeWidth="2" opacity="0.85" />
      </svg>

      <div
        className="relative flex flex-col items-center gap-4 rounded-b-[28px] border-x-2 border-b-2 px-6 pb-8 pt-6 text-center backdrop-blur-lg"
        style={{
          borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
          background: "var(--tpl-card-bg)",
        }}
      >
        <p dir="rtl" className="font-cinzel text-base" style={{ color: accent }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>

        <p className={cn("text-[11px] tracking-[0.15em]", TONE_MUTED)}>{inviteLabel}</p>

        <div className="flex flex-col items-center gap-1">
          <p className={cn("text-3xl", namesFont || "italic font-serif")} style={{ color: accent }}>
            {firstName}
          </p>
          {familyName1 && (
            <p className={cn("text-[10px] tracking-[0.2em]", TONE_MUTED)}>
              {familyLabel} {familyName1}
            </p>
          )}
        </div>

        {secondName && (
          <>
            <p className={cn("font-cinzel text-sm italic", TONE_MUTED)}>{withWord}</p>
            <div className="flex flex-col items-center gap-1">
              <p className={cn("text-3xl", namesFont || "italic font-serif")} style={{ color: accent }}>
                {secondName}
              </p>
              {familyName2 && (
                <p className={cn("text-[10px] tracking-[0.2em]", TONE_MUTED)}>
                  {familyLabel} {familyName2}
                </p>
              )}
            </div>
          </>
        )}

        {invitationText && (
          <p
            className="mt-2 max-w-xs text-sm italic leading-relaxed text-[var(--tpl-text-strong)]"
            style={{
              whiteSpace: "pre-line",
              ...(invitationTextFontSize && invitationTextFontSize !== 100
                ? { fontSize: `${(0.875 * invitationTextFontSize) / 100}rem` }
                : undefined),
            }}
          >
            {invitationText}
          </p>
        )}

        <div className="mt-2 flex w-full items-end justify-between opacity-70">
          <FloralSprig className="size-10 -rotate-45" style={{ color: accent }} />
          <FloralSprig className="size-10 rotate-45 -scale-x-100" style={{ color: accent }} />
        </div>
      </div>
    </motion.div>
  );
}

const TONE_MUTED = "text-[var(--tpl-text-muted)]";
