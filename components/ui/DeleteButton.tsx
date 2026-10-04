"use client";

import { useTransition } from "react";

/**
 * Confirm, then run a Server Action (usually bound to a row id, e.g.
 * `deleteDividend.bind(null, id)`). Shows the action's error, if any.
 */
export function DeleteButton({
  action,
  confirmText,
}: {
  action: () => Promise<{ error?: string } | void>;
  confirmText: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        startTransition(async () => {
          const result = await action();
          if (result?.error) alert(result.error);
        });
      }}
      className="rounded-md px-2 py-1 text-xs font-medium text-negative hover:bg-negative/10 disabled:opacity-50"
    >
      {pending ? "กำลังลบ…" : "ลบ"}
    </button>
  );
}
