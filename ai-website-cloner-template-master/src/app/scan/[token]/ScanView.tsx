"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CameraIcon, CheckIcon, LoaderIcon, UsersIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { ApiError } from "@/lib/api/client";
import { getQrScanInfo, submitQrCheckin } from "@/lib/services/qrEntry.service";
import { extractShareCode, loadJsQr } from "@/lib/qrVendor";
import type { QrScanInfoDto, QrWarning } from "@/types/api";

const COPY = {
  ar: {
    title: "تسجيل دخول الضيوف",
    arrived: "عدد من وصلوا",
    outOf: (n: number) => `من ${n}`,
    startCamera: "تشغيل الكاميرا ومسح الرمز",
    pointCamera: "وجّه الكاميرا نحو رمز QR في جوال الضيف",
    cameraError: "تعذّر تشغيل الكاميرا. اسمح باستخدام الكاميرا للصفحة، أو سجّل الحضور يدوياً.",
    manual: "تسجيل يدوي بدون مسح",
    wrongQr: "هذا الرمز لا يخص هذه المناسبة",
    scanned: "تم قراءة الرمز",
    nameLabel: "اسم الضيف",
    namePlaceholder: "اكتب الاسم",
    partyLabel: "عدد الأشخاص",
    confirm: "تأكيد الحضور",
    cancel: "إلغاء",
    confirmAnyway: "تأكيد رغم ذلك",
    done: (name: string) => `تم تسجيل حضور ${name}`,
    next: "ضيف تالٍ",
    nameRequired: "اكتب اسم الضيف",
    invalidLink: "هذا الرابط غير صالح أو تم إلغاؤه. اطلب رابطاً جديداً من صاحب الدعوة.",
    saveError: "تعذّر الحفظ، حاول مرة أخرى",
    warnings: {
      duplicate: "هذا الاسم سُجّل حضوره من قبل",
      over_capacity: "تجاوز عدد الحضور المسجّل للدعوة",
      outside_window: "الوقت الحالي خارج فترة المسح المحددة",
    } as Record<QrWarning, string>,
  },
  en: {
    title: "Guest check-in",
    arrived: "Arrived",
    outOf: (n: number) => `of ${n}`,
    startCamera: "Start camera and scan",
    pointCamera: "Point the camera at the QR code on the guest's phone",
    cameraError: "Couldn't start the camera. Allow camera access for this page, or check the guest in manually.",
    manual: "Check in manually without scanning",
    wrongQr: "This code doesn't belong to this event",
    scanned: "Code read",
    nameLabel: "Guest name",
    namePlaceholder: "Type the name",
    partyLabel: "Number of people",
    confirm: "Confirm arrival",
    cancel: "Cancel",
    confirmAnyway: "Confirm anyway",
    done: (name: string) => `${name} checked in`,
    next: "Next guest",
    nameRequired: "Enter the guest's name",
    invalidLink: "This link is invalid or has been revoked. Ask the host for a new one.",
    saveError: "Couldn't save, please try again",
    warnings: {
      duplicate: "This name has already been checked in",
      over_capacity: "The registered guest count has been exceeded",
      outside_window: "The current time is outside the scan window",
    } as Record<QrWarning, string>,
  },
};

type Phase = "idle" | "scanning" | "form" | "done";

