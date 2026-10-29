"use client";

import Link from "next/link";
import { useState } from "react";
import { CONSENT_PURPOSES, deleteDeviceData, setConsent, useConsent, type ConsentPurpose } from "@/lib/consent";
import { longDate } from "@/lib/format";
import { useBuyerState } from "@/lib/storage";

const PURPOSES: Record<ConsentPurpose, { title: string; body: string }> = {
  analytics: {
    title: "Product analytics",
    body: "Anonymous usage events (searches, saves, inspection plans) that tell us what to improve. Never sold, never shared with agents.",
  },
  concierge_memory: {
    title: "Concierge memory",
    body: "Let the concierge remember your preferences between visits. Nothing is remembered yet; this arrives with FR-AI-004.",
  },
  agent_sharing: {
    title: "Share my details with agents",
    body: "Agents see your name and contact details only for listings you ask about. Off unless you turn it on (FR-AGT-004).",
  },
};

function Toggle({ purpose }: { purpose: ConsentPurpose }) {
  const consent = useConsent();
  const [failed, setFailed] = useState(false);
  const choice = consent?.[purpose];
  const id = `consent-${purpose}`;
  return (
    <li className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <label htmlFor={id} className="font-semibold">
          {PURPOSES[purpose].title}
        </label>
        <p id={`${id}-desc`} className="mt-0.5 text-sm text-muted">
          {PURPOSES[purpose].body}
        </p>
        <p className="mt-1 text-xs text-muted">
          {choice?.updatedAt ? `You changed this on ${longDate(choice.updatedAt)}.` : "Default setting. You haven't changed this."}
        </p>
        {failed && (
          <p role="alert" className="mt-1 text-xs text-bad-700">
            Couldn't save this choice on this device. Check that site storage is allowed.
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={choice?.granted ?? false}
        aria-describedby={`${id}-desc`}
        disabled={!choice}
        onClick={() => choice && setFailed(!setConsent(purpose, !choice.granted))}
        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${choice?.granted ? "bg-brand-600" : "bg-line"}`}
      >
        <span className="sr-only">{choice?.granted ? "On" : "Off"}</span>
        <span aria-hidden="true" className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${choice?.granted ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </li>
  );
}

function DeleteData() {
  const [step, setStep] = useState<"idle" | "confirm" | "done" | "failed">("idle");
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="delete-title">
      <h2 id="delete-title" className="text-lg font-bold">
        Delete my data
      </h2>
      <p className="mt-1 text-sm text-muted">Removes your saved homes, inspection plan and notes, and privacy choices.</p>
      {step === "idle" && (
        <button type="button" onClick={() => setStep("confirm")} className="btn btn-secondary mt-4 text-bad-700">
          Delete my data
        </button>
      )}
      {step === "confirm" && (
        <div role="alertdialog" aria-labelledby="delete-confirm" className="mt-4 rounded-xl bg-bad-50 p-4">
          <p id="delete-confirm" className="text-sm font-semibold text-bad-700">
            This can't be undone. Delete everything Landora keeps about you on this device?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setStep(deleteDeviceData() ? "done" : "failed")} className="btn bg-bad-700 text-white hover:bg-bad-700/90">
              Yes, delete my data
            </button>
            <button type="button" onClick={() => setStep("idle")} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
      <p role="status" className="mt-3 text-sm">
        {step === "done" && "Done. Your data on this device has been deleted."}
        {step === "failed" && <span className="text-bad-700">Couldn't delete: this browser blocked site storage. Clear site data in your browser settings instead.</span>}
      </p>
      <p className="mt-2 text-xs text-muted">
        Prototype: data lives only on this device. With real accounts this also deletes your server records, under the retention rules in the privacy impact assessment.
      </p>
    </section>
  );
}

export function AccountView({ name, email }: { name: string; email: string }) {
  const state = useBuyerState();
  const saved = state?.shortlist.length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header>
        <p className="eyebrow">Your account</p>
        <h1 className="mt-1 text-3xl font-extrabold">{name}</h1>
        <p className="mt-1 text-muted">{email}</p>
        <p className="mt-2 text-xs text-muted">Sample buyer for the prototype. Sign-in, email verification and account recovery arrive with real accounts (FR-ACC-001).</p>
      </header>

      <section className="card flex items-center justify-between gap-4 p-5 sm:p-6" aria-labelledby="saved-title">
        <div>
          <h2 id="saved-title" className="text-lg font-bold">
            Saved homes
          </h2>
          <p className="mt-0.5 text-sm text-muted" aria-live="polite">
            {saved === undefined ? "Loading…" : saved === 0 ? "None yet. Tap the heart on any home to save it." : `${saved} saved on this device`}
          </p>
        </div>
        <Link href={saved ? "/shortlist" : "/search"} className="btn btn-secondary shrink-0">
          {saved ? "View saved" : "Start searching"}
        </Link>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="privacy-title">
        <h2 id="privacy-title" className="text-lg font-bold">
          Privacy choices
        </h2>
        <p className="mt-1 text-sm text-muted">Each choice covers one purpose. Changing one doesn't affect the others.</p>
        <ul className="mt-2 divide-y divide-line">
          {CONSENT_PURPOSES.map((p) => (
            <Toggle key={p} purpose={p} />
          ))}
        </ul>
      </section>

      <DeleteData />

      <p className="text-center text-xs text-muted">Landora has no public profiles yet. Profiles and follows are planned for a later release (FR-SOC-001, P1).</p>
    </div>
  );
}
