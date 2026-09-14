"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toLatinInitial } from "@/lib/arabicToLatinInitial";
import { FloralSprig } from "./decorative";
import { STANDALONE_FULLSCREEN_CLASS } from "./standaloneCoverPosition";

// Pacing tuned to the reference video's own felt timing: the crease splits
// apart with real depth (~900ms), the gap holds at full brightness for a
// beat (~500ms) rather than snapping straight to the crossfade, then the
// whole cover dissolves into the hero (~650ms) — a slower, more deliberate
// sequence than a single quick fade.
const SPLIT_DURATION_MS = 900;
const HOLD_DURATION_MS = 500;
const FADE_DURATION_MS = 650;
const CLOSING_AT_MS = SPLIT_DURATION_MS + HOLD_DURATION_MS;
const HIDDEN_AT_MS = CLOSING_AT_MS + FADE_DURATION_MS;

// Embossed/engraved look for the floral line art — a bright highlight
// offset one way plus a soft dark shadow offset the other, the same duo the
// paper itself actually needs to read as *raised* rather than flat printed
// line art. Two stacked drop-shadows on an SVG do this cheaply, no raster
// asset required.
const EMBOSS_FILTER =
  "drop-shadow(-0.5px -0.5px 0.3px rgba(255,255,255,0.75)) drop-shadow(0.6px 0.6px 0.5px rgba(120,95,45,0.35))";

function ScallopedSeal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const lobes = 14;
  const outerR = 48;
  const innerR = 44;
  const cx = 50;
  const cy = 50;
  let d = "";
  for (let i = 0; i < lobes; i++) {
    const angle = (i / lobes) * Math.PI * 2;
    const nextAngle = ((i + 1) / lobes) * Math.PI * 2;
    const midAngle = (angle + nextAngle) / 2;
    const x1 = cx + Math.cos(angle) * innerR;
    const y1 = cy + Math.sin(angle) * innerR;
    const xMid = cx + Math.cos(midAngle) * outerR;
    const yMid = cy + Math.sin(midAngle) * outerR;
    const x2 = cx + Math.cos(nextAngle) * innerR;
    const y2 = cy + Math.sin(nextAngle) * innerR;
    d += i === 0 ? `M ${x1} ${y1} ` : "";
    d += `Q ${xMid} ${yMid} ${x2} ${y2} `;
  }
  d += "Z";
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <path d={d} fill="url(#waxSealGradient)" stroke="rgba(184,146,63,0.4)" strokeWidth="0.6" />
      <path
        d={d}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.8"
        transform="scale(0.94)"
        style={{ transformOrigin: "50px 50px" }}
      />
      <defs>
        <radialGradient id="waxSealGradient" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fffdf8" />
          <stop offset="55%" stopColor="#f8f0de" />
          <stop offset="100%" stopColor="#e6d7ae" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// One "half" of the envelope back — the embossed paper texture plus its two
