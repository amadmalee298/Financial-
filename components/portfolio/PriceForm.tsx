"use client";

import { startTransition, useActionState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearManualPrice, saveManualPrice, type PriceFormState } from "@/app/(app)/portfolio/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function PriceForm({
  stockId,
  symbol,
  currentPrice,
  today,
  hasManualPrice,
  returnTo,
}: {
  stockId: string;
  symbol: string;
  currentPrice: string;
  today: string;
  hasManualPrice: boolean;
  returnTo: string;
}) {
  const [state, action, pending] = useActionState<PriceFormState, FormData>(saveManualPrice, {});
  const [clearing, startClearing] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="stock_id" value={stockId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <p className="text-sm text-slate-500">
        กรอกราคาปัจจุบันของ {symbol} เองได้ ราคานี้ใช้แทนราคาตลาดจนกว่าจะมีราคาปิดที่ใหม่กว่าวันที่ที่ระบุ
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="price" name="price" label="ราคาต่อหุ้น (บาท)" inputMode="decimal" defaultValue={currentPrice} required autoFocus />
        <Input id="price_date" name="price_date" type="date" label="ณ วันที่" defaultValue={today} required />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {hasManualPrice && (
          <button
            type="button"
            disabled={clearing}
            onClick={() =>
              startClearing(async () => {
                await clearManualPrice(stockId);
                router.push(returnTo, { scroll: false });
              })
            }
            className="mr-auto rounded-lg px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            {clearing ? "กำลังล้าง…" : "ล้างราคาที่กรอกเอง"}
          </button>
        )}
        <Link href={returnTo} scroll={false} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          ยกเลิก
        </Link>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกราคา"}
        </Button>
      </div>
    </form>
  );
}
