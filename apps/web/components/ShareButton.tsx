"use client";

import { useState } from "react";
import { track } from "@/lib/analytics-client";
import { can } from "@/lib/roles";
import { useRole } from "./RoleContext";

/** Shares a stable listing URL using the native share sheet where available, else copies it. */
export function ShareButton({ listingId, title }: { listingId: string; title: string }) {
  const { role } = useRole();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  if (!can(role, "listing.share")) return null;

  async function share() {
    const url = `${window.location.origin}/listing/${listingId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        track("listing_shared", { surface: "listing_page", listingId, outcome: "success", properties: { channel: "native_share" } });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      track("listing_shared", { surface: "listing_page", listingId, outcome: "success", properties: { channel: "link" } });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("failed");
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={share} className="btn btn-secondary">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7a3 3 0 0 0 .1.8L8.4 11.2a3 3 0 1 0 0 3.6l6.7 3.4A3 3 0 1 0 18 16z" />
        </svg>
        Share
      </button>
      <span role="status" className="mt-1 text-xs text-muted">
        {status === "copied" ? "Link copied" : status === "failed" ? "Couldn't share. Copy the address bar link instead." : ""}
      </span>
    </span>
  );
}
