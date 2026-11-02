"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HeartIcon, LoaderIcon, TrashIcon, UserIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { deleteRsvpResponse, listRsvpResponses } from "@/lib/services/invitations.service";
import type { RsvpResponseDto } from "@/types/api";

const COPY = {
  ar: {
    title: "الردود",
    notAttending: "لن يحضروا",
    attending: "الحضور",
    attendingCountSuffix: (responses: number) => `(${responses} رد)`,
    guestsLabel: (n: number) => `${n} ${n === 1 ? "ضيف" : "ضيوف"}`,
    statusAttending: "قادم",
    statusNotAttending: "لن يحضر",
    statusPending: "بانتظار الرد",
    empty: "لا توجد ردود بعد",
    close: "إغلاق",
    deleteResponse: "حذف الرد",
    loadError: "تعذّر تحميل الردود",
  },
  en: {
    title: "Responses",
    notAttending: "Not Attending",
    attending: "Attending",
    attendingCountSuffix: (responses: number) => `(${responses} ${responses === 1 ? "response" : "responses"})`,
    guestsLabel: (n: number) => `${n} ${n === 1 ? "guest" : "guests"}`,
    statusAttending: "Attending",
    statusNotAttending: "Not Attending",
    statusPending: "Pending",
    empty: "No responses yet",
    close: "Close",
    deleteResponse: "Delete response",
    loadError: "Couldn't load responses",
  },
};

function formatTimestamp(iso: string, language: "ar" | "en") {
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function RsvpResponsesModal({
  invitationId,
  language,
  onClose,
  loadResponses = listRsvpResponses,
  removeRemote = deleteRsvpResponse,
}: {
  invitationId: string | null;
  language: "ar" | "en";
  onClose: () => void;
  // Default to the studio invitations' endpoints; a private invitation passes its own (keyed by slug).
  loadResponses?: (id: string) => Promise<RsvpResponseDto[]>;
  removeRemote?: (id: string, responseId: string) => Promise<unknown>;
}) {
  const t = COPY[language];
  const open = Boolean(invitationId);
  const [responses, setResponses] = useState<RsvpResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!invitationId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
    loadResponses(invitationId)
      .then((data) => {
        if (!cancelled) setResponses(data);
      })
      .catch((err) => {
        console.error("[dashboard] failed to load rsvp responses:", err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitationId]);

  async function removeResponse(responseId: string) {
    if (!invitationId) return;
    const previous = responses;
    setResponses((current) => current.filter((r) => r.id !== responseId));
    try {
      await removeRemote(invitationId, responseId);
    } catch (err) {
      console.error("[dashboard] failed to delete rsvp response:", err);
      setResponses(previous);
    }
  }

  const attending = responses.filter((r) => r.attending !== false);
  const notAttending = responses.filter((r) => r.attending === false);
  const attendingGuestTotal = attending.reduce((sum, r) => sum + (r.guestCount ?? 1), 0);

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
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
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

            <div className="grid shrink-0 grid-cols-2 gap-3 px-5 pt-4">
              <div className="rounded-2xl bg-red-100 dark:bg-red-950/50 p-4 text-center">
                <p className="text-2xl font-semibold text-red-700 dark:text-red-400">{notAttending.length}</p>
                <p className="mt-0.5 text-xs font-medium text-red-700 dark:text-red-400/80">{t.notAttending}</p>
              </div>
              <div className="rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 p-4 text-center">
                <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{attendingGuestTotal}</p>
                <p className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400/80">
                  {t.attending} {t.attendingCountSuffix(attending.length)}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loading && (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <LoaderIcon className="size-6 animate-spin" />
                </div>
              )}

              {!loading && error && <p className="py-10 text-center text-sm text-rose-700 dark:text-rose-400">{t.loadError}</p>}

              {!loading && !error && responses.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">{t.empty}</p>
              )}

              {!loading && !error && responses.length > 0 && (
                <div className="space-y-3">
                  {responses.map((response, index) => (
                    <motion.div
                      key={response.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04, ease: "easeOut" }}
                      className="rounded-2xl bg-background/5 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
                            <UserIcon className="size-4" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{response.guestName}</p>
                            <p className="text-[11px] text-muted-foreground">{formatTimestamp(response.createdAt, language)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeResponse(response.id)}
                          aria-label={t.deleteResponse}
                          title={t.deleteResponse}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-rose-100 dark:bg-rose-950/50 hover:text-rose-700 dark:text-rose-400"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                            response.attending === false
                              ? "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                              : response.attending === true
                                ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                                : "bg-background/10 text-muted-foreground"
                          )}
                        >
                          <HeartIcon className="size-3" />
                          {response.attending === false
                            ? t.statusNotAttending
                            : response.attending === true
                              ? `${t.statusAttending} - ${t.guestsLabel(response.guestCount ?? 1)}`
                              : t.statusPending}
                        </span>
                      </div>

                      {response.message && (
                        <p className="mt-3 rounded-xl bg-background/5 px-3 py-2 text-sm leading-relaxed text-body-foreground">
                          {response.message}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
