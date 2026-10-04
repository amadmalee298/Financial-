"use client";

import { startTransition, useActionState } from "react";
import Link from "next/link";
import { saveWatch } from "@/app/(app)/watchlist/actions";
import type { FormState } from "@/lib/utils/form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StockSearch } from "@/components/stocks/StockSearch";
import type { Stock } from "@/types/transaction";

export type WatchFormValues = {
  id?: string;
  symbol: string;
  buy_price: string;
  target_price: string;
  note: string;
};

export function WatchForm({ stocks, initial }: { stocks: Stock[]; initial: WatchFormValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveWatch, {});
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
      <StockSearch stocks={stocks} defaultValue={initial.symbol} error={errors.symbol} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="buy_price"
          name="buy_price"
          label="ราคาที่อยากซื้อ"
          inputMode="decimal"
          placeholder="ไม่บังคับ"
          defaultValue={initial.buy_price}
          error={errors.buy_price}
        />
        <Input
          id="target_price"
          name="target_price"
          label="ราคาเป้าหมาย"
          inputMode="decimal"
          placeholder="ไม่บังคับ"
          defaultValue={initial.target_price}
          error={errors.target_price}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-medium text-slate-700">
          เหตุผลที่สนใจ
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={initial.note}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-primary focus:outline-none"
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Link
          href="/watchlist"
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
