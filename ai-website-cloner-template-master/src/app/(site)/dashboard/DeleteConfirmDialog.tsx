"use client";

import { AnimatePresence, motion } from "framer-motion";
import { InfoIcon, TrashIcon } from "@/components/icons";

const COPY = {
  ar: {
    title: "حذف الدعوة؟",
    body: (names: string) => `سيؤدي هذا إلى حذف دعوة ${names} نهائياً. لا يمكن التراجع عن هذا الإجراء.`,
    pendingOrderWarning:
      "لديك طلب دفع قيد الانتظار مرتبط بهذه الدعوة — حذفها الآن سيفقد الإدارة القدرة على مراجعته أو تأكيد الدفع لاحقاً.",
    delete: "حذف",
    cancel: "إلغاء",
    adminBody: "سيتم حذف الدعوة وكل ما يخصها نهائياً: الردود، الصور، ملفات التخزين، وبيانات الدخول بالـ QR. هذا الإجراء لا يمكن التراجع عنه.",
    adminPendingOrderWarning:
      "يوجد طلب دفع قيد الانتظار مرتبط بهذه الدعوة — سيبقى الطلب في السجلات لكن بدون ربط بالدعوة.",
  },
  en: {
    title: "Delete Invitation?",
    body: (names: string) =>
      `This will permanently delete the invitation for ${names}. This action cannot be undone.`,
    pendingOrderWarning:
      "You have a pending payment order linked to this invitation — deleting it now means our team won't be able to review it or confirm the payment later.",
    delete: "Delete",
    cancel: "Cancel",
    adminBody:
      "The invitation and everything tied to it will be permanently deleted: RSVPs, photos, stored files and QR check-in data. This cannot be undone.",
    adminPendingOrderWarning:
      "A payment order is still pending for this invitation — it stays in the records but is detached from the invitation.",
  },
};

export function DeleteConfirmDialog({
  open,
  names,
  hasPendingOrder,
  language,
  adminMode = false,
  onConfirm,
  onCancel,
}: {
  adminMode?: boolean;
  open: boolean;
  names: string;
  hasPendingOrder?: boolean;
  language: "ar" | "en";
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
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4"
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
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
              <TrashIcon className="size-6 text-red-700 dark:text-red-400" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">{t.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-body-foreground">{t.body(names)}</p>
            {adminMode && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.adminBody}</p>}
            {hasPendingOrder && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-start dark:bg-amber-950/50">
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">{adminMode ? t.adminPendingOrderWarning : t.pendingOrderWarning}</p>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-body-foreground transition-colors hover:bg-background/10"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                {t.delete}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
