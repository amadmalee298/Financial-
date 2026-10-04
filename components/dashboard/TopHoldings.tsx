import Link from "next/link";
import type { Holding } from "@/types/portfolio";
import { formatTHB } from "@/lib/utils/currency";
import { formatPercent, plColor } from "@/lib/utils/format";

export function TopHoldings({ holdings, limit = 5 }: { holdings: Holding[]; limit?: number }) {
  const top = holdings.filter((h) => h.shares.greaterThan(0)).slice(0, limit);
  if (top.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">หุ้นที่ถือมากที่สุด</h2>
        <Link href="/portfolio" className="text-xs text-slate-500 hover:text-primary">
          ดูทั้งหมด →
        </Link>
      </div>
      <ul className="divide-y divide-slate-100">
        {top.map((h) => (
          <li key={h.stockId}>
            <Link
              href={`/portfolio/${encodeURIComponent(h.symbol)}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-16 font-semibold">{h.symbol}</span>
                <span className="text-xs text-slate-500 tabular-nums">
                  {formatPercent(h.weight, 1).replace("+", "")} ของพอร์ต
                </span>
              </span>
              <span className="text-right tabular-nums">
                <span className="block">{formatTHB(h.marketValue)}</span>
                <span className={`block text-xs ${plColor(h.unrealizedPL)}`}>{formatPercent(h.unrealizedPct)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
