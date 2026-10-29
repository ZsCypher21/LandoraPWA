"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { aud, longDate } from "@/lib/format";
import { checkEntitlements, type CheckState, type ProgramResult } from "./actions";
import { HOME_KINDS, REGIONS, YES_NO_QUESTIONS } from "./questions";

const STATUS_STYLE: Record<ProgramResult["status"], { label: string; className: string }> = {
  eligible: { label: "Likely eligible", className: "bg-brand-50 text-brand-700" },
  not_eligible: { label: "Not eligible on these answers", className: "bg-canvas text-muted" },
  needs_info: { label: "Need more information", className: "bg-warn-50 text-warn-700" },
};

function ProgramCard({ p }: { p: ProgramResult }) {
  const s = STATUS_STYLE[p.status];
  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-bold">{p.title}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.className}`}>{s.label}</span>
      </div>
      {p.status === "eligible" && (
        <p className="mt-2 text-sm">
          {p.amountAud !== null && p.amountAud > 0 && <strong>{aud(p.amountAud)}. </strong>}
          {p.amountAud === 0 ? "No reduction applies at this price." : p.benefit}
        </p>
      )}
      {p.status === "not_eligible" && p.reason && <p className="mt-2 text-sm text-muted">{p.reason}</p>}
      {p.status === "needs_info" && (
        <p className="mt-2 text-sm">
          To check this, we still need: {p.needs.join("; ")}.
        </p>
      )}
      {p.assumptions.length > 0 && (
        <details className="mt-2 text-xs text-muted">
          <summary className="cursor-pointer">Assumptions and limits</summary>
          <ul className="ml-4 mt-1 list-disc">
            {p.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-2 text-xs text-muted">
        Source:{" "}
        {p.sources.map((src, i) => (
          <span key={src.title}>
            {i > 0 && "; "}
            {src.url ? (
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline">
                {src.title}
              </a>
            ) : (
              src.title
            )}{" "}
            (checked {longDate(src.retrievedOn)})
          </span>
        ))}
      </p>
    </li>
  );
}

function YesNo({ name, label, help }: { name: string; label: string; help?: string }) {
  return (
    <fieldset className="flex flex-col gap-2 border-t border-line pt-4">
      <legend className="text-sm font-semibold">{label}</legend>
      {help && <p className="text-xs text-muted">{help}</p>}
      <div className="flex gap-2">
        {[
          ["yes", "Yes"],
          ["no", "No"],
          ["unsure", "Not sure"],
        ].map(([v, l]) => (
          <label key={v} className="flex-1">
            <input type="radio" name={name} value={v} className="peer sr-only" />
            <span className="block cursor-pointer rounded-full border border-line bg-canvas/60 px-2 py-2 text-center text-sm font-medium text-muted transition hover:border-brand-300 hover:text-ink peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-brand-600">
              {l}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FhbCheck() {
  const [state, action, pending] = useActionState<CheckState, FormData>(checkEntitlements, { kind: "idle" });

  return (
    <div className="flex flex-col gap-6">
      <form
        action={action}
        onSubmit={(e) => {
          // React resets uncontrolled forms after an action; submitting manually keeps the answers on screen.
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
        className="card flex flex-col gap-5 p-5 sm:p-7"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">What are you planning to buy?</span>
          <select name="homeKind" defaultValue="" className="field">
            <option value="">Choose one</option>
            {HOME_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Where?</span>
          <select name="region" defaultValue="qld_capital_or_regional_centre" className="field">
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Expected price ($)</span>
            <input name="value" type="number" inputMode="numeric" min={10000} step={5000} placeholder="e.g. 650000" className="field" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Deposit (% of price)</span>
            <input name="deposit" type="number" inputMode="decimal" min={0} max={100} step={0.5} placeholder="e.g. 5" className="field" />
          </label>
        </div>
        {YES_NO_QUESTIONS.map((q) => (
          <YesNo key={q.fact} name={q.fact} label={q.label} {...(q.help ? { help: q.help } : {})} />
        ))}
        <button type="submit" disabled={pending} className="btn btn-primary min-h-12 text-base">
          {pending ? "Checking…" : "Check what I could get"}
        </button>
        <p className="text-xs text-muted">You can leave questions blank. We'll tell you what's missing rather than guess.</p>
      </form>

      <div aria-live="polite">
        {state.kind === "invalid" && (
          <ul role="alert" className="rounded-xl bg-bad-50 p-3 text-sm text-bad-700">
            {[...new Set(state.errors)].map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {state.kind === "error" && (
          <p role="alert" className="rounded-xl bg-bad-50 p-3 text-sm text-bad-700">
            We couldn't run the check just now. Please try again. Official tools: Queensland Revenue Office and Housing Australia.
          </p>
        )}
        {state.kind === "result" && (
          <section className="flex flex-col gap-3" aria-labelledby="results">
            <h2 id="results" className="text-xl font-bold">
              Your results
            </h2>
            <ul className="flex flex-col gap-3">
              {state.programs.map((p) => (
                <ProgramCard key={p.id} p={p} />
              ))}
            </ul>
            <p className="rounded-xl bg-warn-50 p-3 text-xs text-warn-700">
              {state.disclaimer} Rules version {state.packVersion} ({state.packStatus}), in effect from {longDate(state.effectiveFrom)}, checked as at {longDate(state.asOf)}.
            </p>
            {state.budgetAud !== null && (
              <Link href={`/search?max=${state.budgetAud}`} className="btn btn-primary self-start">
                See homes up to {aud(state.budgetAud)}
              </Link>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
