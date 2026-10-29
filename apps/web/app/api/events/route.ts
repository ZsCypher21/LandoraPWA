import { parseEvent } from "@landora/analytics";
import { NextResponse } from "next/server";

// Validates analytics events against the §12.8 catalogue. The prototype logs accepted events; the build
// semester writes them to the analytics_event table that feeds the launch KPI views.

const MAX_BYTES = 8_192;

export async function POST(request: Request): Promise<NextResponse> {
  const text = await request.text().catch(() => "");
  if (text.length === 0 || text.length > MAX_BYTES) {
    return NextResponse.json({ ok: false, errors: ["Empty or oversized event"] }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, errors: ["Body is not JSON"] }, { status: 400 });
  }
  const result = parseEvent(body);
  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(`[analytics] ${result.event.name}`, JSON.stringify(result.event.properties));
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
