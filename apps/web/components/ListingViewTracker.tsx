"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics-client";

export function ListingViewTracker({ listingId, suburbId }: { listingId: string; suburbId: string }) {
  useEffect(() => {
    const ref = document.referrer.includes("/search") ? "search" : document.referrer.includes("/shortlist") ? "collection" : document.referrer ? "other" : "external";
    track("listing_viewed", { surface: "listing_page", listingId, suburbId, outcome: "success", properties: { referrer: ref } });
  }, [listingId, suburbId]);
  return null;
}
