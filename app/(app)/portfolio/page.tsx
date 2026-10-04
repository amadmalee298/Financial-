import type { Metadata } from "next";
import Link from "next/link";
import { getPortfolio } from "@/lib/data/portfolio";
import { formatNumber, formatSignedTHB, formatTHB } from "@/lib/utils/currency";
import { plColor } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { PortfolioStats } from "@/components/portfolio/PortfolioStats";
import { PriceModal } from "@/components/portfolio/PriceModal";

export const metadata: Metadata = { title: "พอร์ตการลงทุน" };

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ price?: string }>;
}) {
  const { price } = await searchParams;
  const { holdings, summary } = await getPortfolio();

  const open = holdings.filter((h) => h.shares.greaterThan(0));
  const closed = holdings.filter((h) => h.shares.isZero());
  const priceTarget = price ? holdings.find((h) => h.symbol === price.toUpperCase()) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">พอร์ตการลงทุน</h1>
        <Link
          href="/transactions?new=1"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary"
        >
          + บันทึกซื้อขาย
        </Link>
      </div>

      {holdings.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-slate-500">
            ยังไม่มีหุ้นในพอร์ต{" "}
            <Link href="/transactions?new=1" className="font-medium text-primary underline">
              บันทึกการซื้อครั้งแรก
            </Link>
          </p>
        </Card>
      ) : (
        <>
          <PortfolioStats summary={summary} />

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold">หุ้นที่ถืออยู่ ({open.length})</h2>
              <p className="text-xs text-slate-500">ต้นทุนเฉลี่ยรวมค่าธรรมเนียมแล้ว · คลิกราคาเพื่ออัปเดต</p>
            </div>
            {open.length > 0 ? (
              <HoldingsTable holdings={open} />
            ) : (
              <Card>
                <p className="text-sm text-slate-500">ขายหุ้นออกหมดแล้ว</p>
              </Card>
            )}
          </section>

          {closed.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">ขายออกหมดแล้ว ({closed.length})</h2>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
                {closed.map((h) => (
                  <li key={h.stockId}>
                    <Link
                      href={`/portfolio/${encodeURIComponent(h.symbol)}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-slate-50"
                    >
                      <span>
                        <span className="font-semibold">{h.symbol}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          ซื้อ {formatTHB(h.totalBought)} · ขาย {formatTHB(h.totalSold)}
                        </span>
                      </span>
                      <span className={`font-medium tabular-nums ${plColor(h.realizedPL)}`}>
                        {formatSignedTHB(h.realizedPL)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-slate-400">
            ถือ {summary.holdingsCount} หุ้น · ซื้อสะสมทั้งหมด {formatTHB(summary.totalBought)} ·{" "}
            {formatNumber(holdings.length)} หุ้นที่เคยซื้อขาย
          </p>
        </>
      )}

      {priceTarget && (
        <PriceModal
          stockId={priceTarget.stockId}
          symbol={priceTarget.symbol}
          currentPrice={priceTarget.price.toString()}
          returnTo="/portfolio"
        />
      )}
    </div>
  );
}
