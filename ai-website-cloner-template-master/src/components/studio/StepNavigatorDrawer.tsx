"use client";

import type { ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckIcon, XIcon } from "@/components/icons";

export interface StepNavigatorItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const COPY = {
  ar: { title: "الانتقال إلى مرحلة", close: "إغلاق" },
  en: { title: "Jump to a stage", close: "Close" },
};

// Lets a guest jump straight to any of the wizard's 5 stages instead of
// clicking "Next"/"Back" one at a time — opened from the "3 / 5" pill in
// StudioWizard's header. Stages before the current one are marked done
// (checkmark), the current one is highlighted, later ones read as plain
// upcoming stops — all purely visual, every stage stays clickable regardless
// of position since nothing here is actually gated/required in order.
export function StepNavigatorDrawer({
  steps,
  currentIndex,
  language,
  onSelect,
  onClose,
}: {
  steps: StepNavigatorItem[];
  currentIndex: number;
  language: "ar" | "en";
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const t = COPY[language] ?? COPY.ar;

  return (
    <AnimatePresence>
      <motion.button
        key="step-nav-backdrop"
        type="button"
        aria-label={t.close}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40 bg-black/30"
      />
      <motion.div
        key="step-nav-panel"
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 340 }}
        className="fixed inset-x-4 top-20 z-50 mx-auto flex max-h-[70vh] max-w-md flex-col overflow-hidden rounded-2xl border border-gold/20 bg-card shadow-[0_16px_48px_rgba(0,0,0,0.4)] sm:inset-x-auto"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/10"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCurrent = index === currentIndex;
            const isDone = index < currentIndex;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(index);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors",
                    isCurrent ? "bg-gold/10" : "hover:bg-background/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      isCurrent
                        ? "bg-gold text-white"
                        : isDone
                          ? "bg-gold/15 text-gold"
                          : "bg-background/10 text-muted-foreground"
                    )}
                  >
                    {isDone ? <CheckIcon className="size-3.5" /> : index + 1}
                  </span>
                  <StepIcon className={cn("size-4 shrink-0", isCurrent ? "text-gold" : "text-muted-foreground")} />
                  <span className={cn("truncate text-sm", isCurrent ? "font-medium text-foreground" : "text-body-foreground")}>
                    {step.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}
