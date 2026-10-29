"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics-client";

// Emits search_completed / search_zero_results once per rendered result set (V11 §12.8).
export function SearchTracker({ mode, resultCount, criteriaCount }: { mode: "filters" | "natural_language"; resultCount: number; criteriaCount: number }) {
  useEffect(() => {
    track("search_completed", {
      surface: "search",
      outcome: resultCount === 0 ? "zero_results" : "success",
      properties: { mode, resultCount, criteriaCount, latencyMs: 0, aiUsed: false },
    });
    if (resultCount === 0) track("search_zero_results", { surface: "search", outcome: "zero_results", properties: { mode, criteriaCount } });
  }, [mode, resultCount, criteriaCount]);
  return null;
}
