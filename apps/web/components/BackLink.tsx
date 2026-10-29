"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// A listing's back link returns buyers to the list they came from (their exact search results,
// saved homes or inspections), not a blank search. Remembered for this tab only; storage can be
// unavailable, so the link falls back to /search.

const KEY = "landora.backPath";
const LABELS = { "/search": "Back to results", "/shortlist": "Back to saved homes", "/inspections": "Back to inspections" } as const;
type ListPath = keyof typeof LABELS;

function isListPath(path: string): path is ListPath {
  return path in LABELS;
}

/** Rendered on pages that list listings: remembers the current URL as the way back. */
export function RememberBackPath() {
  const pathname = usePathname();
  const params = useSearchParams().toString();
  useEffect(() => {
    try {
      window.sessionStorage.setItem(KEY, params ? `${pathname}?${params}` : pathname);
    } catch {
      // Storage blocked: the back link just goes to search.
    }
  }, [pathname, params]);
  return null;
}

export function BackLink() {
  const [back, setBack] = useState<{ href: string; label: string }>({ href: "/search", label: "Back to search" });
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(KEY);
      const path = saved?.split("?")[0] ?? "";
      if (saved && isListPath(path)) setBack({ href: saved, label: LABELS[path] });
    } catch {
      // Keep the default.
    }
  }, []);
  return (
    <Link href={back.href} className="group inline-flex w-fit items-center gap-1.5 rounded-full py-1 pr-2 text-sm font-medium text-muted hover:text-ink">
      <svg viewBox="0 0 24 24" className="h-4 w-4 transition group-hover:-translate-x-0.5" fill="currentColor" aria-hidden="true">
        <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z" />
      </svg>
      {back.label}
    </Link>
  );
}
