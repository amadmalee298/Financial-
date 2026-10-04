import type { Metadata } from "next";
import Link from "next/link";
import { getReports } from "@/lib/data/portfolio";
import { formatSignedTHB, formatTHB } from "@/lib/utils/currency";
import { plColor } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import type { PeriodTotals } from "@/lib/calculations/reports";

export const metadata: Metadata = { title: "รายงาน" };

const monthName = new Intl.DateTimeFormat("th-TH", { month: "long", timeZone: "UTC" });
const buddhistYear = (year: string) => String(Number(year) + 543);

function TotalsTable({ rows, label }: { rows: PeriodTotals[]; label: (period: string) => React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-slate-50 text-right text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left font-medium">ช่วงเวลา</th>
            <th className="px-4 py-3 font-medium">ซื้อ</th>
            <th className="px-4 py-3 font-medium">ขาย</th>
            <th className="px-4 py-3 font-medium">กำไรที่รับรู้</th>
            <th className="px-4 py-3 font-medium">เงินปันผล</th>
            <th className="px-4 py-3 font-medium">ค่าธรรมเนียม</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-right tabular-nums">
          {rows.map((r) => (
            <tr key={r.period}>
              <td className="px-4 py-3 text-left">{label(r.period)}</td>
              <td className="px-4 py-3">{formatTHB(r.bought)}</td>
              <td className="px-4 py-3">{formatTHB(r.sold)}</td>
              <td className={`px-4 py-3 font-medium ${plColor(r.realizedPL)}`}>{formatSignedTHB(r.realizedPL)}</td>
              <td className="px-4 py-3">{formatTHB(r.dividends)}</td>
              <td className="px-4 py-3 text-slate-500">{formatTHB(r.costs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { years, months } = await getReports();
  const requested = (await searchParams).year;
  const year = years.find((y) => y.period === requested)?.period ?? years[0]?.period;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">รายงาน</h1>

      {years.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">ยังไม่มีรายการซื้อขาย</p>
        </Card>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">สรุปรายปี</h2>
            <TotalsTable
              rows={years}
              label={(p) => (
                <Link href={`/reports?year=${p}`} className="font-medium hover:underline">
                  {buddhistYear(p)}
                </Link>
              )}
            />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">รายเดือน ปี {buddhistYear(year)}</h2>
              <nav className="flex flex-wrap gap-1" aria-label="เลือกปี">
                {years.map((y) => (
                  <Link
                    key={y.period}
                    href={`/reports?year=${y.period}`}
                    aria-current={y.period === year ? "page" : undefined}
                    className="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 aria-[current=page]:bg-primary aria-[current=page]:text-white"
                  >
                    {buddhistYear(y.period)}
                  </Link>
                ))}
              </nav>
            </div>
            <TotalsTable
              rows={months.filter((m) => m.period.startsWith(`${year}-`))}
              label={(p) => monthName.format(Date.parse(`${p}-01T00:00:00Z`))}
            />
          </section>

          <p className="text-xs text-slate-400">
            กำไรที่รับรู้คิดด้วยต้นทุนเฉลี่ย ณ วันที่ขาย · เงินปันผลนับตามวันที่จ่าย · ค่าธรรมเนียมรวมค่าคอมและ VAT
          </p>
        </>
      )}
    </div>
  );
}
