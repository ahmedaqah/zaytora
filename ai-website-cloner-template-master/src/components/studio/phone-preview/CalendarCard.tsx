"use client";

import { motion } from "framer-motion";
import { CalendarIcon } from "@/components/icons";
import { calendarEventUrl, toEventStamps } from "@/lib/calendarEvent";

// A "physical desk calendar" widget — still reads as an object sitting on
// the page rather than a themed glass panel like the other sections, but its
// ribbon/card/button colors now come from the same --tpl-* custom properties
// InvitationCanvas's resolveCanvasTheme() sets on the canvas root (cascading
// through the DOM, no props needed here), instead of a fixed cream/sage
// palette baked in regardless of the active template. Two small ring/pin
// notches poke above its top edge to sell the torn-calendar-page metaphor,
// plus a "save the date" button that adds the event to the guest's calendar.
export function CalendarCard({
  month,
  day,
  weekday,
  time,
  eventIso,
  endEventIso,
  eventTitle,
  venueName,
  saveDateLabel,
  untitledEventLabel,
}: {
  month: string;
  day: string;
  weekday: string;
  time: string | null;
  // Feeds the "احفظ الموعد" download — omitted (button hidden) when there's
  // no valid event date to save.
  eventIso: string | null;
  // Set on a "from - to" invitation — the saved .ics event ends at this real
  // time instead of the fixed default duration.
  endEventIso?: string | null;
  eventTitle?: string | null;
  venueName?: string | null;
  // Both localized by the caller (InvitationCanvas's CANVAS_LABELS) — this
  // component has no `language` of its own to key off.
  saveDateLabel: string;
  untitledEventLabel: string;
}) {
  function handleSaveDate() {
    if (!eventIso) return;
    const stamps = toEventStamps({
      startIso: eventIso,
      endIso: endEventIso,
      title: eventTitle || untitledEventLabel,
      location: venueName,
    });
    if (!stamps) return;
    // Android -> Google Calendar's pre-filled "add event" page; iPhone/desktop
    // -> an https text/calendar URL (see lib/calendarEvent.ts).
    window.location.href = calendarEventUrl(stamps, navigator.userAgent);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center gap-4"
    >
      <div className="relative w-40">
        <span
          aria-hidden
          className="absolute -top-3 start-6 size-6 rounded-full border-4 border-[var(--tpl-card-border)] bg-[var(--tpl-page-bg-solid)] shadow-inner"
        />
        <span
          aria-hidden
          className="absolute -top-3 end-6 size-6 rounded-full border-4 border-[var(--tpl-card-border)] bg-[var(--tpl-page-bg-solid)] shadow-inner"
        />
        <div className="overflow-hidden rounded-[24px] border border-[var(--tpl-card-border)] bg-[var(--tpl-card-bg)] shadow-[0_12px_32px_var(--tpl-card-shadow),inset_0_1px_0_var(--tpl-card-highlight)] backdrop-blur-lg">
          <div className="bg-[var(--tpl-accent)] px-3 py-2 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white">{month}</p>
          </div>
          <div className="flex flex-col items-center gap-1 px-3 py-5">
            <p className="font-cinzel text-6xl leading-none text-[var(--tpl-text-strong)] [text-shadow:var(--tpl-text-shadow)]">{day}</p>
            <div className="my-3 h-px w-12 bg-[var(--tpl-card-border)]" aria-hidden />
            <p className="text-xs font-medium text-[var(--tpl-text-muted)] [text-shadow:var(--tpl-text-shadow)]">{weekday}</p>
            {time && <p className="mt-2 text-[11px] tracking-wide text-[var(--tpl-accent)]">{time}</p>}
          </div>
        </div>
      </div>

      {eventIso && (
        <button
          type="button"
          onClick={handleSaveDate}
          className="flex items-center gap-1.5 rounded-full border border-[var(--tpl-accent-30)] bg-[var(--tpl-chip-bg)] px-5 py-2 text-[11px] font-medium text-[var(--tpl-accent)] backdrop-blur-md transition-colors active:scale-95 hover:opacity-90"
        >
          <CalendarIcon className="size-3.5" />
          {saveDateLabel}
        </button>
      )}
    </motion.div>
  );
}
