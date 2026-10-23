import { parseWallClockDate } from "@/lib/format";

// "Save the date" helpers shared by the invitation's calendar card and the
// /calendar-event route.
//
// The invitation's event time is a *wall-clock* reading (see
// parseWallClockDate): "7:00 PM" means 7 PM wherever the guest is. So the
// calendar event is emitted as a *floating* local time -- no "Z", no TZID --
// which every calendar app places at 7 PM on the guest's own clock, the same
// time the invitation shows. (The previous version emitted the wall-clock
// digits tagged as UTC, which shifted the event by the guest's UTC offset.)

const DEFAULT_EVENT_DURATION_MS = 3 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYYMMDDTHHMMSS" from the wall-clock digits of a Date (local getters). */
function floatingStamp(date: Date) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  );
}

export interface CalendarEventInput {
  startIso: string;
  endIso?: string | null;
  title: string;
  location?: string | null;
}

export interface CalendarEventStamps {
  start: string;
  end: string;
  title: string;
  location: string;
}

export function toEventStamps(input: CalendarEventInput): CalendarEventStamps | null {
  const start = parseWallClockDate(input.startIso);
  if (Number.isNaN(start.getTime())) return null;
  let end = input.endIso ? parseWallClockDate(input.endIso) : new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);
  if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);
  }
  return {
    start: floatingStamp(start),
    end: floatingStamp(end),
    title: input.title,
    location: input.location ?? "",
  };
}

/** Where the "save the date" button sends the guest. */
export function calendarEventUrl(stamps: CalendarEventStamps, userAgent: string): string {
  // Chrome on Android refuses to navigate to a data: URL, and doesn't open a
  // downloaded .ics by itself -- Google Calendar's own "add event" link is the
  // one thing that reliably lands on a pre-filled event with a Save button.
  if (/android/i.test(userAgent)) {
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: stamps.title,
      dates: `${stamps.start}/${stamps.end}`,
    });
    if (stamps.location) params.set("location", stamps.location);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
  // iPhone/desktop: a real https URL served as text/calendar, which iOS Safari
  // hands to Calendar's "Add Event" sheet (a blob:/data: URL doesn't work
  // reliably there) and desktop browsers download.
  const params = new URLSearchParams({ s: stamps.start, e: stamps.end, t: stamps.title });
  if (stamps.location) params.set("l", stamps.location);
  return `/calendar-event?${params.toString()}`;
}
