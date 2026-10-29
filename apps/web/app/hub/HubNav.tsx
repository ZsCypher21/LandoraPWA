"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { can } from "@/lib/roles";
import { useRole } from "@/components/RoleContext";

/** Sub-navigation inside the hub. Tabs a role can't use are left out. */
export function HubNav({ moderationCount }: { moderationCount: number }) {
  const pathname = usePathname();
  const { role } = useRole();
  const isMod = can(role, "moderation.decide");
  const tabs = [
    { href: "/hub", label: "Hub", show: true },
    { href: "/hub/questions", label: isMod ? "Moderation" : can(role, "qa.answer") ? "Questions to answer" : "Your questions", show: role !== "guest" },
    { href: "/hub/following", label: "Following", show: can(role, "social.follow") },
    { href: "/hub/profile", label: "Profile", show: can(role, "social.profile") },
  ].filter((t) => t.show);
  return (
    <nav aria-label="Hub" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 text-sm">
        {tabs.map((t) => {
          // Suburb hubs and professional profiles sit under the "Hub" tab.
          const active = t.href === "/hub" ? !tabs.some((x) => x.href !== "/hub" && pathname.startsWith(x.href)) : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 font-medium ring-1 transition ${active ? "bg-ink text-white ring-ink" : "bg-surface text-ink ring-line hover:ring-brand-600"}`}
              >
                {t.label}
                {isMod && t.href === "/hub/questions" && moderationCount > 0 && (
                  <span className="rounded-full bg-sun-400 px-1.5 py-0.5 text-[11px] font-bold leading-none text-ink">
                    {moderationCount}
                    <span className="sr-only"> waiting</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
