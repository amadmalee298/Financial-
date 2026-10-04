import type { PortfolioSummary } from "@/types/portfolio";
import { formatSignedTHB, formatTHB } from "@/lib/utils/currency";
import { formatPercent, plColor } from "@/lib/utils/format";

export function PortfolioStats({ summary }: { summary: PortfolioSummary }) {
  const items = [
    { label: "ต้นทุนคงเหลือ", value: formatTHB(summary.costBasis) },
    {
      label: "กำไร/ขาดทุนที่รับรู้แล้ว",
      value: formatSignedTHB(summary.realizedPL),
      className: plColor(summary.realizedPL),
    },
    { label: "เงินปันผลรับ", value: formatTHB(summary.dividends) },
    {
      label: "ผลตอบแทนรวม",
      value: formatSignedTHB(summary.totalReturn),
      className: plColor(summary.totalReturn),
    },
  ];

  return (
    <section className="flex flex-col gap-3" aria-label="สรุปพอร์ต">
      <div className="rounded-2xl bg-primary p-5 text-white">
        <p className="text-sm text-slate-400">มูลค่าพอร์ต</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatTHB(summary.marketValue)}</p>
        <p className={`mt-1 text-sm font-medium tabular-nums ${summary.unrealizedPL.isZero() ? "text-slate-400" : summary.unrealizedPL.isPositive() ? "text-green-400" : "text-red-400"}`}>
          {formatSignedTHB(summary.unrealizedPL)} ({formatPercent(summary.unrealizedPct)})
          <span className="ml-1 font-normal text-slate-400">ยังไม่รับรู้</span>
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="text-xs text-slate-500">{item.label}</dt>
            <dd className={`mt-1 font-semibold tabular-nums ${item.className ?? ""}`}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
