"use client";

import { ROLES, ROLE_LABELS, isRole } from "@/lib/roles";
import { useRole } from "./RoleContext";

/** PROTOTYPE ONLY: replaces sign-in so reviewers can see each role (ADR 0011). */
export function RoleSwitcher() {
  const { role, switching, switchTo } = useRole();
  return (
    <div className="flex h-9 items-center rounded-full border border-dashed border-warn-700/45 bg-warn-50 text-warn-700">
      <span className="hidden h-full items-center gap-1.5 border-r border-dashed border-warn-700/35 pl-3 pr-2.5 text-[11px] font-bold uppercase tracking-wide md:flex" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M9 2v2h1v5.4L4.3 19A2 2 0 0 0 6 22h12a2 2 0 0 0 1.7-3L14 9.4V4h1V2zm3 2v6l2.3 4H9.7L12 10z" />
        </svg>
        Prototype
      </span>
      <label htmlFor="viewing-as" className="hidden pl-2.5 text-xs font-medium text-warn-700/80 lg:inline">
        Viewing as
      </label>
      <span className="relative">
        <select
          id="viewing-as"
          value={role}
          disabled={switching}
          aria-describedby="viewing-as-note"
          onChange={(e) => isRole(e.target.value) && switchTo(e.target.value)}
          className="h-9 appearance-none rounded-full bg-transparent py-0 pl-3 pr-8 text-sm font-semibold text-warn-700 disabled:opacity-60 lg:pl-1.5"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2" fill="currentColor" aria-hidden="true">
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
        </svg>
      </span>
      <span id="viewing-as-note" className="sr-only">
        Prototype only. Switching role stands in for signing in; it is not real authentication.
      </span>
      <span role="status" className="sr-only">
        {switching ? "Switching role" : ""}
      </span>
    </div>
  );
}
