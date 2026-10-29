import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_REALM, decideGate } from "@/lib/preview-gate";

// Every response from the hosted preview stays out of search engines, including the 401 page.
const NOINDEX = "noindex, nofollow, noarchive";

export function proxy(request: NextRequest): NextResponse {
  const decision = decideGate(
    {
      password: process.env.PREVIEW_PASSWORD,
      user: process.env.PREVIEW_USER,
      hosted: process.env.VERCEL === "1",
    },
    request.headers.get("authorization"),
  );

  if (decision.kind === "allow") {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", NOINDEX);
    return response;
  }

  if (decision.kind === "misconfigured") {
    // Fail closed: a hosted copy without a password must not serve the prototype.
    return new NextResponse("This preview is not configured yet.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": NOINDEX, "Cache-Control": "no-store" },
    });
  }

  return new NextResponse("Sign-in required to view the Landora client preview.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${PREVIEW_REALM}", charset="UTF-8"`,
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": NOINDEX,
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  // Static build assets carry no prototype data. The manifest and icon are fetched without credentials.
  matcher: ["/((?!_next/static|_next/image|manifest.webmanifest|icon.svg).*)"],
};
