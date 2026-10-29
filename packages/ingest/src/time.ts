// Converts feed-local wall-clock times to ISO 8601 with the correct offset for the feed's time zone.
// QLD has no daylight saving; NSW does, so offsets are computed per instant rather than hard-coded.

export type FeedTimeZone = "Australia/Brisbane" | "Australia/Sydney";

function offsetMinutes(utcMs: number, timeZone: FeedTimeZone): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - utcMs) / 60000);
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** Returns an ISO string, or null if the components do not form a real date and time. */
export function localToIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: FeedTimeZone,
): string | null {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(naiveUtc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    return null;
  }
  // Two passes handle instants near a daylight-saving change.
  let offset = offsetMinutes(naiveUtc, timeZone);
  offset = offsetMinutes(naiveUtc - offset * 60000, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}${formatOffset(offset)}`;
}

/** Parses REAXML modTime and auction dates: "YYYY-MM-DD-HH:MM[:SS]", "YYYY-MM-DDTHH:MM[:SS]" or with an explicit offset. */
export function parseFeedDateTime(value: string, timeZone: FeedTimeZone): string | null {
  const trimmed = value.trim();
  const withOffset = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)(Z|[+-]\d{2}:\d{2})$/.exec(trimmed);
  if (withOffset) {
    const ms = Date.parse(trimmed);
    return Number.isNaN(ms) ? null : trimmed;
  }
  const local = /^(\d{4})-(\d{2})-(\d{2})(?:[-T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(trimmed);
  if (!local) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = local;
  return localToIso(Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(s), timeZone);
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function to24h(hour: number, minute: number, meridiem: string): [number, number] | null {
  if (hour < 1 || hour > 12 || minute > 59) return null;
  const pm = meridiem.toLowerCase() === "pm";
  return [(hour % 12) + (pm ? 12 : 0), minute];
}

/** Parses inspection text like "21-Dec-2026 11:00am to 11:30am". */
export function parseInspection(text: string, timeZone: FeedTimeZone): { startsAt: string; endsAt: string } | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)\s+to\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(text.trim());
  if (!m) return null;
  const [, d, mon, y, sh, sm, sap, eh, em, eap] = m as unknown as string[];
  const month = MONTHS[(mon as string).toLowerCase()];
  const start = to24h(Number(sh), Number(sm), sap as string);
  const end = to24h(Number(eh), Number(em), eap as string);
  if (!month || !start || !end) return null;
  const startsAt = localToIso(Number(y), month, Number(d), start[0], start[1], 0, timeZone);
  const endsAt = localToIso(Number(y), month, Number(d), end[0], end[1], 0, timeZone);
  if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) return null;
  return { startsAt, endsAt };
}
