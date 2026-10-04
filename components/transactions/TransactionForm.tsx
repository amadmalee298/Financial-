"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { saveTransaction, type TransactionFormState } from "@/app/(app)/transactions/actions";
import { grossAmount, totalCosts, transactionTotal, vatOnCommission } from "@/lib/calculations/transaction";
import { formatTHB } from "@/lib/utils/currency";
import { parseDecimal } from "@/lib/utils/decimal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StockSearch } from "@/components/stocks/StockSearch";
import type { Stock, TransactionType } from "@/types/transaction";

export type TransactionFormValues = {
  id?: string;
  symbol?: string;
  transaction_type: TransactionType;
  trade_date: string;
  quantity: string;
  price: string;
  commission: string;
  fees: string;
  vat: string;
  broker: string;
  note: string;
};

const valid = (v: string) => (parseDecimal(v || "0") ? v || "0" : "0");

export function TransactionForm({
  stocks,
  initial,
}: {
  stocks: Stock[];
  initial: TransactionFormValues;
}) {
  const [state, action, pending] = useActionState<TransactionFormState, FormData>(saveTransaction, {});
  const [type, setType] = useState<TransactionType>(initial.transaction_type);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [price, setPrice] = useState(initial.price);
  const [commission, setCommission] = useState(initial.commission);
  const [fees, setFees] = useState(initial.fees);
  // Auto VAT (7% of commission) for new entries, and for edits whose saved VAT was the default.
  const [autoVat, setAutoVat] = useState(
    () => !initial.id || vatOnCommission(valid(initial.commission)).equals(valid(initial.vat)),
  );
  const [manualVat, setManualVat] = useState(initial.vat);

  const vat = autoVat ? vatOnCommission(valid(commission)).toFixed(2) : manualVat;
  const amounts = {
    type,
    quantity: valid(quantity),
    price: valid(price),
    commission: valid(commission),
    fees: valid(fees),
    vat: valid(vat),
  };
  const errors = state.fieldErrors ?? {};

  return (
    <form
      // Submit via onSubmit rather than `action` so React does not reset the
      // fields when the server returns a validation error.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
      className="flex flex-col gap-4"
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="transaction_type" value={type} />

      <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm" role="radiogroup" aria-label="ประเภท">
        {(["BUY", "SELL"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`rounded-md py-2 font-medium transition-colors ${
              type === t
                ? t === "BUY"
                  ? "bg-positive text-white"
                  : "bg-negative text-white"
                : "text-slate-500 hover:text-primary"
            }`}
          >
            {t === "BUY" ? "ซื้อ" : "ขาย"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StockSearch stocks={stocks} defaultValue={initial.symbol} error={errors.symbol} />
        <Input
          id="trade_date"
          name="trade_date"
          type="date"
          label="วันที่ซื้อขาย"
          defaultValue={initial.trade_date}
          error={errors.trade_date}
          required
        />
        <Input
          id="quantity"
          name="quantity"
          label="จำนวนหุ้น"
          inputMode="decimal"
          placeholder="100"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={errors.quantity}
          required
        />
        <Input
          id="price"
          name="price"
          label="ราคาต่อหุ้น (บาท)"
          inputMode="decimal"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={errors.price}
          required
        />
        <Input
          id="commission"
          name="commission"
          label="ค่าคอมมิชชั่น"
          inputMode="decimal"
          placeholder="0.00"
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          error={errors.commission}
        />
        <Input
          id="fees"
          name="fees"
          label="ค่าธรรมเนียมอื่น"
          inputMode="decimal"
          placeholder="0.00"
          value={fees}
          onChange={(e) => setFees(e.target.value)}
          error={errors.fees}
        />
        <div className="flex flex-col gap-1.5">
          <Input
            id="vat"
            name="vat"
            label="VAT"
            inputMode="decimal"
            value={vat}
            readOnly={autoVat}
            onChange={(e) => setManualVat(e.target.value)}
            error={errors.vat}
          />
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={autoVat}
              onChange={(e) => {
                if (!e.target.checked) setManualVat(vat);
                setAutoVat(e.target.checked);
              }}
            />
            คำนวณ 7% ของค่าคอมอัตโนมัติ
          </label>
        </div>
        <Input id="broker" name="broker" label="โบรกเกอร์" defaultValue={initial.broker} placeholder="ไม่บังคับ" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-medium text-slate-700">
          หมายเหตุ
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          defaultValue={initial.note}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-primary focus:outline-none"
        />
      </div>

      <dl className="grid grid-cols-2 gap-y-1 rounded-xl bg-slate-50 p-4 text-sm">
        <dt className="text-slate-500">มูลค่าหุ้น</dt>
        <dd className="text-right tabular-nums">{formatTHB(grossAmount(amounts))}</dd>
        <dt className="text-slate-500">ค่าใช้จ่ายรวม</dt>
        <dd className="text-right tabular-nums">{formatTHB(totalCosts(amounts))}</dd>
        <dt className="font-medium">{type === "BUY" ? "ยอดชำระ" : "ยอดรับสุทธิ"}</dt>
        <dd className="text-right font-semibold tabular-nums">{formatTHB(transactionTotal(amounts))}</dd>
      </dl>

      {state.error && (
        <p role="alert" className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Link
          href="/transactions"
          scroll={false}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          ยกเลิก
        </Link>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </div>
    </form>
  );
}
