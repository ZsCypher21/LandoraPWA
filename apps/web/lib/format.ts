const TZ = "Australia/Brisbane";

export function aud(n: number): string {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: TZ });
}

export function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
}

export function longDate(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T00:00:00+10:00` : iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
}

export function priceLabel(l: { listingType: string; priceDisplay: string | null; rentPerWeekAud: number | null }): string {
  if (l.listingType === "rent") return l.rentPerWeekAud !== null ? `${aud(l.rentPerWeekAud)} per week` : "Rent on application";
  return l.priceDisplay ?? "Contact agent";
}

export function featureLabel(f: string): string {
  const s = f.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function typeLabel(t: string): string {
  return t === "off_the_plan" ? "Off the plan" : featureLabel(t);
}

/** Feed timestamps carry no offset; REAXML feeds here are in Queensland time (UTC+10, no daylight saving). */
export function feedStamp(local: string): string {
  return stamp(`${local}+10:00`);
}

/** Date and time in Queensland, for audit entries and feed runs. */
export function stamp(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ });
}
