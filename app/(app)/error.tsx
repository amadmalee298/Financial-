"use client";

import { ErrorPanel } from "@/components/ui/ErrorPanel";

/** A page failed to load: shown inside the app shell, so the menu stays usable. */
export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorPanel {...props} />;
}
