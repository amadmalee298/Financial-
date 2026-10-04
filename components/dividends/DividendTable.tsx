import Link from "next/link";
import { deleteDividend } from "@/app/(app)/dividends/actions";
import { formatNumber, formatTHB } from "@/lib/utils/currency";
import { formatThaiDate } from "@/lib/utils/date";
import { DeleteButton } from "@/components/ui/DeleteButton";
import type { DividendWithStock } from "@/types/transaction";

function Actions({ d }: { d: DividendWithStock }) {
  return (
    <div className="flex justify-end gap-1">
      <Link
        href={`/dividends?edit=${d.id}`}
        scroll={false}
        className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        แก้ไข
      </Link>
      <DeleteButton
        action={deleteDividend.bind(null, d.id)}
        confirmText={`ลบเงินปันผล ${d.stock.symbol}${d.payment_date ? ` วันที่ ${formatThaiDate(d.payment_date)}` : ""}?`}
      />
    </div>
  );
}

export function DividendTable({ dividends }: { dividends: DividendWithStock[] }) {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {dividends.map((d) => (
          <li key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{d.stock.symbol}</p>
                <p className="text-xs text-slate-500">
                  จ่าย {d.payment_date ? formatThaiDate(d.payment_date) : "-"}
                  {d.xd_date && ` · XD ${formatThaiDate(d.xd_date)}`}
                </p>
              </div>
              <p className="font-semibold tabular-nums">{formatTHB(d.net_amount ?? 0)}</p>
            </div>
            <p className="mt-2 text-sm text-slate-600 tabular-nums">
              {formatNumber(d.shares ?? 0)} หุ้น × {formatNumber(d.dividend_per_share ?? 0, 2, 4)} บาท · ภาษี{" "}
              {formatTHB(d.withholding_tax ?? 0)}
            </p>
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Actions d={d} />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-right text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">วันที่จ่าย</th>
              <th className="px-4 py-3 text-left font-medium">หุ้น</th>
              <th className="px-4 py-3 text-left font-medium">XD</th>
              <th className="px-4 py-3 font-medium">จำนวนหุ้น</th>
              <th className="px-4 py-3 font-medium">ต่อหุ้น</th>
              <th className="px-4 py-3 font-medium">ก่อนภาษี</th>
              <th className="px-4 py-3 font-medium">ภาษี</th>
              <th className="px-4 py-3 font-medium">สุทธิ</th>
              <th className="px-4 py-3">
                <span className="sr-only">จัดการ</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-right tabular-nums">
            {dividends.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-left whitespace-nowrap">
                  {d.payment_date ? formatThaiDate(d.payment_date) : "-"}
                </td>
                <td className="px-4 py-3 text-left">
                  <span className="font-medium">{d.stock.symbol}</span>
                  {d.note && <p className="max-w-40 truncate text-xs text-slate-500">{d.note}</p>}
                </td>
                <td className="px-4 py-3 text-left whitespace-nowrap text-slate-500">
                  {d.xd_date ? formatThaiDate(d.xd_date) : "-"}
                </td>
                <td className="px-4 py-3">{formatNumber(d.shares ?? 0)}</td>
                <td className="px-4 py-3">{formatNumber(d.dividend_per_share ?? 0, 2, 4)}</td>
                <td className="px-4 py-3">{formatTHB(d.gross_amount ?? 0)}</td>
                <td className="px-4 py-3 text-slate-500">{formatTHB(d.withholding_tax ?? 0)}</td>
                <td className="px-4 py-3 font-medium">{formatTHB(d.net_amount ?? 0)}</td>
                <td className="px-4 py-3">
                  <Actions d={d} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
