import Link from "next/link";
import { ROLE_LABELS, homeFor, type Role } from "@/lib/roles";

/** Shown when a signed-in role opens another role's page (FR-ACC-002). The real product returns 403. */
export function AccessDenied({ role, allowedRoles }: { role: Role; allowedRoles: readonly Role[] }) {
  const home = homeFor(role);
  return (
    <section className="card mx-auto flex max-w-lg flex-col items-center gap-3 p-8 text-center" aria-labelledby="denied-title">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bad-50 text-bad-700" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3z" />
        </svg>
      </span>
      <h1 id="denied-title" className="text-2xl font-bold">
        Access denied
      </h1>
      <p className="text-muted">
        This page is for {allowedRoles.map((r) => ROLE_LABELS[r]).join(" and ")} accounts. You are viewing as {ROLE_LABELS[role]}.
      </p>
      <Link href={home.href} className="btn btn-primary">
        {home.label}
      </Link>
      <p className="text-xs text-muted">Prototype: switch role with “Viewing as” in the header. In production this is a 403 and the attempt is logged.</p>
    </section>
  );
}
