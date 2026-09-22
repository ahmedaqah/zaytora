"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MailIcon } from "@/components/icons";

const COPY = {
  ar: {
    title: "إرسال استفسار لمين ما طلب؟",
    body: (count: number) =>
      count > 0
        ? `رح يتم إرسال إيميل لـ ${count} مستخدم سجّلوا معنا بس ما عملوا أي طلب لسا، نسألهم فيه بلطف عن سبب التأخير ونعرض المساعدة. الردود بتوصل مباشرة على إيميل الموقع. ما رح يتكرر الإرسال لمين استلمها قبل.`
        : "لا يوجد حاليًا أي مستخدم مؤهل لهاد الإيميل (الكل إما استلمها قبل، أو عنده طلب فعلي).",
    send: "إرسال",
    cancel: "إلغاء",
    sending: "جارٍ الإرسال...",
  },
  en: {
    title: "Ask never-ordered users why?",
    body: (count: number) =>
      count > 0
        ? `This will email ${count} account(s) that registered but never placed an order, asking politely why and offering help. Replies land directly on the site's inbox. Anyone already emailed before is skipped.`
        : "No accounts currently qualify for this email (everyone either has an order already, or was already emailed).",
    send: "Send",
    cancel: "Cancel",
    sending: "Sending...",
  },
};

export function EngagementEmailDialog({
  open,
  count,
  language,
  error,
  sending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  count: number;
  language: "ar" | "en";
  error?: string | null;
  sending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = COPY[language];

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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#C8A24A]/10">
              <MailIcon className="size-6 text-[#C8A24A]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">{t.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-body-foreground">{t.body(count)}</p>
            {error && <p className="mt-3 text-xs font-medium text-rose-700 dark:text-rose-400">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={sending}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-body-foreground transition-colors hover:bg-background/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={sending || count === 0}
                className="flex-1 rounded-xl bg-[#C8A24A] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#b8944a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? t.sending : t.send}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
