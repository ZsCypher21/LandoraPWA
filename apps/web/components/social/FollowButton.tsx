"use client";

import { useState, useTransition } from "react";
import { setFollowAction } from "@/app/hub/actions";
import { track } from "@/lib/analytics-client";
import { can } from "@/lib/roles";
import type { FollowKind } from "@/lib/social";
import { useRole } from "../RoleContext";
import { SignInPrompt } from "../SignInPrompt";

const NOUN: Record<FollowKind, string> = { suburb: "suburbs", listing: "homes", agent: "agents" };

/** Follow is always a deliberate tap (SOC-C1). Buyers only; guests are asked to sign in. */
export function FollowButton({ kind, targetId, following, label, suburbId }: { kind: FollowKind; targetId: string; following: boolean; label: string; suburbId?: string | undefined }) {
  const { role } = useRole();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [askSignIn, setAskSignIn] = useState(false);
  if (role !== "guest" && !can(role, "social.follow")) return null;

  function toggle() {
    if (role === "guest") {
      setAskSignIn((v) => !v);
      return;
    }
    start(async () => {
      const result = await setFollowAction(kind, targetId, !following);
      setError(result.ok ? null : result.error);
      if (result.ok && !following && kind !== "agent") {
        track(kind === "suburb" ? "suburb_followed" : "property_followed", { surface: "social_preview", listingId: kind === "listing" ? targetId : null, suburbId: suburbId ?? (kind === "suburb" ? targetId : null), outcome: "success", properties: {} });
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={role === "guest" ? undefined : following}
        aria-expanded={role === "guest" ? askSignIn : undefined}
        aria-label={`${following ? "Following" : "Follow"} ${label}`}
        className={`btn min-h-10 px-4 disabled:opacity-60 ${following ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100" : "btn-secondary"}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          {following ? <path d="m9 16.2-3.5-3.5L4 14.2l5 5 11-11-1.4-1.4z" /> : <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />}
        </svg>
        {pending ? "Saving…" : following ? "Following" : "Follow"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-bad-700">
          {error}
        </span>
      )}
      {askSignIn && role === "guest" && <SignInPrompt compact title={`Sign in to follow ${NOUN[kind]}`} body="You'll get updates in your hub feed. Following is private: agents can't see it." />}
    </span>
  );
}
