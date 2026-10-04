import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortfolio } from "@/lib/data/portfolio";
import { replayPosition } from "@/lib/calculations/profitLoss";
import { formatNumber, formatSignedTHB, formatTHB } from "@/lib/utils/currency";
import { formatPercent, plColor } from "@/lib/utils/format";
import { CostLedger } from "@/components/portfolio/CostLedger";
import { PriceBadge } from "@/components/portfolio/PriceBadge";
import { PriceModal } from "@/components/portfolio/PriceModal";

type Props = {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ price?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  return { title: decodeURIComponent(symbol).toUpperCase() };
}

export default async function HoldingPage({ params, searchParams }: Props) {
  const symbol = decodeURIComponent((await params).symbol).toUpperCase();
  const { price } = await searchParams;
  const { holdings } = await getPortfolio();
  const holding = holdings.find((h) => h.symbol === symbol);
  if (!holding) notFound();

  const supabase = await createClient();
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("id, transaction_type, trade_date, created_at, quantity, price, total_amount, note")
    .eq("stock_id", holding.stockId);
  if (error) throw new Error("โหลดรายการไม่สำเร็จ");
  const { entries } = replayPosition(transactions);

  const href = `/portfolio/${encodeURIComponent(symbol)}`;
  const stats = [
    { label: "จำนวนหุ้น", value: formatNumber(holding.shares) },
    { label: "ต้นทุนเฉลี่ย", value: formatNumber(holding.avgCost, 2, 4) },
    { label: "ต้นทุนรวม", value: formatTHB(holding.costBasis) },
    { label: "มูลค่าตลาด", value: formatTHB(holding.marketValue) },
    {
      label: "กำไร/ขาดทุนยังไม่รับรู้",
      value: `${formatSignedTHB(holding.unrealizedPL)} (${formatPercent(holding.unrealizedPct)})`,
      className: plColor(holding.unrealizedPL),
    },
    { label: "กำไร/ขาดทุนที่รับรู้แล้ว", value: formatSignedTHB(holding.realizedPL), className: plColor(holding.realizedPL) },
    { label: "เงินปันผลรับ", value: formatTHB(holding.dividends) },
    { label: "ผลตอบแทนรวม", value: formatSignedTHB(holding.totalReturn), className: plColor(holding.totalReturn) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/portfolio" className="text-sm text-slate-500 hover:text-primary">
          ← พอร์ต
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{holding.symbol}</h1>
            <p className="text-sm text-slate-500">{[holding.name, holding.sector].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 text-right">
              <p className="text-xs text-slate-500">ราคาปัจจุบัน</p>
              <PriceBadge holding={holding} returnTo={href} />
            </div>
            <Link
              href={`/analysis/${encodeURIComponent(symbol)}`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm hover:bg-slate-50"
            >
              บทวิเคราะห์
            </Link>
            <Link
              href={`/dividends?new=1&symbol=${encodeURIComponent(symbol)}`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm hover:bg-slate-50"
            >
              + ปันผล
            </Link>
            <Link
              href={`/transactions?new=1&symbol=${encodeURIComponent(symbol)}`}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary"
            >
              + ซื้อ/ขาย
            </Link>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="text-xs text-slate-500">{s.label}</dt>
            <dd className={`mt-1 font-semibold tabular-nums ${s.className ?? ""}`}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">ประวัติและต้นทุนเฉลี่ย</h2>
        <CostLedger entries={entries} />
      </section>

      {price && (
        <PriceModal stockId={holding.stockId} symbol={holding.symbol} currentPrice={holding.price.toString()} returnTo={href} />
      )}
    </div>
  );
}
