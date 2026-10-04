"use client";

import { useEffect } from "react";

/**
 * Tells the service worker which user is signed in, so it can drop another
 * user's saved pages. Renders nothing.
 */
export function OfflineSync({ userId }: { userId: string }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    const send = () =>
      navigator.serviceWorker.ready.then((registration) => {
        if (!cancelled) registration.active?.postMessage({ type: "SET_USER", userId });
      });
    send();
    // A worker that takes control later (first visit, update) must be told too.
    navigator.serviceWorker.addEventListener("controllerchange", send);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", send);
    };
  }, [userId]);

  return null;
}
