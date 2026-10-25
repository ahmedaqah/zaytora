"use client";

import { PauseIcon, PlayIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import type { MusicPlayerController } from "@/components/studio/phone-preview/useMusicPlayer";

const COPY = {
  ar: {
    title: "وقت بدء الموسيقى",
    hint: "اسحب المؤشر لاختيار اللحظة التي تبدأ منها الموسيقى، ثم اضغط «استمع من هنا» للمعاينة.",
    loading: "جارٍ تحميل المقطع…",
    tapToLoad: "اضغط «استمع من هنا» لتحميل المقطع وتفعيل الشريط.",
    error: "تعذر تحميل المقطع، تأكد من الرابط أو الملف.",
    listen: "استمع من هنا",
    pause: "إيقاف",
    useCurrent: "اجعل الموضع الحالي بداية",
    fromStart: "من البداية",
    startsAt: "ستبدأ الموسيقى من",
    hours: "ساعة",
    minutes: "دقيقة",
    seconds: "ثانية",
    fine: "ضبط دقيق",
    total: "المدة",
  },
  en: {
    title: "Music start time",
    hint: "Drag the handle to pick where the music begins, then press “Listen from here” to preview it.",
    loading: "Loading the track…",
    tapToLoad: "Press “Listen from here” to load the track and enable the slider.",
    error: "Couldn't load the track — check the link or file.",
    listen: "Listen from here",
    pause: "Pause",
    useCurrent: "Use current position as start",
    fromStart: "From the beginning",
    startsAt: "Music will start at",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
    fine: "Fine tune",
    total: "Length",
  },
};

export function formatClock(total: number) {
  const clamped = Math.max(0, Math.floor(total || 0));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function splitHms(total: number) {
  const clamped = Math.max(0, Math.floor(total || 0));
  return { h: Math.floor(clamped / 3600), m: Math.floor((clamped % 3600) / 60), s: clamped % 60 };
}

// Start-point picker for the invitation's music: a draggable handle over the
// track's timeline plus exact H/M/S inputs, driven by the same player the
// library preview uses (so a file and a YouTube link behave identically).
export function MusicStartPicker({
  player,
  startSeconds,
  onChange,
}: {
  player: MusicPlayerController;
  startSeconds: number;
  onChange: (seconds: number) => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];

  const duration = Math.floor(player.duration || 0);
  const ready = duration > 0;
  const start = ready ? Math.min(startSeconds, duration) : startSeconds;
  const { h, m, s } = splitHms(start);
  const startPct = ready ? (start / duration) * 100 : 0;
  const playheadPct = ready ? Math.min(100, (player.currentTime / duration) * 100) : 0;

  function setStart(seconds: number) {
    const max = ready ? duration : Number.MAX_SAFE_INTEGER;
    onChange(Math.min(max, Math.max(0, Math.floor(seconds))));
  }

  // Moves the playhead to the chosen start once the user lets go of the
  // handle (seeking on every drag tick would hammer the YouTube player).
  function commitSeek() {
    if (ready) player.seek(start);
  }

  function toggleListen() {
    if (player.isPlaying) {
      player.pause();
      return;
    }
    // Lazy YouTube player not built yet: play() builds it and starts from the
    // saved start offset once it is ready.
    if (!ready) {
      player.play();
      return;
    }
    player.seek(start);
    player.play();
  }

  function updateField(next: Partial<{ h: number; m: number; s: number }>) {
    const merged = { h, m, s, ...next };
    const total = Math.max(0, merged.h) * 3600 + Math.max(0, merged.m) * 60 + Math.max(0, merged.s);
    setStart(total);
  }

  const fieldClass =
    "w-full rounded-xl border border-border bg-background/5 px-3 py-2 text-center text-sm text-foreground outline-none focus:border-gold";

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div>
        <p className="text-sm text-body-foreground">{t.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t.hint}</p>
      </div>

      {player.loadError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">{t.error}</p>
      ) : (
        <div dir="ltr" className="space-y-1.5">
          <div className="relative h-8">
            {/* track + selected region + live playhead */}
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" />
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gold/30"
              style={{ left: `${startPct}%`, right: 0 }}
            />
            {ready && player.currentTime > 0 && (
              <div
                className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-foreground/60"
                style={{ left: `${playheadPct}%` }}
              />
            )}
            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              step={1}
              value={start}
              disabled={!ready}
              onChange={(event) => setStart(Number(event.target.value))}
              onPointerUp={commitSeek}
              onTouchEnd={commitSeek}
              onKeyUp={commitSeek}
              aria-label={t.title}
              className={cn(
                "absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent disabled:cursor-wait",
                "[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent",
                "[&::-moz-range-track]:h-full [&::-moz-range-track]:bg-transparent",
                "[&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#C8A24A] [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:mt-1.5",
                "[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#C8A24A]"
              )}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{ready ? formatClock(player.currentTime) : player.activated ? t.loading : t.tapToLoad}</span>
            <span className="font-medium text-gold">
              {t.startsAt} {formatClock(start)}
            </span>
            <span>{ready ? `${t.total} ${formatClock(duration)}` : ""}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleListen}
          disabled={!ready && player.activated}
          className="flex items-center gap-1.5 rounded-xl bg-[#C8A24A] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {player.isPlaying ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
          {player.isPlaying ? t.pause : t.listen}
        </button>
        <button
          type="button"
          onClick={() => setStart(player.currentTime)}
          disabled={!ready || player.currentTime <= 0}
          className="rounded-xl border border-border px-3 py-2 text-sm text-body-foreground transition-colors hover:border-gold/40 disabled:opacity-50"
        >
          {t.useCurrent}
        </button>
        <button
          type="button"
          onClick={() => {
            setStart(0);
            if (ready) player.seek(0);
          }}
          disabled={start === 0}
          className="rounded-xl border border-border px-3 py-2 text-sm text-body-foreground transition-colors hover:border-gold/40 disabled:opacity-50"
        >
          {t.fromStart}
        </button>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">{t.fine}</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <input type="number" min={0} value={h} onChange={(event) => updateField({ h: Number(event.target.value) })} className={fieldClass} />
            <p className="mt-1 text-center text-[11px] text-muted-foreground">{t.hours}</p>
          </div>
          <div>
            <input type="number" min={0} max={59} value={m} onChange={(event) => updateField({ m: Number(event.target.value) })} className={fieldClass} />
            <p className="mt-1 text-center text-[11px] text-muted-foreground">{t.minutes}</p>
          </div>
          <div>
            <input type="number" min={0} max={59} value={s} onChange={(event) => updateField({ s: Number(event.target.value) })} className={fieldClass} />
            <p className="mt-1 text-center text-[11px] text-muted-foreground">{t.seconds}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
