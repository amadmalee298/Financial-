import Link from "next/link";
import type { Holding } from "@/types/portfolio";
import { formatNumber, formatSignedTHB, formatTHB } from "@/lib/utils/currency";
import { formatPercent, plColor } from "@/lib/utils/format";
import { HoldingCard } from "./HoldingCard";
import { PriceBadge } from "./PriceBadge";

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {holdings.map((h) => (
          <HoldingCard key={h.stockId} holding={h} />
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-right text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">หุ้น</th>
              <th className="px-4 py-3 font-medium">จำนวน</th>
              <th className="px-4 py-3 font-medium">ต้นทุนเฉลี่ย</th>
              <th className="px-4 py-3 font-medium">ราคา</th>
              <th className="px-4 py-3 font-medium">ต้นทุนรวม</th>
              <th className="px-4 py-3 font-medium">มูลค่า</th>
              <th className="px-4 py-3 font-medium">กำไร/ขาดทุน</th>
              <th className="px-4 py-3 font-medium">สัดส่วน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-right tabular-nums">
            {holdings.map((h) => (
              <tr key={h.stockId} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-left">
                  <Link href={`/portfolio/${encodeURIComponent(h.symbol)}`} className="font-semibold hover:underline">
                    {h.symbol}
                  </Link>
                  {h.name && <p className="max-w-44 truncate text-xs text-slate-500">{h.name}</p>}
                </td>
                <td className="px-4 py-3">{formatNumber(h.shares)}</td>
                <td className="px-4 py-3">{formatNumber(h.avgCost, 2, 4)}</td>
                <td className="px-2 py-3">
                  <PriceBadge holding={h} returnTo="/portfolio" />
                </td>
                <td className="px-4 py-3">{formatTHB(h.costBasis)}</td>
                <td className="px-4 py-3 font-medium">{formatTHB(h.marketValue)}</td>
                <td className={`px-4 py-3 ${plColor(h.unrealizedPL)}`}>
                  <p className="font-medium">{formatSignedTHB(h.unrealizedPL)}</p>
                  <p className="text-xs">{formatPercent(h.unrealizedPct)}</p>
                </td>
                <td className="px-4 py-3">{formatPercent(h.weight, 1).replace("+", "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
