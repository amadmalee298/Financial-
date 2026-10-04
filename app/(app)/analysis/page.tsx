import type { Metadata } from "next";
import { loadError } from "@/lib/utils/errors";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPrices } from "@/lib/data/portfolio";
import { valuation } from "@/lib/calculations/analysis";
import { formatNumber } from "@/lib/utils/currency";
import { formatThaiDate } from "@/lib/utils/date";
import { formatPercent, plColor } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "วิเคราะห์หุ้น" };

export default async function AnalysisListPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol } = await searchParams;
  if (symbol?.trim()) redirect(`/analysis/${encodeURIComponent(symbol.trim().toUpperCase())}`);

  const supabase = await createClient();
  const [{ data: analyses, error }, prices] = await Promise.all([
    supabase
      .from("stock_analysis")
      .select("stock_id, investment_thesis, pe, pbv, roe, dividend_yield, eps, fair_value, target_price, updated_at, stock:stocks!inner(symbol, name)")
      .order("updated_at", { ascending: false }),
    getCurrentPrices(),
  ]);
  if (error) throw loadError("analysis", "โหลดบทวิเคราะห์ไม่สำเร็จ", error);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">วิเคราะห์หุ้น</h1>
          <p className="text-sm text-slate-500">Investment Journal — บันทึกเหตุผล จุดแข็ง ความเสี่ยง และมูลค่าที่เหมาะสม</p>
        </div>
        <form className="flex gap-2" role="search">
          <label htmlFor="new-symbol" className="sr-only">
            ชื่อย่อหุ้น
          </label>
          <input
            id="new-symbol"
            name="symbol"
            placeholder="ชื่อย่อหุ้น เช่น PTT"
            autoCapitalize="characters"
            className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm uppercase placeholder:normal-case"
            required
          />
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary">
            + เขียน
          </button>
        </form>
      </div>

      {analyses.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-slate-500">ยังไม่มีบทวิเคราะห์ พิมพ์ชื่อหุ้นด้านบนเพื่อเริ่มเขียน</p>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {analyses.map((a) => {
            const price = prices.get(a.stock_id)?.price ?? null;
            const v = valuation({ price, eps: a.eps, fairValue: a.fair_value, targetPrice: a.target_price });
            const ratios = [
              { label: "P/E", value: a.pe },
              { label: "P/BV", value: a.pbv },
              { label: "ROE", value: a.roe, suffix: "%" },
              { label: "Yield", value: a.dividend_yield, suffix: "%" },
            ].filter((r) => r.value !== null);

            return (
              <li key={a.stock_id}>
                <Link
                  href={`/analysis/${encodeURIComponent(a.stock.symbol)}`}
                  className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{a.stock.symbol}</p>
                      <p className="truncate text-xs text-slate-500">อัปเดต {formatThaiDate(a.updated_at)}</p>
                    </div>
                    {v.marginOfSafety && (
                      <div className="text-right">
                        <p className={`text-sm font-semibold tabular-nums ${plColor(v.marginOfSafety)}`}>
                          {formatPercent(v.marginOfSafety, 1)}
                        </p>
                        <p className="text-[11px] text-slate-400">ส่วนเผื่อความปลอดภัย</p>
                      </div>
                    )}
                  </div>
                  {a.investment_thesis && (
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">{a.investment_thesis}</p>
                  )}
                  <div className="min-h-3 flex-1" />
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs">
                    {price && (
                      <div className="flex gap-1">
                        <dt className="text-slate-500">ราคา</dt>
                        <dd className="tabular-nums">{formatNumber(price, 2)}</dd>
                      </div>
                    )}
                    {a.fair_value !== null && (
                      <div className="flex gap-1">
                        <dt className="text-slate-500">มูลค่าเหมาะสม</dt>
                        <dd className="tabular-nums">{formatNumber(a.fair_value, 2)}</dd>
                      </div>
                    )}
                    {ratios.map((r) => (
                      <div key={r.label} className="flex gap-1">
                        <dt className="text-slate-500">{r.label}</dt>
                        <dd className="tabular-nums">
                          {formatNumber(r.value!, 0, 2)}
                          {r.suffix}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
