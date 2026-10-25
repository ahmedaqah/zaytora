"use client";

import { useEffect, useRef, useState } from "react";
import { TextField } from "@/components/studio/fields/TextField";
import { HintBox } from "@/components/studio/fields/HintBox";
import { CheckIcon, LinkIcon, MusicIcon, PauseIcon, PlayIcon, RefreshIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { PRESET_TRACKS, trackLabel, type PresetTrack } from "@/lib/musicLibrary";
import { listActiveMusicSuggestions } from "@/lib/services/musicSuggestions.service";
import { useMusicPlayer } from "@/components/studio/phone-preview/useMusicPlayer";
import { MusicStartPicker } from "./MusicStartPicker";
import { useLanguage } from "@/context/LanguageContext";
import type { InvitationDetail } from "@/types/studio";

const COPY = {
  ar: {
    hint: "اختر مقطوعة من المكتبة أو ارفع ملفك الخاص — تعزف الموسيقى عند فتح الدعوة.",
    library: "مكتبة الموسيقى",
    localFile: "ملف محلي",
    replaceAria: "استبدال بملف محلي",
    replaceTitle: "استبدال بملف محلي (اختبار)",
    pause: "إيقاف مؤقت",
    play: "تشغيل",
    trackTitle: "اسم المقطوعة / الفنان",
    trackTitlePlaceholder: "مثال: Can't Help Falling in Love",
    uploadFile: "رفع ملف",
    youtubeLink: "يوتيوب / رابط",
    startTime: "وقت بدء الموسيقى",
    hours: "ساعات (H)",
    minutes: "دقائق (M)",
    seconds: "ثواني (S)",
    startHint: (s: number) => `ستبدأ الموسيقى من هذه النقطة (${s}s)`,
    removeMusic: "إزالة الموسيقى",
    viaYoutube: "التشغيل عبر يوتيوب",
  },
  en: {
    hint: "Choose a track from the library or upload your own — the music plays when the invitation opens.",
    library: "Music library",
    localFile: "local file",
    replaceAria: "Replace with local file",
    replaceTitle: "Replace with local file (testing)",
    pause: "Pause",
    play: "Play",
    trackTitle: "Track name / artist",
    trackTitlePlaceholder: "e.g. Can't Help Falling in Love",
    uploadFile: "Upload file",
    youtubeLink: "YouTube / link",
    startTime: "Music start time",
    hours: "Hours (H)",
    minutes: "Minutes (M)",
    seconds: "Seconds (S)",
    startHint: (s: number) => `Music will start from this point (${s}s)`,
    removeMusic: "Remove music",
    viaYoutube: "Playing via YouTube",
  },
};

export function Step13Music({
  value,
  onChange,
}: {
  value: InvitationDetail;
  onChange: (patch: Partial<InvitationDetail>) => void;
}) {
  const { language } = useLanguage();
  const t = COPY[language];
  // Admin-curated tracks (TemplateEditModal's "also save as a customer
  // suggestion" checkbox, or the standalone music-suggestions management
  // flow) shown alongside the hardcoded PRESET_TRACKS below rather than
  // replacing them — nothing already live loses its spot in the library
  // just because this list started out empty.
  const [suggestions, setSuggestions] = useState<PresetTrack[]>([]);
  useEffect(() => {
    let cancelled = false;
    listActiveMusicSuggestions()
      .then((data) => {
        if (!cancelled) {
          setSuggestions(
            data.map((s) => ({
              id: `suggestion-${s.id}`,
              title: s.title,
              artist: s.artist ?? undefined,
              url: s.url,
              color: "#C8A24A",
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const libraryTracks: PresetTrack[] = [...PRESET_TRACKS, ...suggestions];
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  // Per-preset local overrides — lets a preset slot be swapped for a locally
  // uploaded file instead of its YouTube source, without touching the others.
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const overrideTargetRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overrideInputRef = useRef<HTMLInputElement>(null);

  function trackUrl(track: PresetTrack) {
    return overrides[track.id] ?? track.url;
  }

  const previewTrack = libraryTracks.find((track) => track.id === previewTrackId) ?? null;
  const previewUrl = previewTrack ? trackUrl(previewTrack) : null;
  // One player serves both the library rows and the start-time picker: it
  // plays the track being previewed, or else the one currently chosen for the
  // invitation (selecting/typing a track keeps the two in sync below).
  const playerUrl = previewUrl ?? value.musicUrl ?? null;
  // Start offset only applies to the track actually chosen for the invitation,
  // and the YouTube player is built lazily (first play tap) -- see useMusicPlayer.
  const hookStart = playerUrl && playerUrl === value.musicUrl ? (value.musicStartSeconds ?? 0) : 0;
  const preview = useMusicPlayer(playerUrl, hookStart, { lazy: true });
  // Rows can't call preview.play() the instant they're clicked — for a
  // YouTube-backed track the IFrame Player is still being created
  // asynchronously at that point, so play() would land on a null ref and do
  // nothing. Both backends set a real duration once genuinely ready
  // (loadedmetadata for <audio>, onReady for YouTube), so that's used as the
  // "safe to play" signal instead. Guarded per-url so a manual pause
  // afterwards doesn't get immediately overridden by this effect replaying it.
  const autoplayedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!previewUrl || preview.duration <= 0) return;
    if (autoplayedUrlRef.current === previewUrl) return;
    autoplayedUrlRef.current = previewUrl;
    preview.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, preview.duration]);

  function selectTrack(track: PresetTrack) {
    // Point the shared player at the chosen track (without auto-playing it) so
    // the start-time picker below controls exactly this track.
    autoplayedUrlRef.current = trackUrl(track);
    setPreviewTrackId(track.id);
    const changed = value.musicUrl !== trackUrl(track);
    onChange({
      musicUrl: trackUrl(track),
      musicTitle: trackLabel(track),
      // A start point only makes sense for the track it was picked on.
      ...(changed ? { musicStartSeconds: 0 } : {}),
    });
  }

  function togglePreview(track: PresetTrack) {
    if (previewTrackId === track.id) {
      preview.togglePlay();
      return;
    }
    preview.activate();
    setPreviewTrackId(track.id);
  }

  function requestOverride(trackId: string) {
    overrideTargetRef.current = trackId;
    overrideInputRef.current?.click();
  }

  async function handleOverrideSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const trackId = overrideTargetRef.current;
    event.target.value = "";
    overrideTargetRef.current = null;
    if (!file || !trackId) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    setOverrides((current) => ({ ...current, [trackId]: dataUrl }));

    // If this preset is the one currently selected for the invitation,
    // repoint its saved musicUrl at the new local file immediately.
    const track = libraryTracks.find((item) => item.id === trackId);
    if (track && value.musicUrl === trackUrl(track)) {
      onChange({ musicUrl: dataUrl });
    }
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setPreviewTrackId(null);
    onChange({ musicUrl: dataUrl, musicTitle: value.musicTitle || file.name.replace(/\.[^.]+$/, ""), musicStartSeconds: 0 });
  }

  function removeMusic() {
    preview.pause();
    setPreviewTrackId(null);
    setShowLinkInput(false);
    onChange({ musicUrl: null, musicTitle: null, musicStartSeconds: null });
  }

  return (
    <div className="space-y-5">
      <audio key={preview.effectiveUrl} ref={preview.audioRef} src={preview.effectiveUrl ?? undefined} className="hidden" />
      <div ref={preview.youtubeContainerRef} className="hidden" />
      <input
        ref={overrideInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleOverrideSelected}
      />

      <HintBox>{t.hint}</HintBox>

      {/* Preset library */}
      <div>
        <p className="mb-2 text-sm text-body-foreground">{t.library}</p>
        <div className="space-y-2">
          {libraryTracks.map((track) => {
            const selected = value.musicUrl === trackUrl(track);
            const isPreviewTrack = previewTrackId === track.id;
            const playing = isPreviewTrack && preview.isPlaying;
            const loading = isPreviewTrack && !preview.isPlaying && !preview.loadError && preview.duration <= 0;
            const overridden = Boolean(overrides[track.id]);
            return (
              <div
                key={track.id}
                onClick={() => selectTrack(track)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") selectTrack(track);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 text-sm transition-colors",
                  selected ? "border-gold bg-gold/5" : "border-border hover:border-gold/40"
                )}
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: track.color }}
                >
                  <MusicIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{track.title}</span>
                  {(track.artist || overridden || isPreviewTrack) && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {track.artist}
                      {overridden && <span className="text-gold"> · {t.localFile}</span>}
                      {!overridden && isPreviewTrack && <span className="text-gold"> · {t.viaYoutube}</span>}
                    </span>
                  )}
                </span>
                {selected && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold text-white">
                    <CheckIcon className="size-3" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    requestOverride(track.id);
                  }}
                  aria-label={t.replaceAria}
                  title={t.replaceTitle}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
                >
                  <RefreshIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePreview(track);
                  }}
                  aria-label={playing ? t.pause : t.play}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-body-foreground transition-colors hover:border-gold/40 hover:text-gold",
                    loading && "animate-pulse"
                  )}
                >
                  {playing ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5 ms-0.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom upload / link */}
      <div className="space-y-3 border-t border-border pt-4">
        <TextField
          label={t.trackTitle}
          value={value.musicTitle ?? ""}
          placeholder={t.trackTitlePlaceholder}
          onChange={(musicTitle) => onChange({ musicTitle })}
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileSelected}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-gold/40 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold/5"
          >
            <UploadIcon className="size-4" />
            {t.uploadFile}
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput((open) => !open)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition-colors",
              showLinkInput ? "border-gold bg-gold/5 text-gold" : "border-border text-body-foreground hover:border-gold/40"
            )}
          >
            <LinkIcon className="size-4" />
            {t.youtubeLink}
          </button>
        </div>

        {showLinkInput && (
          <TextField
            value={value.musicUrl ?? ""}
            placeholder="https://youtube.com/watch?v=..."
            onChange={(musicUrl) => {
              setPreviewTrackId(null);
              onChange({ musicUrl });
            }}
          />
        )}
      </div>

      {/* Start time */}
      {value.musicUrl && (
        <MusicStartPicker
          player={preview}
          startSeconds={value.musicStartSeconds ?? 0}
          onChange={(musicStartSeconds) => onChange({ musicStartSeconds })}
        />
      )}

      {value.musicUrl && (
        <button
          type="button"
          onClick={removeMusic}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-rose-700 dark:text-rose-400 transition-colors hover:bg-rose-100 dark:bg-rose-950/30"
        >
          <TrashIcon className="size-3.5" />
          {t.removeMusic}
        </button>
      )}
    </div>
  );
}
