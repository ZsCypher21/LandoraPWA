"use client";

import { useEffect } from "react";

// Registers the service worker that caches the app shell so saved shortlists and the inspection plan
// open offline (ADR 0002). Only in production builds, to keep development predictable.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
