"use client";

import { ErrorPanel } from "@/components/ui/ErrorPanel";

/**
 * Catches what `app/(app)/error.tsx` cannot: Next.js does not let an error
 * boundary catch errors from the layout in its own folder, so a failure while
 * checking the login (in the app layout) lands here.
 */
export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="px-4 py-12">
      <ErrorPanel {...props} />
    </main>
  );
}
