import Link from "next/link";
import type { Holding } from "@/types/portfolio";
import { formatNumber } from "@/lib/utils/currency";
import { formatThaiDate } from "@/lib/utils/date";

/** Current price, where it came from, and a link to update it. */
export function PriceBadge({ holding, returnTo }: { holding: Holding; returnTo: string }) {
  const source = holding.priceSource === "manual" ? "กรอกเอง" : "จากรายการล่าสุด";
  return (
    <Link
      href={`${returnTo}?price=${encodeURIComponent(holding.symbol)}`}
      scroll={false}
      className="group inline-flex flex-col items-end rounded-md px-1 hover:bg-slate-100"
      title={`${source} · ${formatThaiDate(holding.priceDate)} · คลิกเพื่ออัปเดตราคา`}
    >
      <span className="tabular-nums underline decoration-dotted underline-offset-4">
        {formatNumber(holding.price, 2)}
      </span>
      <span className="text-[11px] text-slate-400">
        {source}
        {holding.priceSource === "last_trade" && " ✎"}
      </span>
    </Link>
  );
}
