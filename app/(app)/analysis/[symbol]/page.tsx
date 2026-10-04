import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPrices, getPortfolio } from "@/lib/data/portfolio";
import { valuation } from "@/lib/calculations/analysis";
import { deleteAnalysis } from "@/app/(app)/analysis/actions";
import { formatNumber, formatSignedTHB } from "@/lib/utils/currency";
import { formatThaiDate } from "@/lib/utils/date";
import { formatPercent, plColor } from "@/lib/utils/format";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { AnalysisForm } from "@/components/analysis/AnalysisForm";
import {
  ANALYSIS_NUMBER_FIELDS,
  ANALYSIS_TEXT_FIELDS,
  type AnalysisFormValues,
} from "@/components/analysis/fields";

type Props = { params: Promise<{ symbol: string }>; searchParams: Promise<{ saved?: string }> };

const SYMBOL_PATTERN = /^[A-Z0-9.&-]{1,20}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `วิเคราะห์ ${decodeURIComponent((await params).symbol).toUpperCase()}` };
}

export default async function AnalysisPage({ params, searchParams }: Props) {
  const symbol = decodeURIComponent((await params).symbol).toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) notFound();
  const { saved } = await searchParams;

  const supabase = await createClient();
  const { data: stock } = await supabase
    .from("stocks")
    .select("id, name, sector")
    .eq("symbol", symbol)
    .eq("market", "SET")
    .maybeSingle();

  const [analysis, watch, prices, { holdings }] = await Promise.all([
    stock
      ? supabase.from("stock_analysis").select("*").eq("stock_id", stock.id).maybeSingle().then((r) => r.data)
      : null,
    stock
      ? supabase.from("watchlists").select("buy_price").eq("stock_id", stock.id).maybeSingle().then((r) => r.data)
      : null,
    getCurrentPrices(),
    getPortfolio(),
  ]);

  const price = stock ? (prices.get(stock.id) ?? null) : null;
  const holding = stock ? holdings.find((h) => h.stockId === stock.id && h.shares.greaterThan(0)) : undefined;
  const v = valuation({
    price: price?.price ?? null,
    eps: analysis?.eps,
    fairValue: analysis?.fair_value,
    targetPrice: analysis?.target_price,
  });

  const initial = Object.fromEntries([
    ...ANALYSIS_NUMBER_FIELDS.map((f) => [f.key, analysis?.[f.key]?.toString() ?? ""]),
    ...ANALYSIS_TEXT_FIELDS.map((f) => [f.key, analysis?.[f.key] ?? ""]),
  ]) as AnalysisFormValues;

  const context = [
    price && {
      label: "ราคาปัจจุบัน",
      value: formatNumber(price.price, 2),
      hint: `${{ manual: "กรอกเอง", market: "ราคาตลาด", last_trade: "รายการล่าสุด" }[price.source]} · ${formatThaiDate(price.date)}`,
    },
    v.peAtPrice && { label: "P/E ที่ราคานี้", value: `${v.peAtPrice.toFixed(2)} เท่า`, hint: "ราคา ÷ EPS" },
    v.marginOfSafety && {
      label: "ส่วนเผื่อความปลอดภัย",
      value: formatPercent(v.marginOfSafety, 1),
      className: plColor(v.marginOfSafety),
      hint: "(มูลค่าเหมาะสม − ราคา) ÷ มูลค่าเหมาะสม",
    },
    v.upside && { label: "Upside ถึงเป้า", value: formatPercent(v.upside, 1), className: plColor(v.upside) },
    holding && {
      label: "ถืออยู่",
      value: `${formatNumber(holding.shares)} หุ้น`,
      hint: `เฉลี่ย ${formatNumber(holding.avgCost, 2, 4)} · ${formatSignedTHB(holding.unrealizedPL)}`,
    },
    watch?.buy_price && { label: "ราคาที่อยากซื้อ", value: formatNumber(watch.buy_price, 2), hint: "จาก Watchlist" },
  ].filter(Boolean) as { label: string; value: string; hint?: string; className?: string }[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/analysis" className="text-sm text-slate-500 hover:text-primary">
          ← วิเคราะห์หุ้น
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{symbol}</h1>
            <p className="text-sm text-slate-500">
              {[stock?.name, stock?.sector].filter(Boolean).join(" · ") || "หุ้นใหม่ จะถูกเพิ่มเมื่อบันทึก"}
              {analysis && ` · อัปเดต ${formatThaiDate(analysis.updated_at)}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {holding && (
              <Link href={`/portfolio/${encodeURIComponent(symbol)}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50">
                ดูในพอร์ต
              </Link>
            )}
            {!watch && (
              <Link href={`/watchlist?new=1&symbol=${encodeURIComponent(symbol)}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50">
                + Watchlist
              </Link>
            )}
            {analysis && stock && (
              <DeleteButton action={deleteAnalysis.bind(null, stock.id)} confirmText={`ลบบทวิเคราะห์ ${symbol}?`} />
            )}
          </div>
        </div>
      </div>

      {saved && (
        <p role="status" className="rounded-lg bg-positive/10 px-3 py-2 text-sm text-positive">
          ✓ บันทึกบทวิเคราะห์แล้ว
        </p>
      )}

      {context.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {context.map((c) => (
            <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <dt className="text-xs text-slate-500">{c.label}</dt>
              <dd className={`mt-1 font-semibold tabular-nums ${c.className ?? ""}`}>{c.value}</dd>
              {c.hint && <dd className="mt-0.5 text-[11px] text-slate-400">{c.hint}</dd>}
            </div>
          ))}
        </dl>
      )}

      <AnalysisForm key={analysis?.updated_at ?? "new"} symbol={symbol} initial={initial} />
    </div>
  );
}
