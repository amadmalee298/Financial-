"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { netQuantity } from "@/lib/calculations/transaction";
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

  // Shares held must never go below zero after this change.
  let others = supabase
    .from("transactions")
    .select("transaction_type, quantity")
    .eq("stock_id", stock.id);
  if (id) others = others.neq("id", id);
  const { data: existing, error: existingError } = await others;
  if (existingError) return { error: "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่" };

  const held = netQuantity([...existing, { transaction_type: type, quantity }]);
  if (held.isNegative()) {
    if (type === "BUY") {
      return {
        error: `ลดจำนวนไม่ได้ เพราะหุ้น ${symbol} ที่ขายไปแล้วจะมากกว่าที่ซื้อ`,
        fieldErrors: { quantity: "น้อยกว่าจำนวนที่ขายไปแล้ว" },
      };
    }
    const available = Decimal.max(netQuantity(existing), 0);
    return {
      error: `จำนวนหุ้น ${symbol} ไม่พอขาย (คงเหลือ ${available.toString()} หุ้น)`,
      fieldErrors: { quantity: "เกินจำนวนหุ้นที่มี" },
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

  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  // RLS limits this to the signed-in user's own rows.
  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/transactions");
}
