import Link from "next/link";
import type { Holding } from "@/types/portfolio";
import { formatNumber, formatSignedTHB, formatTHB } from "@/lib/utils/currency";
import { formatPercent, plColor } from "@/lib/utils/format";
import { PriceBadge } from "./PriceBadge";

/** Mobile layout for one holding. */
export function HoldingCard({ holding }: { holding: Holding }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/portfolio/${encodeURIComponent(holding.symbol)}`} className="min-w-0">
          <p className="font-semibold">{holding.symbol}</p>
          <p className="truncate text-xs text-slate-500">
            {formatNumber(holding.shares)} หุ้น · เฉลี่ย {formatNumber(holding.avgCost, 2, 4)}
          </p>
        </Link>
        <PriceBadge holding={holding} returnTo="/portfolio" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
        <div>
          <p className="text-xs text-slate-500">มูลค่า</p>
          <p className="font-semibold tabular-nums">{formatTHB(holding.marketValue)}</p>
        </div>
        <div className={`text-right tabular-nums ${plColor(holding.unrealizedPL)}`}>
          <p className="font-semibold">{formatPercent(holding.unrealizedPct)}</p>
          <p className="text-xs">{formatSignedTHB(holding.unrealizedPL)}</p>
        </div>
      </div>
    </li>
  );
}
