import Link from "next/link";
import { formatNumber, formatTHB } from "@/lib/utils/currency";
import { formatThaiDate } from "@/lib/utils/date";
import { totalCosts } from "@/lib/calculations/transaction";
import type { TransactionWithStock } from "@/types/transaction";
import { DeleteTransactionButton } from "./DeleteTransactionButton";

function TypeBadge({ type }: { type: TransactionWithStock["transaction_type"] }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
        type === "BUY" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
      }`}
    >
      {type === "BUY" ? "ซื้อ" : "ขาย"}
    </span>
  );
}

function Actions({ tx }: { tx: TransactionWithStock }) {
  const label = `${tx.transaction_type === "BUY" ? "ซื้อ" : "ขาย"} ${tx.stock.symbol} ${formatThaiDate(tx.trade_date)}`;
  return (
    <div className="flex justify-end gap-1">
      <Link
        href={`/transactions?edit=${tx.id}`}
        scroll={false}
        className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        แก้ไข
      </Link>
      <DeleteTransactionButton id={tx.id} label={label} />
    </div>
  );
}

export function TransactionTable({ transactions }: { transactions: TransactionWithStock[] }) {
  return (
    <>
      {/* Phones: cards */}
      <ul className="flex flex-col gap-3 md:hidden">
        {transactions.map((tx) => (
          <li key={tx.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{tx.stock.symbol}</span>
                  <TypeBadge type={tx.transaction_type} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{formatThaiDate(tx.trade_date)}</p>
              </div>
              <p className="font-semibold tabular-nums">{formatTHB(tx.total_amount)}</p>
            </div>
            <p className="mt-2 text-sm text-slate-600 tabular-nums">
              {formatNumber(tx.quantity)} หุ้น × {formatNumber(tx.price, 2)} บาท
            </p>
            {tx.note && <p className="mt-1 text-xs text-slate-500">{tx.note}</p>}
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Actions tx={tx} />
            </div>
          </li>
        ))}
      </ul>

      {/* Tablets and up: table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">วันที่</th>
              <th className="px-4 py-3 font-medium">หุ้น</th>
              <th className="px-4 py-3 font-medium">ประเภท</th>
              <th className="px-4 py-3 text-right font-medium">จำนวน</th>
              <th className="px-4 py-3 text-right font-medium">ราคา</th>
              <th className="px-4 py-3 text-right font-medium">ค่าใช้จ่าย</th>
              <th className="px-4 py-3 text-right font-medium">ยอดรวม</th>
              <th className="px-4 py-3">
                <span className="sr-only">จัดการ</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap">{formatThaiDate(tx.trade_date)}</td>
                <td className="px-4 py-3">
                  <span className="font-medium">{tx.stock.symbol}</span>
                  {tx.note && <p className="max-w-48 truncate text-xs text-slate-500">{tx.note}</p>}
                </td>
                <td className="px-4 py-3">
                  <TypeBadge type={tx.transaction_type} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatNumber(tx.quantity)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatNumber(tx.price, 2)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                  {formatNumber(totalCosts(tx), 2, 2)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{formatTHB(tx.total_amount)}</td>
                <td className="px-4 py-3">
                  <Actions tx={tx} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
