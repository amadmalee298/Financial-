"use client";

import { useTransition } from "react";
import { deleteTransaction } from "@/app/(app)/transactions/actions";

export function DeleteTransactionButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`ลบรายการ ${label}?`)) {
          startTransition(async () => {
            const result = await deleteTransaction(id);
            if (result.error) alert(result.error);
          });
        }
      }}
      className="rounded-md px-2 py-1 text-xs font-medium text-negative hover:bg-negative/10 disabled:opacity-50"
    >
      {pending ? "กำลังลบ…" : "ลบ"}
    </button>
  );
}
