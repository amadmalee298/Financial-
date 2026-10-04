"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { replayPosition } from "@/lib/calculations/profitLoss";
import { transactionTotal } from "@/lib/calculations/transaction";
import { formatThaiDate } from "@/lib/utils/date";
import { resolveStock } from "@/lib/data/stocks";
import { Decimal } from "@/lib/utils/decimal";
import {
  dateField,
  decimalField,
  type FieldErrors,
  type FormState,
  hasErrors,
  optionalText,
  symbolField,
  text,
} from "@/lib/utils/form";
import type { TransactionType } from "@/types/transaction";

export type TransactionFormState = FormState;

export async function saveTransaction(
  _prev: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const errors: FieldErrors = {};

  const id = text(formData, "id") || null;
  const symbol = symbolField(formData, errors);
  const type = text(formData, "transaction_type") as TransactionType;
  if (type !== "BUY" && type !== "SELL") errors.transaction_type = "เลือกซื้อหรือขาย";
  const tradeDate = dateField(formData, "trade_date", errors, { required: true });

  const quantity = decimalField(formData, "quantity", 4, errors, { required: true, positive: true });
  const price = decimalField(formData, "price", 4, errors, { required: true });
  const commission = decimalField(formData, "commission", 2, errors);
  const fees = decimalField(formData, "fees", 2, errors);
  const vat = decimalField(formData, "vat", 2, errors);

  if (hasErrors(errors) || !symbol || !tradeDate || !quantity || !price) {
    return { error: "กรุณาตรวจสอบข้อมูล", fieldErrors: errors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stock = await resolveStock(supabase, symbol);
  if (!stock) return { error: "ไม่สามารถเพิ่มหุ้นนี้ได้" };

  // Replay this stock's history in date order: shares held must never go
  // below zero at any point, including after back-dated entries or edits.
  const { data: history, error: historyError } = await supabase
    .from("transactions")
    .select("id, transaction_type, trade_date, created_at, quantity, price, total_amount")
    .eq("stock_id", stock.id);
  if (historyError) return { error: "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่" };

  const candidate = {
    id: id ?? "new",
    transaction_type: type,
    trade_date: tradeDate,
    created_at: history.find((tx) => tx.id === id)?.created_at ?? new Date().toISOString(),
    quantity,
    price,
    total_amount: transactionTotal({ type, quantity, price, commission, fees, vat }),
  };
  const position = replayPosition([...history.filter((tx) => tx.id !== id), candidate]);

  if (position.oversold) {
    const index = position.entries.findIndex((e) => e.transaction === position.oversold);
    const before = index > 0 ? position.entries[index - 1].sharesAfter : new Decimal(0);
    const date = formatThaiDate(position.oversold.trade_date);
    if (position.oversold === candidate) {
      return {
        error: `หุ้น ${symbol} ไม่พอขาย ณ วันที่ ${date} (มี ${before.toString()} หุ้น)`,
        fieldErrors: { quantity: "เกินจำนวนหุ้นที่มี" },
      };
    }
    return {
      error: `บันทึกไม่ได้ เพราะจะทำให้รายการขาย ${symbol} วันที่ ${date} มีหุ้นไม่พอขาย`,
    };
  }

  const record = {
    stock_id: stock.id,
    transaction_type: type,
    trade_date: tradeDate,
    quantity: quantity.toString(),
    price: price.toString(),
    commission: (commission ?? 0).toString(),
    fees: (fees ?? 0).toString(),
    vat: (vat ?? 0).toString(),
    broker: optionalText(formData, "broker", 100),
    note: optionalText(formData, "note"),
  };

  const { error } = id
    ? await supabase.from("transactions").update(record).eq("id", id)
    : await supabase.from("transactions").insert(record);

  if (error) return { error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };

  revalidatePath("/", "layout");
  redirect("/transactions");
}

export async function deleteTransaction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // RLS limits both queries to the signed-in user's own rows.
  const { data: target } = await supabase
    .from("transactions")
    .select("stock_id, transaction_type, stock:stocks(symbol)")
    .eq("id", id)
    .maybeSingle();
  if (!target) return { error: "ไม่พบรายการนี้" };

  if (target.transaction_type === "BUY") {
    const { data: history } = await supabase
      .from("transactions")
      .select("id, transaction_type, trade_date, created_at, quantity, price, total_amount")
      .eq("stock_id", target.stock_id)
      .neq("id", id);
    const position = replayPosition(history ?? []);
    if (position.oversold) {
      return {
        error: `ลบไม่ได้ เพราะรายการขาย ${target.stock?.symbol ?? ""} วันที่ ${formatThaiDate(position.oversold.trade_date)} จะมีหุ้นไม่พอขาย`,
      };
    }
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: "ลบไม่สำเร็จ กรุณาลองใหม่" };
  revalidatePath("/", "layout");
  return {};
}
