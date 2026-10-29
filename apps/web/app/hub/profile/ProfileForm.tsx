"use client";

import { useState, useTransition } from "react";
import type { Visibility } from "@/lib/social";
import { setProfileAction } from "../actions";

/** Private by default (SOC-P1). A public profile shows a display name and, if chosen, followed suburbs. */
export function ProfileForm(initial: { visibility: Visibility; showFollowedSuburbs: boolean }) {
  const [visibility, setVisibility] = useState(initial.visibility);
  const [showFollowedSuburbs, setShowFollowedSuburbs] = useState(initial.showFollowedSuburbs);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(field: "visibility" | "showFollowedSuburbs", value: Visibility | boolean) {
    const undo = field === "visibility" ? () => setVisibility(visibility) : () => setShowFollowedSuburbs(showFollowedSuburbs);
    if (typeof value === "boolean") setShowFollowedSuburbs(value);
    else setVisibility(value);
    start(async () => {
      const r = await setProfileAction(field, value);
      setError(r.ok ? null : r.error);
      if (!r.ok) undo();
    });
  }

  return (
    <div className="card flex flex-col gap-5 p-5 sm:p-6">
      <fieldset disabled={pending}>
        <legend className="font-semibold">Who can see your profile</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              { value: "private", title: "Private", body: "Only you. This is the default." },
              { value: "public", title: "Public profile", body: "Your first name and last initial. Nothing else unless you add it below." },
            ] as const
          ).map((o) => (
            <label key={o.value} className={`flex cursor-pointer gap-3 rounded-xl p-3 ring-1 transition ${visibility === o.value ? "bg-brand-50 ring-brand-600" : "ring-line hover:ring-brand-300"}`}>
              <input type="radio" name="visibility" value={o.value} checked={visibility === o.value} onChange={() => save("visibility", o.value)} className="mt-1 accent-brand-600" />
              <span>
                <span className="block font-semibold">{o.title}</span>
                <span className="block text-sm text-muted">{o.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className={`flex items-start gap-3 ${visibility === "private" ? "opacity-50" : ""}`}>
        <input
          type="checkbox"
          checked={showFollowedSuburbs}
          disabled={pending || visibility === "private"}
          onChange={(e) => save("showFollowedSuburbs", e.target.checked)}
          className="mt-1 h-5 w-5 accent-brand-600"
        />
        <span>
          <span className="block font-semibold">Show the suburbs I follow</span>
          <span className="block text-sm text-muted">Off by default. Homes and agents you follow are never shown.</span>
        </span>
      </label>
      <p role="status" className="text-sm text-bad-700">
        {error}
      </p>
    </div>
  );
}
