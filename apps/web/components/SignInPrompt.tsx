"use client";

import { useRole } from "./RoleContext";

/** Asks a guest to sign in. In the prototype, "signing in" switches the Viewing as menu to Buyer. */
export function SignInPrompt({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  const { switching, switchTo } = useRole();
  const button = (
    <button type="button" onClick={() => switchTo("buyer")} disabled={switching} className="btn btn-primary disabled:opacity-60">
      {switching ? "Signing in…" : "Sign in"}
    </button>
  );

  if (compact) {
    return (
      <div role="dialog" aria-label={title} className="card mt-2 flex max-w-xs flex-col gap-2 p-3 text-left text-sm">
        <p className="font-semibold">{title}</p>
        <p className="text-muted">{body}</p>
        {button}
        <p className="text-xs text-muted">Prototype: this switches “Viewing as” to Buyer. There is no real sign-in yet.</p>
      </div>
    );
  }

  return (
    <section className="card mx-auto flex max-w-lg flex-col items-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z" />
        </svg>
      </span>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted">{body}</p>
      {button}
      <p className="text-xs text-muted">Prototype: “Sign in” switches the Viewing as menu to Buyer. Real accounts arrive with FR-ACC-001.</p>
    </section>
  );
}
