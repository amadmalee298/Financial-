import type { LedgerEntry, LedgerTransaction } from "@/types/portfolio";
import { formatNumber, formatSignedTHB, formatTHB } from "@/lib/utils/currency";
import { formatThaiDate } from "@/lib/utils/date";
import { plColor } from "@/lib/utils/format";

/** Transaction history with the running average cost after each trade. */
export function CostLedger({ entries }: { entries: LedgerEntry<LedgerTransaction & { note: string | null }>[] }) {
  const rows = [...entries].reverse(); // newest first

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map(({ transaction: tx, sharesAfter, avgCostAfter, realizedPL }) => (
          <li key={tx.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <div className="flex justify-between gap-2">
              <span>
                <span className={tx.transaction_type === "BUY" ? "font-semibold text-positive" : "font-semibold text-negative"}>
                  {tx.transaction_type === "BUY" ? "ซื้อ" : "ขาย"}
                </span>{" "}
                {formatNumber(tx.quantity)} × {formatNumber(tx.price, 2)}
              </span>
              <span className="text-xs text-slate-500">{formatThaiDate(tx.trade_date)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              คงเหลือ {formatNumber(sharesAfter)} หุ้น · เฉลี่ย {formatNumber(avgCostAfter, 2, 4)}
            </p>
            {tx.transaction_type === "SELL" && (
              <p className={`mt-1 text-xs font-medium tabular-nums ${plColor(realizedPL)}`}>
                กำไร/ขาดทุน {formatSignedTHB(realizedPL)}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-right text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">วันที่</th>
              <th className="px-4 py-3 text-left font-medium">ประเภท</th>
              <th className="px-4 py-3 font-medium">จำนวน</th>
              <th className="px-4 py-3 font-medium">ราคา</th>
              <th className="px-4 py-3 font-medium">ยอดรวม</th>
              <th className="px-4 py-3 font-medium">หุ้นคงเหลือ</th>
              <th className="px-4 py-3 font-medium">ต้นทุนเฉลี่ย</th>
              <th className="px-4 py-3 font-medium">กำไรที่รับรู้</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-right tabular-nums">
            {rows.map(({ transaction: tx, sharesAfter, avgCostAfter, realizedPL }) => (
              <tr key={tx.id}>
                <td className="px-4 py-3 text-left whitespace-nowrap">{formatThaiDate(tx.trade_date)}</td>
                <td className="px-4 py-3 text-left">
                  <span className={tx.transaction_type === "BUY" ? "text-positive" : "text-negative"}>
                    {tx.transaction_type === "BUY" ? "ซื้อ" : "ขาย"}
                  </span>
                  {tx.note && <p className="max-w-40 truncate text-xs text-slate-500">{tx.note}</p>}
                </td>
                <td className="px-4 py-3">{formatNumber(tx.quantity)}</td>
                <td className="px-4 py-3">{formatNumber(tx.price, 2)}</td>
                <td className="px-4 py-3">{formatTHB(tx.total_amount)}</td>
                <td className="px-4 py-3">{formatNumber(sharesAfter)}</td>
                <td className="px-4 py-3">{formatNumber(avgCostAfter, 2, 4)}</td>
                <td className={`px-4 py-3 ${tx.transaction_type === "SELL" ? plColor(realizedPL) : "text-slate-300"}`}>
                  {tx.transaction_type === "SELL" ? formatSignedTHB(realizedPL) : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
