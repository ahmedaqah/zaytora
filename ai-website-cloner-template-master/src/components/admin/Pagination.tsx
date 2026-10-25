"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const COPY = {
  ar: {
    of: (from: number, to: number, total: number) => `${from}–${to} من ${total}`,
    prev: "السابق",
    next: "التالي",
    jumpTitle: "الانتقال إلى صفحة",
    jumpHint: (total: number) => `اكتب رقم الصفحة (من 1 إلى ${total}) أو اخترها من القائمة`,
    go: "انتقال",
    first: "الأولى",
    last: "الأخيرة",
    close: "إغلاق",
    pick: "اختيار الصفحة",
    outOfRange: (total: number) => `أدخل رقماً بين 1 و ${total}`,
  },
  en: {
    of: (from: number, to: number, total: number) => `${from}–${to} of ${total}`,
    prev: "Previous",
    next: "Next",
    jumpTitle: "Go to page",
    jumpHint: (total: number) => `Type a page number (1–${total}) or pick one below`,
    go: "Go",
    first: "First",
    last: "Last",
    close: "Close",
    pick: "Pick a page",
    outOfRange: (total: number) => `Enter a number between 1 and ${total}`,
  },
};

// Shared pager for admin list pages backed by PagedResult<T> —
// Orders/Partners/Reviews/Users. "Previous" on page 1 wraps to the last page
// (the newest rows are at the end of these lists), and the "page / total"
// label opens a picker so you can jump straight to any page.
export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  language,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  language: "ar" | "en";
}) {
  const t = COPY[language];
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const [jumpOpen, setJumpOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!jumpOpen) return;
    setDraft(String(page));
    setInvalid(false);
    const focus = window.setTimeout(() => inputRef.current?.select(), 60);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setJumpOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focus);
      window.removeEventListener("keydown", onKey);
    };
  }, [jumpOpen, page]);

  if (totalCount === 0) return null;

  const goTo = (target: number) => {
    onPageChange(Math.min(totalPages, Math.max(1, target)));
    setJumpOpen(false);
  };

  const submitDraft = () => {
    const n = Number.parseInt(draft, 10);
    if (!Number.isFinite(n) || n < 1 || n > totalPages) {
      setInvalid(true);
      return;
    }
    goTo(n);
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  // In RTL, "previous" (toward page 1) points visually right, "next" left.
  const PrevIcon = language === "ar" ? ChevronRightIcon : ChevronLeftIcon;
  const NextIcon = language === "ar" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
      <span dir="ltr">{t.of(from, to, totalCount)}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={totalPages <= 1}
          onClick={() => onPageChange(page <= 1 ? totalPages : page - 1)}
          aria-label={page <= 1 ? `${t.prev} — ${t.last}` : t.prev}
          title={page <= 1 && totalPages > 1 ? t.last : undefined}
          className={cn(
            "flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors",
            totalPages <= 1 ? "cursor-not-allowed opacity-40" : "hover:border-white/20 hover:text-foreground"
          )}
        >
          <PrevIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setJumpOpen(true)}
          disabled={totalPages <= 1}
          aria-label={t.pick}
          title={t.pick}
          className={cn(
            "rounded-lg px-2 py-1 tabular-nums transition-colors",
            totalPages <= 1 ? "cursor-default" : "hover:bg-background/10 hover:text-foreground"
          )}
          dir="ltr"
        >
          {page} / {totalPages}
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={t.next}
          className={cn(
            "flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors",
            page >= totalPages ? "cursor-not-allowed opacity-40" : "hover:border-white/20 hover:text-foreground"
          )}
        >
          <NextIcon className="size-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {jumpOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t.jumpTitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4"
            onClick={() => setJumpOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-sm rounded-3xl bg-card p-6 text-start shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-foreground">{t.jumpTitle}</h2>
              <p className="mt-1 text-sm text-body-foreground">{t.jumpHint(totalPages)}</p>

              <form
                className="mt-4 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitDraft();
                }}
              >
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value.replace(/[^0-9]/g, ""));
                    setInvalid(false);
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  dir="ltr"
                  aria-invalid={invalid}
                  className={cn(
                    "min-w-0 flex-1 rounded-xl border bg-background px-4 py-2.5 text-center text-base tabular-nums text-foreground outline-none transition-colors focus:border-[#C8A24A]",
                    invalid ? "border-rose-500" : "border-border"
                  )}
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#C8A24A] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                >
                  {t.go}
                </button>
              </form>
              {invalid && <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{t.outOfRange(totalPages)}</p>}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-body-foreground transition-colors hover:bg-background/10"
                >
                  {t.first}
                </button>
                <button
                  type="button"
                  onClick={() => goTo(totalPages)}
                  className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-body-foreground transition-colors hover:bg-background/10"
                >
                  {t.last}
                </button>
              </div>

              {totalPages <= 400 && (
                <div className="mt-4 grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto pe-1" dir="ltr">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => goTo(n)}
                      className={cn(
                        "rounded-lg border py-1.5 text-sm tabular-nums transition-colors",
                        n === page
                          ? "border-[#C8A24A] bg-[#C8A24A]/15 font-semibold text-foreground"
                          : "border-border text-body-foreground hover:bg-background/10"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setJumpOpen(false)}
                className="mt-4 w-full rounded-xl py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.close}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
