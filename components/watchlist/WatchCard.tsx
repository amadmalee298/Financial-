import Link from "next/link";
import { deleteWatch } from "@/app/(app)/watchlist/actions";
import type { WatchStatus } from "@/lib/calculations/watchlist";
import type { CurrentPrice } from "@/lib/data/portfolio";
import { formatNumber } from "@/lib/utils/currency";
import { formatThaiDate } from "@/lib/utils/date";
import type { Decimal } from "@/lib/utils/decimal";
import { formatPercent } from "@/lib/utils/format";
import { DeleteButton } from "@/components/ui/DeleteButton";

export type WatchItem = {
  id: string;
  symbol: string;
  name: string | null;
  buyPrice: number | null;
  targetPrice: number | null;
  note: string | null;
  price: CurrentPrice | null;
  status: WatchStatus;
  toBuyPct: Decimal | null;
  upsidePct: Decimal | null;
  sharesHeld: Decimal | null;
  hasAnalysis: boolean;
};

const STATUS: Record<WatchStatus, { label: string; icon: string; className: string } | null> = {
  buy_zone: { label: "ถึงราคาที่อยากซื้อ", icon: "✓", className: "bg-positive/10 text-positive" },
  target_hit: { label: "ถึงราคาเป้าหมาย", icon: "◎", className: "bg-amber-100 text-amber-800" },
  no_price: { label: "ยังไม่มีราคา", icon: "?", className: "bg-slate-100 text-slate-500" },
  watching: null,
};

export function WatchCard({ item }: { item: WatchItem }) {
  const status = STATUS[item.status];
  const href = `/watchlist?price=${encodeURIComponent(item.symbol)}`;

  return (
    <li className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{item.symbol}</p>
          {item.name && <p className="truncate text-xs text-slate-500">{item.name}</p>}
        </div>
        <Link href={href} scroll={false} className="rounded-md px-1 text-right hover:bg-slate-100" title="อัปเดตราคา">
          <span className="block font-semibold tabular-nums underline decoration-dotted underline-offset-4">
            {item.price ? formatNumber(item.price.price, 2) : "กรอกราคา"}
          </span>
          {item.price && (
            <span className="block text-[11px] text-slate-400">
              {{ manual: "กรอกเอง", market: "ราคาตลาด", last_trade: "รายการล่าสุด" }[item.price.source]} · {formatThaiDate(item.price.date)}
            </span>
          )}
        </Link>
      </div>

      {status && (
        <p className={`mt-3 inline-flex items-center gap-1.5 self-start rounded-md px-2 py-0.5 text-xs font-medium ${status.className}`}>
          <span aria-hidden>{status.icon}</span>
          {status.label}
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500">ราคาที่อยากซื้อ</dt>
          <dd className="tabular-nums">
            {item.buyPrice !== null ? formatNumber(item.buyPrice, 2) : "-"}
            {item.toBuyPct && item.status !== "buy_zone" && (
              <span className="ml-1 text-xs text-slate-500">(ต้องลง {formatPercent(item.toBuyPct.neg()).replace("-", "")})</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">ราคาเป้าหมาย</dt>
          <dd className="tabular-nums">
            {item.targetPrice !== null ? formatNumber(item.targetPrice, 2) : "-"}
            {item.upsidePct && item.upsidePct.isPositive() && (
              <span className="ml-1 text-xs text-slate-500">(upside {formatPercent(item.upsidePct)})</span>
            )}
          </dd>
        </div>
      </dl>

      {item.note && <p className="mt-3 line-clamp-3 text-sm text-slate-600">{item.note}</p>}

      <div className="min-h-3 flex-1" aria-hidden />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
        <div className="flex gap-3 text-slate-500">
          {item.sharesHeld && item.sharesHeld.greaterThan(0) && (
            <Link href={`/portfolio/${encodeURIComponent(item.symbol)}`} className="hover:text-primary">
              ถืออยู่ {formatNumber(item.sharesHeld)} หุ้น
            </Link>
          )}
          <Link href={`/analysis/${encodeURIComponent(item.symbol)}`} className="hover:text-primary">
            {item.hasAnalysis ? "บทวิเคราะห์" : "+ เขียนบทวิเคราะห์"}
          </Link>
        </div>
        <div className="flex gap-1">
          <Link
            href={`/watchlist?edit=${item.id}`}
            scroll={false}
            className="rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-slate-100"
          >
            แก้ไข
          </Link>
          <DeleteButton action={deleteWatch.bind(null, item.id)} confirmText={`เอา ${item.symbol} ออกจาก Watchlist?`} />
        </div>
      </div>
    </li>
  );
}
