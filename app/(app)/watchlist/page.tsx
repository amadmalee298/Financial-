import type { Metadata } from "next";
import { loadError } from "@/lib/utils/errors";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPrices, getPortfolio } from "@/lib/data/portfolio";
import { watchStatus, type WatchStatus } from "@/lib/calculations/watchlist";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PriceModal } from "@/components/portfolio/PriceModal";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { WatchCard, type WatchItem } from "@/components/watchlist/WatchCard";
import { WatchForm, type WatchFormValues } from "@/components/watchlist/WatchForm";

export const metadata: Metadata = { title: "Watchlist" };

type SearchParams = Promise<{ new?: string; edit?: string; price?: string; symbol?: string }>;

// Most actionable first.
const ORDER: Record<WatchStatus, number> = { buy_zone: 0, target_hit: 1, watching: 2, no_price: 3 };

export default async function WatchlistPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: rows, error }, { data: stocks }, { data: analyses }, prices, { holdings }] = await Promise.all([
    supabase
      .from("watchlists")
      .select("id, stock_id, buy_price, target_price, note, stock:stocks!inner(symbol, name)")
      .order("created_at", { ascending: false }),
    supabase.from("stocks").select("id, symbol, name, market, sector").order("symbol"),
    supabase.from("stock_analysis").select("stock_id"),
    getCurrentPrices(),
    getPortfolio(),
  ]);
  if (error) throw loadError("watchlist", "โหลด Watchlist ไม่สำเร็จ", error);

  const analyzed = new Set((analyses ?? []).map((a) => a.stock_id));
  const items: (WatchItem & { stockId: string })[] = rows
    .map((row) => {
      const price = prices.get(row.stock_id) ?? null;
      const { status, toBuyPct, upsidePct } = watchStatus(price?.price ?? null, row.buy_price, row.target_price);
      return {
        id: row.id,
        stockId: row.stock_id,
        symbol: row.stock.symbol,
        name: row.stock.name,
        buyPrice: row.buy_price,
        targetPrice: row.target_price,
        note: row.note,
        price,
        status,
        toBuyPct,
        upsidePct,
        sharesHeld: holdings.find((h) => h.stockId === row.stock_id)?.shares ?? null,
        hasAnalysis: analyzed.has(row.stock_id),
      };
    })
    .sort(
      (a, b) =>
        ORDER[a.status] - ORDER[b.status] ||
        (a.toBuyPct && b.toBuyPct ? a.toBuyPct.comparedTo(b.toBuyPct) : 0) ||
        a.symbol.localeCompare(b.symbol),
    );

  let formValues: WatchFormValues | null = null;
  if (params.edit) {
    const item = items.find((i) => i.id === params.edit);
    if (!item) notFound();
    formValues = {
      id: item.id,
      symbol: item.symbol,
      buy_price: item.buyPrice?.toString() ?? "",
      target_price: item.targetPrice?.toString() ?? "",
      note: item.note ?? "",
    };
  } else if (params.new) {
    formValues = { symbol: params.symbol?.toUpperCase() ?? "", buy_price: "", target_price: "", note: "" };
  }
  const priceTarget = params.price ? items.find((i) => i.symbol === params.price?.toUpperCase()) : undefined;
  const inBuyZone = items.filter((i) => i.status === "buy_zone").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Watchlist</h1>
          {inBuyZone > 0 && (
            <p className="text-sm text-positive">✓ {inBuyZone} หุ้นถึงราคาที่อยากซื้อแล้ว</p>
          )}
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <RefreshPricesButton />
          <Link
            href="/watchlist?new=1"
            scroll={false}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary"
          >
            + เพิ่มหุ้น
          </Link>
        </div>
      </div>

      {items.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <WatchCard key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <Card className="text-center">
          <p className="text-sm text-slate-500">ยังไม่มีหุ้นใน Watchlist เพิ่มหุ้นที่สนใจพร้อมราคาที่อยากซื้อได้เลย</p>
        </Card>
      )}

      <p className="text-xs text-slate-400">
        ราคาปิดล่าสุดจากตลาดเมื่อกด “อัปเดตราคา” (ราคาปิดรายวัน ไม่ใช่ราคาเรียลไทม์) · หรือกรอกเอง / ใช้ราคาจากรายการซื้อขายล่าสุด
      </p>

      {formValues && (
        <Modal title={formValues.id ? `แก้ไข ${formValues.symbol}` : "เพิ่มหุ้นใน Watchlist"} closeHref="/watchlist">
          <WatchForm key={formValues.id ?? "new"} stocks={stocks ?? []} initial={formValues} />
        </Modal>
      )}
      {priceTarget && (
        <PriceModal
          stockId={priceTarget.stockId}
          symbol={priceTarget.symbol}
          currentPrice={priceTarget.price?.price.toString() ?? ""}
          returnTo="/watchlist"
        />
      )}
    </div>
  );
}
