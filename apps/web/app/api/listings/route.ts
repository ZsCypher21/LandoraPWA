import { NextResponse } from "next/server";
import { listingById, toSummary } from "@/lib/data";

// Returns published listing summaries by id, for the shortlist and timeline screens.
export function GET(request: Request): NextResponse {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-f-]{36}$/.test(s))
    .slice(0, 50);
  const listings = ids.flatMap((id) => {
    const l = listingById(id);
    return l ? [toSummary(l)] : [];
  });
  // Ids that are no longer published (sold, withdrawn, blocked) are reported so the UI can explain.
  const missing = ids.filter((id) => !listings.some((l) => l.id === id));
  return NextResponse.json({ listings, missing });
}
