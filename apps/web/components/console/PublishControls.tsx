"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setListingPublication, type ActionResult } from "@/app/actions";
import type { Controls } from "@/lib/publication";

/** Preview, Publish and Unpublish for one listing. The server re-checks the gate and the agent's scope. */
export function PublishControls({ listingId, controls, label }: { listingId: string; controls: Controls; label: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function run(publish: boolean) {
    start(async () => {
      try {
        setResult(await setListingPublication(listingId, publish));
      } catch {
        setResult({ ok: false, error: "Couldn't reach Landora. Try again." });
      }
    });
  }

  const hintId = `publish-hint-${listingId}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Link href={`/agent/preview/${listingId}`} className="btn btn-secondary" aria-label={`Preview ${label} as a buyer`}>
          Preview
        </Link>
        {controls.canUnpublish ? (
          <button type="button" onClick={() => run(false)} disabled={pending} className="btn btn-secondary disabled:opacity-60">
            {pending ? "Unpublishing…" : "Unpublish"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => run(true)}
            disabled={pending || !controls.canPublish}
            aria-describedby={controls.publishDisabledReason ? hintId : undefined}
            className="btn btn-primary disabled:cursor-not-allowed"
          >
            {pending ? "Publishing…" : "Publish"}
          </button>
        )}
      </div>
      {!controls.canPublish && !controls.canUnpublish && controls.publishDisabledReason && (
        <p id={hintId} className="text-xs text-muted">
          {controls.publishDisabledReason}
        </p>
      )}
      <p role="status" className={`text-xs ${result && !result.ok ? "text-bad-700" : "text-brand-700"}`}>
        {result ? (result.ok ? result.message : result.error) : ""}
      </p>
    </div>
  );
}
