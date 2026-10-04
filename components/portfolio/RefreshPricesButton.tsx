"use client";

import { useState, useTransition } from "react";
import { refreshMyPrices, type RefreshState } from "@/app/(app)/portfolio/actions";
import { useOnline } from "@/components/pwa/useOnline";

function summary({ result, error }: RefreshState) {
  if (error) return { text: error, tone: "error" as const };
  if (!result) return null;

  const parts: string[] = [];
  if (result.updated.length) parts.push(`อัปเดต ${result.updated.length} หุ้น`);
  if (result.fresh.length) parts.push(`${result.fresh.length} หุ้นเพิ่งอัปเดตไป`);
  if (result.unsupported.length) parts.push(`ไม่พบราคา: ${result.unsupported.join(", ")}`);
  if (result.failed.length) parts.push(`ดึงไม่สำเร็จ: ${result.failed.join(", ")} (ลองใหม่ภายหลัง)`);
  const problem = result.failed.length > 0 || (result.unsupported.length > 0 && result.updated.length === 0);
  return { text: parts.join(" · ") || "ไม่มีรายการ", tone: problem ? ("error" as const) : ("ok" as const) };
}

/** Fetches market prices for holdings and watchlist, then shows what happened. */
export function RefreshPricesButton() {
  const online = useOnline();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<RefreshState | null>(null);
  const message = state && summary(state);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || !online}
        title={online ? undefined : "ออฟไลน์ — อัปเดตราคาไม่ได้"}
        onClick={() => startTransition(async () => setState(await refreshMyPrices()))}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "กำลังอัปเดต…" : "↻ อัปเดตราคา"}
      </button>
      {message && (
        <p
          role="status"
          className={`max-w-xs text-right text-xs ${message.tone === "error" ? "text-negative" : "text-slate-500"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
