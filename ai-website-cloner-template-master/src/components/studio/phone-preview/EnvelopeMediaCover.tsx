"use client";

import { useEffect, useRef, useState } from "react";
import { cn, isVideoSource } from "@/lib/utils";
import { toLatinInitial } from "@/lib/arabicToLatinInitial";
import { STANDALONE_FULLSCREEN_CLASS } from "./standaloneCoverPosition";

const FADE_DURATION_MS = 500;
// Safety net for a tap whose play() call resolves (so the earlier catch
// never fires) but then stalls mid-buffer on a bad connection and never
// reaches "ended" -- without this a guest in that exact spot is stuck
// forever with no tap target left (the OPEN button already unmounted).
// Comfortably longer than every opening clip actually in use today, so it
// never cuts a normal playthrough short.
const STUCK_VIDEO_FALLBACK_MS = 8000;

const OPEN_HINT_BY_LANGUAGE: Record<"ar" | "en", string> = {
  ar: "اضغط لفتح الدعوة",
  en: "Tap to open",
};

// The envelope's opening media (see Template.OpeningVideoUrl -- despite the
// field's name, an admin can upload either a video or a plain image there
// now, one single "envelope" slot instead of separate video/library-photo
// paths). Closed state is that media's own first frame/photo, full-bleed,
// no separate blurred-badge screen on top of it. Tapping anywhere opens it:
// a video plays through once; an image just fades away immediately,
// exposing the content underneath, same instant reveal every photo-based
// cover in this folder does. Same two rules every cover here follows (see
// EnvelopeCover.tsx's comment): onOpen() fires synchronously inside the tap
// handler (browser autoplay-audio policy), and the fade-out/unmount on
// finish is plain CSS + setTimeout, not framer-motion's AnimatePresence
// (unreliable under this app's React 19 + Turbopack setup). onRevealed is
// the one thing NOT shared with every other cover here: it fires at finish
// (video ended, not tap), since only this cover's own "opening" can run
// several seconds long.
export function EnvelopeMediaCover({
  mediaSrc,
  namesFont,
  language,
  onOpen,
  onRevealed,
  standalone,
  firstName,
  secondName,
  initialsXPercent,
  initialsYPercent,
}: {
  mediaSrc: string;
  namesFont?: string | null;
  language: "ar" | "en";
  onOpen: () => void;
  // Fires once the cover has actually finished showing its media (the video
  // played through, or the fallback/skip/error path kicked in) and starts
  // fading away -- distinct from onOpen, which fires immediately on tap,
  // before a multi-second opening video has even started playing. The rest
  // of the canvas (ambient background video, the slow auto-scroll "ride")
  // waits for this instead of the tap: starting them at tap time meant they
  // silently ran for the video's entire length behind the still-opaque
  // cover, so by the time it finally faded away the guest found the page
  // already scrolled several sections down instead of at the top.
  onRevealed?: () => void;
  standalone: boolean;
  // See Template.EnvelopeInitialsXPercent/YPercent -- when both are set, a
  // frosted patch bearing the couple's real initials is drawn on top of the
  // media at that position, for a video/photo whose seal area is blank (or
  // has placeholder letters this patch is meant to cover) rather than one
  // baked with a specific couple's names. Either missing renders no patch.
  firstName?: string | null;
  secondName?: string | null;
  initialsXPercent?: number | null;
  initialsYPercent?: number | null;
}) {
  const mediaIsVideo = isVideoSource(mediaSrc);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  // Mirrors `started` but reads synchronously inside onPlay below -- a tap
  // can land while the mount-time muted play() is still an in-flight
  // promise, and that promise's own "playing" event can fire *after* the
  // tap already flipped `started` to true. The onPlay closure over `started`
  // state would still see the stale `false` from the render it was created
  // in and re-pause the video the tap just started -- freezing it right at
  // the moment it should have opened. A ref has no such staleness: it's set
  // synchronously in handleTap, so onPlay always reads what's true right now.
  const startedRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const initials = [toLatinInitial(firstName), toLatinInitial(secondName)].filter(Boolean).join(" & ");
  const showInitialsPatch = Boolean(initials) && initialsXPercent != null && initialsYPercent != null;

  // Same fix AmbientVideoBackground already needed for the same reason:
  // React commits `muted`/`autoPlay` as DOM properties, not HTML attributes,
  // which can leave a browser evaluating this video's autoplay eligibility
  // before the property has actually landed -- silently leaving it paused
  // forever with no error, no matter how the JSX attributes are written.
  // Setting `.muted` and calling `.play()` imperatively here, after mount,
  // sidesteps that timing gap. onPlay (below) re-pauses it the instant real
  // playback starts, so this never does more than paint one still frame.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaIsVideo) return;
    video.muted = true;
    video.play().catch(() => {});
    // mediaSrc is effectively static for a given cover instance -- omitting
    // mediaIsVideo (derived from it) from the deps avoids an ESLint nag for
    // a value that never independently changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaSrc]);

  function handleFinish() {
    if (closing) return;
    setClosing(true);
    onRevealed?.();
    window.setTimeout(() => setHidden(true), FADE_DURATION_MS);
  }

  function handleTap() {
    if (started) return;
    onOpen();
    if (!mediaIsVideo) {
      handleFinish();
      return;
    }
    setStarted(true);
    startedRef.current = true;
    const video = videoRef.current;
    // Resume still muted first -- muted playback is never gesture-gated, so
    // this is the one call guaranteed not to be silently refused, unlike a
    // *fresh* unmuted play() -- and unmuting an already-playing video
    // afterward isn't held to that same strict rule. Deliberately NOT
    // resetting currentTime here first: a real-device recording showed the
    // video freezing solid for the full stall-fallback window with zero
    // progress, consistent with a WebKit play() promise that never settles
    // at all (not slow -- stuck) when a seek and a play() land back to
    // back. It's already sitting at ~0 from the mount-time freeze below, so
    // skipping the seek removes that overlap for free.
    video
      ?.play()
      .then(() => {
        if (video) video.muted = false;
      })
      // A slow connection can leave the video without enough buffered data
      // to play yet -- rejecting the play() promise. Without this fallback
      // the tap button is already gone (started=true) but nothing ever
      // advances, stranding the guest on a frozen frame with no way back
      // in. Revealing the invitation underneath is the same outcome a
      // finished video ends in anyway, so it's a safe default rather than a
      // real fallback path.
      .catch(() => handleFinish());
    // Recovery kick for the "stuck, not slow" case above: if play() hasn't
    // taken effect within a normal human tap-to-reaction window, retry it
    // once rather than just waiting out the full multi-second stall
    // fallback for something a simple retry can fix. No video.load() here
    // (that was the previous version) -- load() resets the element back to
    // its very first frame, which is a real, visible flash/reset on
    // real-device recordings, not just a silent internal retry. Now that
    // the videos this actually needs to rescue are under 1MB instead of
    // several MB, a bare retry is enough; the reset was solving a buffering
    // problem that's already gone at the source.
    window.setTimeout(() => {
      if (video && video.paused) {
        video.muted = false;
        video.play().catch(() => {});
      }
    }, 700);
    // Covers the other failure shape: play() itself resolves (playback
    // genuinely starts) but then stalls on bad data mid-clip and never
    // fires "ended" -- the catch above never runs for that case. This
    // timer guarantees the guest reaches the invitation either way.
    // handleFinish() is idempotent (guarded by `closing`), so it's harmless
    // if the video already finished normally before this fires.
    window.setTimeout(handleFinish, STUCK_VIDEO_FALLBACK_MS);
  }

  if (hidden) return null;

  return (
    <div
      className={cn(
        // A `<video>` with no `poster` renders fully transparent until its
        // first frame decodes -- on a slow connection that gap is long
        // enough for AmbientVideoBackground (playing underneath, autoplay
        // muted so browsers fetch it eagerly) to show through where this
        // cover should be solid. Filling it with the template's own page
        // background (the same color the canvas already uses everywhere
        // else, set as --tpl-page-bg-solid higher up the tree) keeps the
        // cover opaque without an off-brand black flash -- a plain gray
        // fallback covers the rare case this renders somewhere that
        // variable isn't defined.
        "z-[1000] overflow-hidden transition-opacity ease-in-out",
        closing ? "pointer-events-none opacity-0" : "opacity-100",
        standalone ? STANDALONE_FULLSCREEN_CLASS : "absolute inset-0"
      )}
      style={{
        transitionDuration: `${FADE_DURATION_MS}ms`,
        backgroundColor: "var(--tpl-page-bg-solid, #1a1a1a)",
      }}
    >
      {mediaIsVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={mediaSrc}
          playsInline
          preload="auto"
          // muted+autoPlay isn't there to actually play the closed-envelope
          // state -- it's the one reliable way to get this video's first
          // frame to paint at all. `preload="auto"` is only ever a hint;
          // on a real device (cellular, Low Power Mode) a browser can
          // ignore it and never fetch a byte until something forces
          // playback, leaving the cover permanently blank. Muted autoplay
          // is exempt from that everywhere, so it kicks the fetch off for
          // real -- onPlay immediately re-pauses it (before handleTap has
          // run) so the guest only ever sees a still first frame, not
          // silent playback. handleTap unmutes and restarts it for the
          // real, audible playthrough.
          muted
          autoPlay
          onPlay={(event) => {
            if (!startedRef.current) event.currentTarget.pause();
          }}
          onEnded={handleFinish}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}

      {showInitialsPatch && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-20 flex items-center justify-center"
          style={{
            top: `${initialsYPercent}%`,
            left: `${initialsXPercent}%`,
            width: "34%",
            aspectRatio: "1 / 1",
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* A real wax-seal blob (matching the ivory seal baked into most
              envelope media) instead of a plain frosted circle -- so the
              patch reads as part of the envelope's own artwork rather than
              a UI overlay pasted on top of it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/wax-seal-blank.png"
            alt=""
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.18)]"
          />
          <span
            className={cn("relative", namesFont || "font-herr-von-muellerhoff")}
            style={{
              fontSize: "clamp(18px, 6.5vw, 28px)",
              backgroundImage: "linear-gradient(135deg, #a3792f 0%, #f6e2b0 30%, #caa456 55%, #f6e2b0 78%, #a3792f 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.5))",
            }}
          >
            {initials}
          </span>
        </div>
      )}

      {!started && (
        <button
          type="button"
          onClick={handleTap}
          aria-label={language === "ar" ? "فتح" : "Open"}
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-3",
            !mediaIsVideo && "bg-black/10 transition-colors active:bg-black/20"
          )}
        >
          {mediaIsVideo ? null : (
            <span
              className={cn(
                "rounded-full border border-white/40 bg-black/25 px-4 py-1.5 text-[11px] font-medium tracking-[0.2em] text-white uppercase backdrop-blur-sm",
                namesFont || "font-cinzel"
              )}
            >
              {OPEN_HINT_BY_LANGUAGE[language]}
            </span>
          )}
        </button>
      )}

      {mediaIsVideo && started && (
        <button
          type="button"
          onClick={handleFinish}
          className="absolute inset-x-0 bottom-6 mx-auto w-max text-[11px] tracking-[0.3em] text-white/70 uppercase underline underline-offset-4 transition-colors hover:text-white"
        >
          {language === "ar" ? "تخطي" : "Skip"}
        </button>
      )}
    </div>
  );
}
