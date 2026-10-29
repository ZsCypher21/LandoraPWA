"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { navFor, type NavItem } from "@/lib/roles";
import { useBuyerState } from "@/lib/storage";
import { useRole } from "./RoleContext";

const ICONS: Record<NavItem["icon"], ReactNode> = {
  search: <path d="M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />,
  saved: <path d="M12 20.3 10.6 19C5.4 14.4 2 11.3 2 7.5 2 4.4 4.4 2 7.5 2c1.7 0 3.4.8 4.5 2.1A6 6 0 0 1 16.5 2C19.6 2 22 4.4 22 7.5c0 3.8-3.4 6.9-8.6 11.5z" />,
  inspections: <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm-2 8h14v10H5zm2 2v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2z" />,
  "first-home": <path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z" />,
  account: <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z" />,
  console: <path d="M9 3a2 2 0 0 0-2 2v1H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3V5a2 2 0 0 0-2-2zm0 2h6v1H9zM4 12h16v7H4z" />,
  admin: <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5zm-1 13-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4z" />,
  hub: <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 13c-3.9 0-7 1.8-7 4v3h14v-3c0-2.2-3.1-4-7-4zm8 0c-.5 0-1 0-1.4.1 1.5 1 2.4 2.3 2.4 3.9v3h4v-3c0-2.2-2.2-4-5-4z" />,
};

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

function Count({ n, className }: { n: number; className: string }) {
  if (n === 0) return null;
  return (
    <span className={`rounded-full bg-sun-400 text-[11px] font-bold leading-none text-ink ${className}`}>
      {n}
      <span className="sr-only"> saved</span>
    </span>
  );
}

/** Top navigation for tablet and desktop. */
export function NavLinks() {
  const isActive = useActive();
  const count = useBuyerState()?.shortlist.length ?? 0;
  const links = navFor(useRole().role);
  return (
    <nav aria-label="Main" className="hidden sm:block">
      <ul className="flex items-center gap-1 text-sm">
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 font-medium transition ${
                  active ? "bg-brand-700 text-white shadow-sm" : "text-muted hover:bg-brand-50 hover:text-brand-800"
                }`}
              >
                {l.label}
                {l.href === "/shortlist" && <Count n={count} className="px-1.5 py-1" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** App-style tab bar for phones, where it's in thumb reach. */
export function BottomNav() {
  const isActive = useActive();
  const count = useBuyerState()?.shortlist.length ?? 0;
  const links = navFor(useRole().role);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-brand-700" : "text-muted"}`}
              >
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${active ? "bg-brand-100" : ""}`}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    {ICONS[l.icon]}
                  </svg>
                </span>
                {l.short}
                {l.href === "/shortlist" && <Count n={count} className="absolute left-1/2 top-1 ml-2 px-1.5 py-0.5" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
