"use client";

import { useState } from "react";
import { track } from "@/lib/analytics-client";
import { can } from "@/lib/roles";
import { updateBuyerState, useBuyerState } from "@/lib/storage";
import { useRole } from "./RoleContext";
import { SignInPrompt } from "./SignInPrompt";

type Variant = "button" | "overlay";

export function SaveButton({ listingId, suburbId, surface, variant = "button" }: { listingId: string; suburbId: string; surface: string; variant?: Variant }) {
  const { role } = useRole();
  const state = useBuyerState();
  const [error, setError] = useState(false);
  const [askSignIn, setAskSignIn] = useState(false);
  // Saving is a buyer action (FR-SAVE-001): guests are asked to sign in, other roles don't see it.
  if (role !== "guest" && !can(role, "buyer.save")) return null;
  const saved = role !== "guest" && (state?.shortlist.includes(listingId) ?? false);
  const prompt = askSignIn && role === "guest" && (
    <SignInPrompt compact title="Sign in to save homes" body="Saved homes follow you to every device once you have an account." />
  );

  function toggle() {
    if (role === "guest") {
      setAskSignIn((v) => !v);
      return;
    }
    const ok = updateBuyerState((s) => ({
      ...s,
      shortlist: saved ? s.shortlist.filter((id) => id !== listingId) : [...s.shortlist, listingId],
      timeline: saved ? s.timeline.filter((id) => id !== listingId) : s.timeline,
    }));
    setError(!ok);
    track(saved ? "listing_unsaved" : "listing_saved", { surface, listingId, suburbId, outcome: ok ? "success" : "failure", properties: { collectionId: null } });
  }

  const heart = (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M12 20.3 10.6 19C5.4 14.4 2 11.3 2 7.5 2 4.4 4.4 2 7.5 2c1.7 0 3.4.8 4.5 2.1A6 6 0 0 1 16.5 2C19.6 2 22 4.4 22 7.5c0 3.8-3.4 6.9-8.6 11.5z" />
    </svg>
  );

  if (variant === "overlay") {
    return (
      <span className="inline-flex flex-col items-end">
        <button
          type="button"
          onClick={toggle}
          disabled={state === null}
          aria-pressed={role === "guest" ? undefined : saved}
          aria-expanded={role === "guest" ? askSignIn : undefined}
          aria-label={saved ? "Saved" : "Save"}
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 transition hover:scale-105 disabled:opacity-50 ${
            saved ? "text-rose-600" : "text-ink"
          }`}
        >
          {heart}
        </button>
        {prompt}
        {error && (
          <span role="alert" className="mt-1 rounded bg-white px-1.5 text-xs text-bad-700">
            Couldn't save on this device
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={toggle}
        disabled={state === null}
        aria-pressed={role === "guest" ? undefined : saved}
        aria-expanded={role === "guest" ? askSignIn : undefined}
        className={`btn ${saved ? "btn-primary" : "btn-secondary"} disabled:opacity-50`}
      >
        {heart}
        {saved ? "Saved" : "Save"}
      </button>
      {prompt}
      {error && (
        <span role="alert" className="mt-1 text-xs text-bad-700">
          Couldn't save on this device. Check that site storage is allowed.
        </span>
      )}
    </span>
  );
}