// floral flap decorations, split into its own layer so it can be given real
// depth (rotateX + translateY under a shared perspective) rather than
// staying visually flat while only a clip-shaped light patch changes.
function EnvelopePanel({
  edge,
  open,
}: {
  edge: "top" | "bottom";
  open: boolean;
}) {
  const isTop = edge === "top";
  return (
    <motion.div
      className="absolute inset-x-0 h-1/2 overflow-hidden"
      style={{
        [isTop ? "top" : "bottom"]: 0,
        transformOrigin: isTop ? "bottom center" : "top center",
        transformStyle: "preserve-3d",
        background: isTop
          ? "linear-gradient(200deg, #f8f1e0 0%, #efe6cd 100%)"
          : "linear-gradient(20deg, #f2e9d2 0%, #e7dcc0 100%)",
      }}
      animate={
        open
          ? { rotateX: isTop ? -22 : 22, y: isTop ? "-14%" : "14%" }
          : { rotateX: 0, y: "0%" }
      }
      transition={{ duration: SPLIT_DURATION_MS / 1000, ease: [0.65, 0, 0.35, 1] }}
    >
      <svg
        className="absolute inset-x-0 h-full w-full"
        style={{ [isTop ? "bottom" : "top"]: 0 }}
        viewBox={`0 0 100 89`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={isTop ? "M0 0 L50 89 L100 0" : "M0 89 L50 0 L100 89"}
          fill="none"
          stroke="rgba(120,100,60,0.2)"
          strokeWidth="0.35"
        />
      </svg>
      {/* Center flap cluster — two overlapping sprigs at slightly different
          sizes/angles rather than one icon, so it reads as a fuller bouquet
          the way the reference's corner engravings do. */}
      <FloralSprig
        className={cn("absolute left-1/2 size-20 -translate-x-1/2 text-[#c9b98a]", isTop ? "top-[6%]" : "bottom-[6%] rotate-180")}
        style={{ filter: EMBOSS_FILTER }}
      />
      <FloralSprig
        className={cn(
          "absolute left-1/2 size-12 -translate-x-[65%] rotate-[-18deg] text-[#c9b98a]",
          isTop ? "top-[14%]" : "bottom-[14%] rotate-[162deg]"
        )}
        style={{ filter: EMBOSS_FILTER }}
      />
      <FloralSprig
        className={cn(
          "absolute left-1/2 size-12 translate-x-[15%] rotate-[18deg] text-[#c9b98a]",
          isTop ? "top-[16%]" : "bottom-[16%] rotate-[198deg]"
        )}
        style={{ filter: EMBOSS_FILTER }}
      />
      {/* Side flap sprigs — one tall vertical spray per side. */}
      <FloralSprig
        className={cn(
          "absolute size-16 -translate-y-1/2 text-[#c9b98a]",
          isTop ? "left-[6%] top-[62%] rotate-[-90deg]" : "right-[6%] top-[38%] rotate-90"
        )}
        style={{ filter: EMBOSS_FILTER }}
      />
      <FloralSprig
        className={cn(
          "absolute size-10 -translate-y-1/2 text-[#c9b98a]",
          isTop ? "left-[18%] top-[78%] rotate-[-90deg]" : "right-[18%] top-[22%] rotate-90"
        )}
        style={{ filter: EMBOSS_FILTER }}
      />
    </motion.div>
  );
}

// A handful of small twinkling sparkles drifting near the seal — reads as
// light catching grains of the embossed paper, matching the reference's
// idle shimmer more than a single pulsing glow does.
const SPARKLES = [
  { x: -34, y: -46, delay: 0 },
  { x: 30, y: -30, delay: 0.6 },
  { x: -20, y: 40, delay: 1.1 },
  { x: 38, y: 34, delay: 1.7 },
  { x: 4, y: -58, delay: 2.2 },
];

// The "waxseal" EnvelopeStyle: an embossed cream-paper envelope back split
// into two independently-tiltable halves under a shared CSS `perspective`,
// centered on a scalloped wax-seal disc bearing the couple's initials — the
// same genuine 3D-transform technique already proven in this codebase's
// InteractiveEnvelopeTemplate prototype (rotateX on a preserve-3d layer),
// adapted here to a crease that splits open along its own X-fold rather
// than a single top flap. An idle shimmer + drifting sparkles play while
// closed; tapping the seal splits the two halves apart with real depth,
// holds the resulting light gap at full brightness for a beat, then
// crossfades the whole cover away to reveal the hero underneath — cloned
// from a reference video of exactly this sequence. Crossfade/unmount is
// still plain CSS transition + setTimeout (not AnimatePresence — see
// EnvelopeCover.tsx's own comment on why: React 19 + Turbopack doesn't
// reliably fire exit-animation completion callbacks here).
export function WaxSealEnvelopeCover({
  firstName,
  secondName,
  namesFont,
  onOpen,
  standalone,
}: {
  firstName: string;
  secondName?: string | null;
  namesFont?: string | null;
  onOpen: () => void;
  standalone: boolean;
}) {
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [hidden, setHidden] = useState(false);

  function handleOpenClick() {
    if (opening) return;
    onOpen();
    setOpening(true);
    window.setTimeout(() => setClosing(true), CLOSING_AT_MS);
    window.setTimeout(() => setHidden(true), HIDDEN_AT_MS);
  }

  if (hidden) return null;

  const initials = [toLatinInitial(firstName), toLatinInitial(secondName)].filter(Boolean).join(" & ");

  return (
    <div
      className={cn(
        "z-[1000] flex items-center justify-center overflow-hidden transition-opacity ease-in-out",
        closing ? "pointer-events-none opacity-0" : "opacity-100",
        standalone ? STANDALONE_FULLSCREEN_CLASS : "absolute inset-0"
      )}
      style={{ transitionDuration: `${FADE_DURATION_MS}ms`, background: "#e7dcc0" }}
    >
      {/* The cream backdrop above fills the full viewport edge-to-edge (a
          `fixed`/`absolute` cover, same as the classic EnvelopeCover) — but
          every decorative element below is positioned as a fraction of
          *this* inner column, capped at the same max-w-[393px] the guest-
          facing page (PublicInvitationView) already centers its whole
          invitation column at. Without this, the crease lines and floral
          sprigs below (all positioned as percentages of their parent)
          stretch/scatter across the full desktop browser width instead of
          staying in a phone-proportioned composition. */}
      <div className="relative mx-auto h-full w-full max-w-[393px]" style={{ perspective: 1400 }}>
        <EnvelopePanel edge="top" open={opening} />
        <EnvelopePanel edge="bottom" open={opening} />

        {/* Idle sparkle motes drifting/twinkling near the seal. */}
        {!opening &&
          SPARKLES.map((sparkle, index) => (
            <motion.span
              key={index}
              aria-hidden
              className="absolute left-1/2 top-1/2 size-1 rounded-full bg-[#f3d98a]"
              style={{ x: sparkle.x, y: sparkle.y }}
              animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: sparkle.delay, ease: "easeInOut" }}
            />
          ))}

        {/* Idle shimmer — a soft golden glow that slowly breathes behind the
            seal, reading as light catching the embossed paper. */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(232,190,110,0.5), transparent 70%)" }}
          animate={opening ? { opacity: 0 } : { opacity: [0.2, 0.55, 0.2], scale: [0.9, 1.05, 0.9] }}
          transition={opening ? { duration: 0.3 } : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Volumetric light-beam — three stacked, differently-timed glow
            layers rather than one flat shape, so the gap reads as light
            spilling from behind the paper instead of a 2D clipped patch. */}
        {opening && (
          <>
            <motion.div
              aria-hidden
              className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
              style={{ background: "radial-gradient(circle, rgba(255,246,220,0.95), transparent 70%)" }}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 1, 1, 0.85], scale: [0.3, 1.1, 1.25, 1.1] }}
              transition={{ duration: (SPLIT_DURATION_MS + HOLD_DURATION_MS) / 1000, ease: "easeOut", times: [0, 0.55, 0.75, 1] }}
            />
            <motion.div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-72 w-28 -translate-x-1/2 -translate-y-1/2 blur-lg"
              style={{
                background: "radial-gradient(closest-side, rgba(255,224,150,0.75), transparent 75%)",
              }}
              initial={{ opacity: 0, scaleY: 0.2 }}
              animate={{ opacity: [0, 0.9, 0.9], scaleY: [0.2, 1, 1.15] }}
              transition={{ duration: (SPLIT_DURATION_MS + HOLD_DURATION_MS) / 1000, ease: "easeOut", times: [0, 0.6, 1] }}
            />
          </>
        )}

        <motion.button
          type="button"
          onClick={handleOpenClick}
          aria-label="OPEN"
          className="absolute left-1/2 top-1/2 flex size-28 items-center justify-center"
          style={{ x: "-50%", y: "-50%" }}
          animate={opening ? { scale: 1.12, opacity: 0 } : { scale: 1, opacity: 1 }}
          transition={{ duration: SPLIT_DURATION_MS / 1000, ease: "easeOut" }}
          whileTap={{ scale: 0.95 }}
        >
          <ScallopedSeal
            className="absolute inset-0 h-full w-full"
            style={{ filter: "drop-shadow(0 6px 18px rgba(120,95,45,0.32)) drop-shadow(0 1px 1px rgba(255,255,255,0.6))" }}
          />
          <span className={cn("relative text-lg tracking-wide text-[#8a6d2f]", namesFont || "font-cinzel")}>
            {initials || "&"}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
