"use client";

import { useEffect } from "react";

/** Registers the service worker (production only, so dev hot reload is unaffected). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Offline support is an extra; the app works without it.
    });
  }, []);

  return null;
}
