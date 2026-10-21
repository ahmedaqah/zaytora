"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CopyIcon, LoaderIcon, PlusIcon, TrashIcon, UsersIcon, WhatsAppIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  createQrScanner,
  deleteQrCheckin,
  getQrEntryState,
  revokeQrScanner,
} from "@/lib/services/qrEntry.service";
import type { QrEntryStateDto } from "@/types/api";

const COPY = {
  ar: {
    title: "دخول الضيوف",
    arrived: "عدد من وصلوا",
    outOf: (n: number) => `من ${n}`,
    scannersTitle: "روابط الماسحين",
    scannersHint: "أرسل رابطاً لكل موظف استقبال. يفتحه على جواله، يصوّر رمز QR من جوال الضيف، يكتب اسمه ويؤكد حضوره.",
    scannerLabelPlaceholder: "اسم الماسح (مثال: البوابة 1)",
    addScanner: "إضافة ماسح",
    limitReached: (n: number) => `وصلت للحد الأقصى (${n})`,
    copyLink: "نسخ الرابط",
    copied: "تم النسخ",
    sendWhatsapp: "إرسال عبر واتساب",
    revoke: "إلغاء الرابط",
    noScanners: "لا توجد روابط بعد",
    checkinsTitle: "الحضور (الأقدم أولاً)",
    noCheckins: "لم يُسجَّل أي حضور بعد",
    deleteCheckin: "حذف السجل",
    persons: (n: number) => `${n} ${n === 1 ? "شخص" : "أشخاص"}`,
    close: "إغلاق",
    loadError: "تعذّر تحميل البيانات",
    notEnabled: "دخول الضيوف عبر QR غير مفعّل لهذه الدعوة. فعّله من الاستديو (الإعدادات المتقدمة).",
    whatsappText: (link: string) => `رابط تسجيل دخول الضيوف:\n${link}`,
  },
  en: {
    title: "Guest entry",
    arrived: "Arrived",
    outOf: (n: number) => `of ${n}`,
    scannersTitle: "Scanner links",
    scannersHint: "Send one link to each door staff member. They open it on their phone, scan a guest's QR, type the name and confirm.",
    scannerLabelPlaceholder: "Scanner name (e.g. Gate 1)",
    addScanner: "Add scanner",
    limitReached: (n: number) => `Limit reached (${n})`,
    copyLink: "Copy link",
    copied: "Copied",
    sendWhatsapp: "Send via WhatsApp",
    revoke: "Revoke link",
    noScanners: "No links yet",
    checkinsTitle: "Arrivals (oldest first)",
    noCheckins: "No arrivals recorded yet",
    deleteCheckin: "Delete entry",
    persons: (n: number) => `${n} ${n === 1 ? "person" : "people"}`,
    close: "Close",
    loadError: "Couldn't load the data",
    notEnabled: "QR guest entry isn't enabled for this invitation. Turn it on in the studio (advanced settings).",
    whatsappText: (link: string) => `Guest check-in link:\n${link}`,
  },
};

