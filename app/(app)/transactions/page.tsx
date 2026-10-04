import type { Metadata } from "next";
import { loadError } from "@/lib/utils/errors";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { TransactionForm, type TransactionFormValues } from "@/components/transactions/TransactionForm";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import type { TransactionWithStock } from "@/types/transaction";
import { todayISO } from "@/lib/utils/date";

export const metadata: Metadata = { title: "รายการซื้อขาย" };

type SearchParams = Promise<{ new?: string; edit?: string; symbol?: string; type?: string }>;

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select("*, stock:stocks!inner(symbol, name, market)")
    .order("trade_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (params.symbol) query = query.eq("stock.symbol", params.symbol.toUpperCase());
  if (params.type === "BUY" || params.type === "SELL") query = query.eq("transaction_type", params.type);

  const [{ data: transactions, error }, { data: stocks }] = await Promise.all([
    query.returns<TransactionWithStock[]>(),
    supabase.from("stocks").select("id, symbol, name, market, sector").order("symbol"),
  ]);
  if (error) throw loadError("transactions", "โหลดรายการซื้อขายไม่สำเร็จ", error);

  let formValues: TransactionFormValues | null = null;
  if (params.edit) {
    const { data: tx } = await supabase
      .from("transactions")
      .select("*, stock:stocks(symbol)")
      .eq("id", params.edit)
      .maybeSingle();
    if (!tx || !tx.stock) notFound();
    formValues = {
      id: tx.id,
      symbol: tx.stock.symbol,
      transaction_type: tx.transaction_type,
      trade_date: tx.trade_date,
      quantity: String(tx.quantity),
      price: String(tx.price),
      commission: String(tx.commission),
      fees: String(tx.fees),
      vat: String(tx.vat),
      broker: tx.broker ?? "",
      note: tx.note ?? "",
    };
  } else if (params.new) {
    formValues = {
      symbol: params.symbol?.toUpperCase(),
      transaction_type: "BUY",
      trade_date: todayISO(),
      quantity: "",
      price: "",
      commission: "",
      fees: "",
      vat: "",
      broker: "",
      note: "",
    };
  }

  const filtered = Boolean(params.symbol || params.type);
  const symbols = [...new Set((stocks ?? []).map((s) => s.symbol))];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">รายการซื้อขาย</h1>
        <Link
          href="/transactions?new=1"
          scroll={false}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary"
        >
          + เพิ่มรายการ
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-2" role="search">
        <label className="sr-only" htmlFor="filter-symbol">หุ้น</label>
        <select
          id="filter-symbol"
          name="symbol"
          defaultValue={params.symbol?.toUpperCase() ?? ""}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">ทุกหุ้น</option>
          {symbols.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filter-type">ประเภท</label>
        <select
          id="filter-type"
          name="type"
          defaultValue={params.type ?? ""}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">ซื้อและขาย</option>
          <option value="BUY">ซื้อ</option>
          <option value="SELL">ขาย</option>
        </select>
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
          กรอง
        </button>
        {filtered && (
          <Link href="/transactions" className="px-2 py-2 text-sm text-slate-500 hover:text-primary">
            ล้างตัวกรอง
          </Link>
        )}
      </form>

      {transactions.length > 0 ? (
        <TransactionTable transactions={transactions} />
      ) : (
        <Card className="text-center">
          <p className="text-sm text-slate-500">
            {filtered ? "ไม่พบรายการตามตัวกรอง" : "ยังไม่มีรายการซื้อขาย เริ่มบันทึกรายการแรกได้เลย"}
          </p>
        </Card>
      )}

      {formValues && (
        <Modal title={formValues.id ? "แก้ไขรายการ" : "เพิ่มรายการซื้อขาย"} closeHref="/transactions">
          <TransactionForm key={formValues.id ?? "new"} stocks={stocks ?? []} initial={formValues} />
        </Modal>
      )}
    </div>
  );
}
