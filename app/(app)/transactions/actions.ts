"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { replayPosition } from "@/lib/calculations/profitLoss";
import { transactionTotal } from "@/lib/calculations/transaction";
import { formatThaiDate } from "@/lib/utils/date";
import { Decimal, parseDecimal } from "@/lib/utils/decimal";
import type { TransactionType } from "@/types/transaction";

export type TransactionFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const SYMBOL_PATTERN = /^[A-Z0-9.&-]{1,20}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** Parses a non-negative decimal with at most `scale` decimal places. */
function amount(
  formData: FormData,
  key: string,
  scale: number,
  errors: Record<string, string>,
  { required = false, positive = false } = {},
): Decimal | null {
  const raw = text(formData, key);
  if (!raw) {
    if (required) errors[key] = "จำเป็นต้องกรอก";
    return null;
  }
  const value = parseDecimal(raw);
  if (!value || value.isNegative() || (positive && value.isZero())) {
    errors[key] = positive ? "ต้องมากกว่า 0" : "ต้องเป็นตัวเลขไม่ติดลบ";
    return null;
  }
  if (value.decimalPlaces() > scale) {
    errors[key] = `ทศนิยมได้ไม่เกิน ${scale} ตำแหน่ง`;
    return null;
  }
  return value;
}

export async function saveTransaction(
  _prev: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const errors: Record<string, string> = {};

  const id = text(formData, "id") || null;
  const symbol = text(formData, "symbol").toUpperCase();
  const type = text(formData, "transaction_type") as TransactionType;
  const tradeDate = text(formData, "trade_date");

  if (!SYMBOL_PATTERN.test(symbol)) errors.symbol = "กรุณาระบุชื่อย่อหุ้น เช่น PTT";
  if (type !== "BUY" && type !== "SELL") errors.transaction_type = "เลือกซื้อหรือขาย";
  if (!DATE_PATTERN.test(tradeDate) || Number.isNaN(Date.parse(tradeDate))) {
    errors.trade_date = "วันที่ไม่ถูกต้อง";
  }

  const quantity = amount(formData, "quantity", 4, errors, { required: true, positive: true });
  const price = amount(formData, "price", 4, errors, { required: true });
  const commission = amount(formData, "commission", 2, errors);
  const fees = amount(formData, "fees", 2, errors);
  const vat = amount(formData, "vat", 2, errors);

  if (Object.keys(errors).length > 0 || !quantity || !price) {
    return { error: "กรุณาตรวจสอบข้อมูล", fieldErrors: errors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Find the stock, or add it to the shared list if this is a new symbol.
  const market = "SET";
  let { data: stock } = await supabase
    .from("stocks")
    .select("id")
    .eq("symbol", symbol)
    .eq("market", market)
    .maybeSingle();

  if (!stock) {
    const inserted = await supabase
      .from("stocks")
      .insert({ symbol, market })
      .select("id")
      .single();
    if (inserted.error) {
      // Another request may have added it at the same moment.
      const retry = await supabase
        .from("stocks")
        .select("id")
        .eq("symbol", symbol)
        .eq("market", market)
        .maybeSingle();
      stock = retry.data;
    } else {
      stock = inserted.data;
    }
  }
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
    broker: text(formData, "broker") || null,
    note: text(formData, "note") || null,
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