export function ScanView() {
  const { language } = useLanguage();
  const t = COPY[language];
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [info, setInfo] = useState<QrScanInfoDto | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [cameraError, setCameraError] = useState(false);
  const [wrongQr, setWrongQr] = useState(false);
  const [name, setName] = useState("");
  const [party, setParty] = useState(1);
  const [warnings, setWarnings] = useState<QrWarning[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [doneName, setDoneName] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const infoRef = useRef<QrScanInfoDto | null>(null);

  useEffect(() => {
    infoRef.current = info;
  }, [info]);

  const loadInfo = useCallback(async () => {
    try {
      setInfo(await getQrScanInfo(token));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setInvalid(true);
      else console.error("[scan] failed to load info:", err);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInfo();
  }, [loadInfo]);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setCameraError(false);
    setWrongQr(false);
    try {
      const jsQR = await loadJsQr();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setPhase("scanning");

      // The <video> only exists once phase flips to "scanning" -- wait for it
      // to be committed (a few frames at most).
      for (let i = 0; i < 30 && !videoRef.current; i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      const video = videoRef.current;
      if (!video) throw new Error("no video element");
      video.srcObject = stream;
      await video.play();

      const tick = () => {
        const canvas = canvasRef.current;
        const v = videoRef.current;
        if (!canvas || !v) return;
        if (v.readyState >= 2 && v.videoWidth > 0) {
          // Decode at a reduced size: plenty for a phone-screen QR, much cheaper.
          const scale = Math.min(1, 640 / v.videoWidth);
          canvas.width = Math.round(v.videoWidth * scale);
          canvas.height = Math.round(v.videoHeight * scale);
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(image.data, image.width, image.height);
            if (result) {
              const code = extractShareCode(result.data);
              if (code && code === infoRef.current?.shareCode) {
                stopCamera();
                setWrongQr(false);
                setName("");
                setParty(1);
                setWarnings([]);
                setMessage(null);
                setPhase("form");
                return;
              }
              setWrongQr(true);
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error("[scan] camera failed:", err);
      stopCamera();
      setPhase("idle");
      setCameraError(true);
    }
  }

  function startManual() {
    stopCamera();
    setName("");
    setParty(1);
    setWarnings([]);
    setMessage(null);
    setPhase("form");
  }

  function backToStart() {
    stopCamera();
    setWarnings([]);
    setMessage(null);
    setPhase("idle");
  }

  async function submit(confirm: boolean) {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage(t.nameRequired);
      return;
    }
    if (!info?.shareCode) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await submitQrCheckin(token, {
        guestName: trimmed,
        partySize: party,
        shareCode: info.shareCode,
        confirm,
      });
      if (result.recorded) {
        setDoneName(trimmed);
        setInfo((current) => (current ? { ...current, totalPeople: result.totalPeople } : current));
        setWarnings([]);
        setPhase("done");
      } else {
        setWarnings(result.warnings);
      }
    } catch (err) {
      console.error("[scan] check-in failed:", err);
      if (err instanceof ApiError && err.status === 404) setInvalid(true);
      else setMessage(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main dir={language === "ar" ? "rtl" : "ltr"} className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-8">
      <header className="text-center">
        <p className="text-xs tracking-widest text-gold">ZAYTORA</p>
        <h1 className="mt-1 text-xl font-semibold text-foreground">{t.title}</h1>
        {info && (
          <p className="mt-1 text-sm text-muted-foreground">
            {info.names}
            {info.scannerLabel ? ` · ${info.scannerLabel}` : ""}
          </p>
        )}
      </header>

      {invalid && <p className="rounded-2xl bg-rose-100 p-4 text-center text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">{t.invalidLink}</p>}

      {!invalid && !info && (
        <div className="flex justify-center py-10 text-muted-foreground">
          <LoaderIcon className="size-6 animate-spin" />
        </div>
      )}

      {!invalid && info && (
        <>
          <div className="rounded-2xl bg-emerald-100 p-4 text-center dark:bg-emerald-950/50">
            <p className="text-3xl font-semibold text-emerald-700 dark:text-emerald-400">{info.totalPeople}</p>
            <p className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400/80">
              {t.arrived}
              {info.guestCount ? ` ${t.outOf(info.guestCount)}` : ""}
            </p>
          </div>

          {phase === "idle" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={startCamera}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-4 py-4 text-sm font-semibold text-black"
              >
                <CameraIcon className="size-5" />
                {t.startCamera}
              </button>
              {cameraError && <p className="text-center text-xs text-rose-700 dark:text-rose-400">{t.cameraError}</p>}
              <button type="button" onClick={startManual} className="w-full text-center text-xs text-muted-foreground underline">
                {t.manual}
              </button>
            </div>
          )}

          {phase === "scanning" && (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl bg-black">
                <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
                <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-center text-sm text-muted-foreground">{t.pointCamera}</p>
              {wrongQr && <p className="text-center text-sm font-medium text-rose-700 dark:text-rose-400">{t.wrongQr}</p>}
              <div className="flex items-center justify-center gap-4 text-xs">
                <button type="button" onClick={startManual} className="text-muted-foreground underline">
                  {t.manual}
                </button>
                <button type="button" onClick={backToStart} className="text-muted-foreground underline">
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {phase === "form" && (
            <div className="space-y-4 rounded-2xl bg-background/5 p-4">
              <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckIcon className="size-4" />
                {t.scanned}
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-foreground">{t.nameLabel}</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={128}
                  autoFocus
                  placeholder={t.namePlaceholder}
                  className="w-full rounded-xl border border-border bg-background/5 px-3 py-3 text-base text-foreground outline-none focus:border-gold"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <UsersIcon className="size-3.5" />
                  {t.partyLabel}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  value={party}
                  onChange={(event) => setParty(Math.min(50, Math.max(1, Number(event.target.value) || 1)))}
                  className="w-full rounded-xl border border-border bg-background/5 px-3 py-3 text-base text-foreground outline-none focus:border-gold"
                />
              </label>

              {warnings.length > 0 && (
                <ul className="space-y-1 rounded-xl bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  {warnings.map((warning) => (
                    <li key={warning}>⚠ {t.warnings[warning]}</li>
                  ))}
                </ul>
              )}
              {message && <p className="text-sm text-rose-700 dark:text-rose-400">{message}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => submit(warnings.length > 0)}
                  disabled={saving}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50",
                    warnings.length > 0 ? "bg-amber-500 text-black" : "bg-gold text-black"
                  )}
                >
                  {saving && <LoaderIcon className="size-4 animate-spin" />}
                  {warnings.length > 0 ? t.confirmAnyway : t.confirm}
                </button>
                <button type="button" onClick={backToStart} className="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-4 rounded-2xl bg-emerald-100 p-5 text-center dark:bg-emerald-950/50">
              <CheckIcon className="mx-auto size-10 text-emerald-700 dark:text-emerald-400" />
              <p className="text-base font-semibold text-emerald-800 dark:text-emerald-300">{t.done(doneName)}</p>
              <button
                type="button"
                onClick={backToStart}
                className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black"
              >
                {t.next}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