function formatTime(iso: string, language: "ar" | "en") {
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function scannerLink(token: string) {
  return `${window.location.origin}/scan/${token}`;
}

export function QrEntryModal({
  invitationId,
  language,
  onClose,
}: {
  invitationId: string | null;
  language: "ar" | "en";
  onClose: () => void;
}) {
  const t = COPY[language];
  const open = Boolean(invitationId);
  const [state, setState] = useState<QrEntryStateDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(
    async (showSpinner: boolean) => {
      if (!invitationId) return;
      if (showSpinner) setLoading(true);
      try {
        const data = await getQrEntryState(invitationId);
        setState(data);
        setError(false);
      } catch (err) {
        console.error("[dashboard] failed to load qr entry state:", err);
        if (showSpinner) setError(true);
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [invitationId]
  );

  useEffect(() => {
    if (!invitationId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(null);
    refresh(true);
    // Live-ish: new arrivals show up without reopening the dialog.
    const timer = window.setInterval(() => refresh(false), 10_000);
    return () => window.clearInterval(timer);
  }, [invitationId, refresh]);

  async function addScanner() {
    if (!invitationId || adding) return;
    setAdding(true);
    try {
      await createQrScanner(invitationId, label.trim());
      setLabel("");
      await refresh(false);
    } catch (err) {
      console.error("[dashboard] failed to add scanner:", err);
    } finally {
      setAdding(false);
    }
  }

  async function revoke(scannerId: string) {
    if (!invitationId) return;
    try {
      await revokeQrScanner(invitationId, scannerId);
      await refresh(false);
    } catch (err) {
      console.error("[dashboard] failed to revoke scanner:", err);
    }
  }

  async function removeCheckin(checkinId: string) {
    if (!invitationId) return;
    try {
      await deleteQrCheckin(invitationId, checkinId);
      await refresh(false);
    } catch (err) {
      console.error("[dashboard] failed to delete check-in:", err);
    }
  }

  function copy(scannerId: string, token: string) {
    navigator.clipboard.writeText(scannerLink(token)).catch(() => {});
    setCopiedId(scannerId);
    window.setTimeout(() => setCopiedId((current) => (current === scannerId ? null : current)), 2000);
  }

  const activeScanners = state?.scanners.filter((s) => !s.revokedAt) ?? [];
  const limitReached = state ? activeScanners.length >= state.scannerLimit : false;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">{t.title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.close}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/10 hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {loading && (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <LoaderIcon className="size-6 animate-spin" />
                </div>
              )}

              {!loading && error && <p className="py-10 text-center text-sm text-rose-700 dark:text-rose-400">{t.loadError}</p>}

              {!loading && !error && state && !state.enabled && (
                <p className="py-10 text-center text-sm text-muted-foreground">{t.notEnabled}</p>
              )}

              {!loading && !error && state?.enabled && (
                <>
                  <div className="rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 p-4 text-center">
                    <p className="text-3xl font-semibold text-emerald-700 dark:text-emerald-400">{state.totalPeople}</p>
                    <p className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400/80">
                      {t.arrived}
                      {state.guestCount ? ` ${t.outOf(state.guestCount)}` : ""}
                    </p>
                  </div>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">{t.scannersTitle}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{t.scannersHint}</p>

                    {activeScanners.length === 0 && <p className="text-xs text-muted-foreground">{t.noScanners}</p>}

                    {activeScanners.map((scanner) => (
                      <div key={scanner.id} className="rounded-2xl bg-background/5 p-3">
                        <p className="text-sm font-medium text-foreground">{scanner.label}</p>
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => copy(scanner.id, scanner.token)}
                            title={t.copyLink}
                            aria-label={t.copyLink}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors",
                              copiedId === scanner.id
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-muted-foreground hover:bg-gold/10 hover:text-gold"
                            )}
                          >
                            {copiedId === scanner.id ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                            {copiedId === scanner.id ? t.copied : t.copyLink}
                          </button>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(t.whatsappText(scannerLink(scanner.token)))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={t.sendWhatsapp}
                            aria-label={t.sendWhatsapp}
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-gold/10 hover:text-gold"
                          >
                            <WhatsAppIcon className="size-4" />
                            {t.sendWhatsapp}
                          </a>
                          <button
                            type="button"
                            onClick={() => revoke(scanner.id)}
                            title={t.revoke}
                            aria-label={t.revoke}
                            className="ms-auto flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-rose-100 dark:bg-rose-950/50 hover:text-rose-700 dark:text-rose-400"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-2">
                      <input
                        value={label}
                        onChange={(event) => setLabel(event.target.value)}
                        maxLength={80}
                        placeholder={t.scannerLabelPlaceholder}
                        disabled={limitReached}
                        className="min-w-0 flex-1 rounded-xl border border-border bg-background/5 px-3 py-2 text-sm text-foreground outline-none focus:border-gold disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={addScanner}
                        disabled={limitReached || adding}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-3 py-2 text-xs font-semibold text-black transition-opacity disabled:opacity-40"
                      >
                        {adding ? <LoaderIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
                        {t.addScanner}
                      </button>
                    </div>
                    {limitReached && <p className="text-[11px] text-muted-foreground">{t.limitReached(state.scannerLimit)}</p>}
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">{t.checkinsTitle}</h3>
                    {state.checkins.length === 0 && <p className="text-xs text-muted-foreground">{t.noCheckins}</p>}
                    {state.checkins.map((checkin, index) => (
                      <div key={checkin.id} className="flex items-center gap-3 rounded-2xl bg-background/5 p-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/10 text-xs font-semibold text-gold">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{checkin.guestName}</p>
                          <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                            <span>{formatTime(checkin.createdAt, language)}</span>
                            <span className="flex items-center gap-1">
                              <UsersIcon className="size-3" />
                              {t.persons(checkin.partySize)}
                            </span>
                            <span>{checkin.scannerLabel}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCheckin(checkin.id)}
                          title={t.deleteCheckin}
                          aria-label={t.deleteCheckin}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-rose-100 dark:bg-rose-950/50 hover:text-rose-700 dark:text-rose-400"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                    ))}
                  </section>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
