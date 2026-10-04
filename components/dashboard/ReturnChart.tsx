import type { Holding } from "@/types/portfolio";
import { formatSignedTHB } from "@/lib/utils/currency";

/**
 * Total return per stock as bars diverging from a zero line. Direction and
 * the +/- sign carry gain vs loss, so color is never the only cue.
 */
export function ReturnChart({ holdings, limit = 10 }: { holdings: Holding[]; limit?: number }) {
  const rows = [...holdings]
    .filter((h) => !h.totalReturn.isZero())
    .sort((a, b) => b.totalReturn.abs().comparedTo(a.totalReturn.abs()))
    .slice(0, limit)
    .sort((a, b) => b.totalReturn.comparedTo(a.totalReturn));
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((h) => Math.abs(h.totalReturn.toNumber())));
  const hasLoss = rows.some((h) => h.totalReturn.isNegative());
  const hasGain = rows.some((h) => h.totalReturn.isPositive());

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="return-title">
      <h2 id="return-title" className="font-semibold">
        ผลตอบแทนรายหุ้น
      </h2>
      <p className="mb-4 text-xs text-slate-500">กำไร/ขาดทุนที่ยังไม่รับรู้ + ที่รับรู้แล้ว + เงินปันผล</p>
      <ul className="flex flex-col gap-2">
        {rows.map((h) => {
          // Cap at 70% so the value label always fits beside the longest bar.
          const width = `${(Math.abs(h.totalReturn.toNumber()) / max) * 70}%`;
          const gain = h.totalReturn.isPositive();
          return (
            <li key={h.stockId} className="grid grid-cols-[4.5rem_1fr] items-center gap-3 text-sm">
              <span className="truncate font-medium">{h.symbol}</span>
              <div className={`grid items-center ${hasLoss && hasGain ? "grid-cols-2" : "grid-cols-1"}`}>
                {hasLoss && (
                  <div className="flex h-5 items-center justify-end gap-2 border-r border-slate-300">
                    {!gain && (
                      <>
                        <span className="shrink-0 text-xs text-slate-600 tabular-nums">{formatSignedTHB(h.totalReturn)}</span>
                        <span className="block h-full rounded-l bg-negative" style={{ width, minWidth: 2 }} aria-hidden />
                      </>
                    )}
                  </div>
                )}
                {hasGain && (
                  <div className={`flex h-5 items-center gap-2 ${hasLoss ? "" : "border-l border-slate-300"}`}>
                    {gain && (
                      <>
                        <span className="block h-full rounded-r bg-positive" style={{ width, minWidth: 2 }} aria-hidden />
                        <span className="shrink-0 text-xs text-slate-600 tabular-nums">{formatSignedTHB(h.totalReturn)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
