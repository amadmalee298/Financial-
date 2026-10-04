import type { PortfolioSummary as Summary } from "@/types/portfolio";
import { formatSignedTHB, formatTHB } from "@/lib/utils/currency";
import { formatPercent } from "@/lib/utils/format";

export function PortfolioSummary({ summary }: { summary: Summary }) {
  const pl = summary.unrealizedPL;
  const stats = [
    { label: "เงินลงทุน", value: formatTHB(summary.costBasis) },
    { label: "กำไรที่รับรู้แล้ว", value: formatSignedTHB(summary.realizedPL) },
    { label: "เงินปันผล", value: formatTHB(summary.dividends) },
  ];

  return (
    <section className="rounded-2xl bg-primary p-5 text-white shadow-sm" aria-label="สรุปพอร์ต">
      <p className="text-sm text-slate-400">มูลค่าพอร์ต</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{formatTHB(summary.marketValue)}</p>
      <p
        className={`mt-1 text-sm font-medium tabular-nums ${
          pl.isZero() ? "text-slate-400" : pl.isPositive() ? "text-green-400" : "text-red-400"
        }`}
      >
        {formatSignedTHB(pl)} {formatPercent(summary.unrealizedPct)}
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-700 pt-4">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <p className="text-xs text-slate-400">{stat.label}</p>
            <p className="mt-0.5 truncate text-sm font-medium tabular-nums sm:text-base">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
