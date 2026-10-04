"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { saveDividend } from "@/app/(app)/dividends/actions";
import { dividendAmounts } from "@/lib/calculations/dividend";
import { formatNumber, formatTHB } from "@/lib/utils/currency";
import { parseDecimal } from "@/lib/utils/decimal";
import type { FormState } from "@/lib/utils/form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StockSearch } from "@/components/stocks/StockSearch";
import type { Stock } from "@/types/transaction";

export type DividendFormValues = {
  id?: string;
  symbol: string;
  xd_date: string;
  payment_date: string;
  shares: string;
  dividend_per_share: string;
  withholding_tax: string;
  note: string;
};

/** Shares held after each trade date, per symbol (from the server). */
export type ShareHistory = Record<string, { date: string; shares: string }[]>;

const valid = (v: string) => (parseDecimal(v || "0") ? v || "0" : "0");

function eligibleShares(history: ShareHistory, symbol: string, xdDate: string) {
  let shares = "0";
  for (const point of history[symbol.toUpperCase()] ?? []) {
    if (point.date >= xdDate) break;
    shares = point.shares;
  }
  return shares;
}

export function DividendForm({
  stocks,
  history,
  initial,
}: {
  stocks: Stock[];
  history: ShareHistory;
  initial: DividendFormValues;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDividend, {});
  const [symbol, setSymbol] = useState(initial.symbol);
  const [xdDate, setXdDate] = useState(initial.xd_date);
  const [shares, setShares] = useState(initial.shares);
  const [dps, setDps] = useState(initial.dividend_per_share);
  // Auto 10% tax for new entries, and for edits whose saved tax was the default.
  const [autoTax, setAutoTax] = useState(
    () =>
      !initial.id ||
      dividendAmounts({ shares: valid(initial.shares), dividendPerShare: valid(initial.dividend_per_share) })
        .withholdingTax.equals(valid(initial.withholding_tax)),
  );
  const [manualTax, setManualTax] = useState(initial.withholding_tax);

  const amounts = dividendAmounts({
    shares: valid(shares),
    dividendPerShare: valid(dps),
    withholdingTax: autoTax ? null : valid(manualTax),
  });
  const tax = autoTax ? amounts.withholdingTax.toFixed(2) : manualTax;
  const eligible = symbol && xdDate ? eligibleShares(history, symbol, xdDate) : "0";
  const errors = state.fieldErrors ?? {};

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
      className="flex flex-col gap-4"
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <StockSearch stocks={stocks} defaultValue={initial.symbol} error={errors.symbol} onChange={setSymbol} />
        </div>
        <Input
          id="xd_date"
          name="xd_date"
          type="date"
          label="วันที่ XD"
          value={xdDate}
          onChange={(e) => setXdDate(e.target.value)}
          error={errors.xd_date}
        />
        <Input
          id="payment_date"
          name="payment_date"
          type="date"
          label="วันที่จ่าย"
          defaultValue={initial.payment_date}
          error={errors.payment_date}
          required
        />
        <div className="flex flex-col gap-1.5">
          <Input
            id="shares"
            name="shares"
            label="จำนวนหุ้นที่ได้รับปันผล"
            inputMode="decimal"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            error={errors.shares}
            required
          />
          {eligible !== "0" && eligible !== shares && (
            <button
              type="button"
              onClick={() => setShares(eligible)}
              className="self-start text-xs text-primary underline"
            >
              ใช้จำนวนที่ถือก่อนวัน XD ({formatNumber(eligible)} หุ้น)
            </button>
          )}
        </div>
        <Input
          id="dividend_per_share"
          name="dividend_per_share"
          label="ปันผลต่อหุ้น (บาท)"
          inputMode="decimal"
          placeholder="0.00"
          value={dps}
          onChange={(e) => setDps(e.target.value)}
          error={errors.dividend_per_share}
          required
        />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Input
            id="withholding_tax"
            name="withholding_tax"
            label="ภาษีหัก ณ ที่จ่าย"
            inputMode="decimal"
            value={tax}
            readOnly={autoTax}
            onChange={(e) => setManualTax(e.target.value)}
            error={errors.withholding_tax}
          />
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={autoTax}
              onChange={(e) => {
                if (!e.target.checked) setManualTax(tax);
                setAutoTax(e.target.checked);
              }}
            />
            คำนวณ 10% อัตโนมัติ (ปิดเมื่อได้รับเครดิตภาษีหรืออัตราอื่น)
          </label>
        </div>
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
        <dt className="text-slate-500">ปันผลก่อนภาษี</dt>
        <dd className="text-right tabular-nums">{formatTHB(amounts.gross)}</dd>
        <dt className="text-slate-500">ภาษีหัก ณ ที่จ่าย</dt>
        <dd className="text-right tabular-nums">{formatTHB(amounts.withholdingTax)}</dd>
        <dt className="font-medium">ได้รับสุทธิ</dt>
        <dd className="text-right font-semibold tabular-nums">{formatTHB(amounts.net)}</dd>
      </dl>

      {state.error && (
        <p role="alert" className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Link
          href="/dividends"
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
