// Serves a one-event .ics for the invitation's "احفظ الموعد" button. Served
// over https as text/calendar so iOS Safari opens its native "Add Event" sheet
// (see lib/calendarEvent.ts for why a data:/blob: URL isn't used).

const STAMP = /^\d{8}T\d{6}$/;

// RFC 5545 TEXT escaping.
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function utcStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("s") ?? "";
  const end = searchParams.get("e") ?? "";
  if (!STAMP.test(start) || !STAMP.test(end)) {
    return new Response("Bad request", { status: 400 });
  }
  const title = (searchParams.get("t") ?? "").slice(0, 200) || "Invitation";
  const location = (searchParams.get("l") ?? "").slice(0, 300);

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZAYTORA//Invitation//AR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${start}-${Math.abs(hash(title))}@zaytorainvites.com`,
    `DTSTAMP:${utcStamp(new Date())}`,
    // Floating local time: no "Z" and no TZID.
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(title)}`,
    location ? `LOCATION:${escapeText(location)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new Response(body + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="invitation.ics"',
      "Cache-Control": "no-store",
    },
  });
}

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  return h;
}
