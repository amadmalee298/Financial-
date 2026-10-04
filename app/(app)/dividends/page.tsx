import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getShareHistory } from "@/lib/data/portfolio";
import { formatTHB } from "@/lib/utils/currency";
import { todayISO } from "@/lib/utils/date";
import { toDecimal } from "@/lib/utils/decimal";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { DividendForm, type DividendFormValues } from "@/components/dividends/DividendForm";
import { DividendTable } from "@/components/dividends/DividendTable";
import type { DividendWithStock } from "@/types/transaction";

export const metadata: Metadata = { title: "เงินปันผล" };

type SearchParams = Promise<{ new?: string; edit?: string; year?: string; symbol?: string }>;

const buddhistYear = (year: string) => String(Number(year) + 543);

export default async function DividendsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: dividends, error }, { data: stocks }, history] = await Promise.all([
    supabase
      .from("dividends")
      .select("*, stock:stocks!inner(symbol, name)")
      .order("payment_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .returns<DividendWithStock[]>(),
    supabase.from("stocks").select("id, symbol, name, market, sector").order("symbol"),
    getShareHistory(),
  ]);
  if (error) throw new Error("โหลดเงินปันผลไม่สำเร็จ");

  const yearOf = (d: DividendWithStock) => (d.payment_date ?? d.xd_date ?? "").slice(0, 4);
  const years = [...new Set(dividends.map(yearOf).filter(Boolean))].sort().reverse();
  const year = params.year && years.includes(params.year) ? params.year : null;
  const shown = year ? dividends.filter((d) => yearOf(d) === year) : dividends;

  const sum = (rows: DividendWithStock[]) => rows.reduce((acc, d) => acc.plus(toDecimal(d.net_amount)), toDecimal(0));
  const thisYear = todayISO().slice(0, 4);
  const lastYear = String(Number(thisYear) - 1);
  const stats = [
    { label: `ปี ${buddhistYear(thisYear)}`, value: sum(dividends.filter((d) => yearOf(d) === thisYear)) },
    { label: `ปี ${buddhistYear(lastYear)}`, value: sum(dividends.filter((d) => yearOf(d) === lastYear)) },
    { label: "ทั้งหมด", value: sum(dividends) },
  ];

  let formValues: DividendFormValues | null = null;
  if (params.edit) {
    const d = dividends.find((row) => row.id === params.edit);
    if (!d) notFound();
    formValues = {
      id: d.id,
      symbol: d.stock.symbol,
      xd_date: d.xd_date ?? "",
      payment_date: d.payment_date ?? "",
      shares: String(d.shares ?? ""),
      dividend_per_share: String(d.dividend_per_share ?? ""),
      withholding_tax: String(d.withholding_tax ?? ""),
      note: d.note ?? "",
    };
  } else if (params.new) {
    formValues = {
      symbol: params.symbol?.toUpperCase() ?? "",
      xd_date: "",
      payment_date: todayISO(),
      shares: "",
      dividend_per_share: "",
      withholding_tax: "",
      note: "",
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">เงินปันผล</h1>
        <Link
          href="/dividends?new=1"
          scroll={false}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary"
        >
          + บันทึกปันผล
        </Link>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="text-xs text-slate-500">ปันผลสุทธิ {s.label}</dt>
            <dd className="mt-1 font-semibold tabular-nums">{formatTHB(s.value)}</dd>
          </div>
        ))}
      </dl>

      {years.length > 1 && (
        <nav className="flex flex-wrap gap-1" aria-label="กรองตามปี">
          {[null, ...years].map((y) => (
            <Link
              key={y ?? "all"}
              href={y ? `/dividends?year=${y}` : "/dividends"}
              aria-current={y === year ? "page" : undefined}
              className="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 aria-[current=page]:bg-primary aria-[current=page]:text-white"
            >
              {y ? buddhistYear(y) : "ทุกปี"}
            </Link>
          ))}
        </nav>
      )}

      {shown.length > 0 ? (
        <DividendTable dividends={shown} />
      ) : (
        <Card className="text-center">
          <p className="text-sm text-slate-500">ยังไม่มีการบันทึกเงินปันผล</p>
        </Card>
      )}

      {formValues && (
        <Modal title={formValues.id ? "แก้ไขเงินปันผล" : "บันทึกเงินปันผล"} closeHref="/dividends">
          <DividendForm
            key={formValues.id ?? "new"}
            stocks={stocks ?? []}
            history={history}
            initial={formValues}
          />
        </Modal>
      )}
    </div>
  );
}
