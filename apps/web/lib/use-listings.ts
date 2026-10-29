"use client";

import { useEffect, useState } from "react";
import type { ListingSummary } from "./types";

export type ListingsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; listings: ListingSummary[]; missing: string[] };

/** Fetches published summaries for the given ids; ids that are no longer published come back in `missing`. */
export function useListings(ids: readonly string[] | null): ListingsState {
  const key = ids?.join(",") ?? null;
  const [state, setState] = useState<ListingsState>({ status: "loading" });

  useEffect(() => {
    if (key === null) return;
    if (key === "") {
      setState({ status: "ready", listings: [], missing: [] });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(`/api/listings?ids=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { listings: ListingSummary[]; missing: string[] }) => setState({ status: "ready", ...body }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [key]);

  return state;
}
