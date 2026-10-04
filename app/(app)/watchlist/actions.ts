"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveStock } from "@/lib/data/stocks";
import {
  decimalField,
  type FieldErrors,
  type FormState,
  hasErrors,
  optionalText,
  symbolField,
  text,
} from "@/lib/utils/form";

export async function saveWatch(_prev: FormState, formData: FormData): Promise<FormState> {
  const errors: FieldErrors = {};
  const id = text(formData, "id") || null;
  const symbol = symbolField(formData, errors);
  const buyPrice = decimalField(formData, "buy_price", 4, errors, { positive: true });
  const targetPrice = decimalField(formData, "target_price", 4, errors, { positive: true });
  if (buyPrice && targetPrice && targetPrice.lessThan(buyPrice)) {
    errors.target_price = "ราคาเป้าหมายควรสูงกว่าราคาที่อยากซื้อ";
  }
  if (hasErrors(errors) || !symbol) return { error: "กรุณาตรวจสอบข้อมูล", fieldErrors: errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stock = await resolveStock(supabase, symbol);
  if (!stock) return { error: "ไม่สามารถเพิ่มหุ้นนี้ได้" };

  const record = {
    stock_id: stock.id,
    buy_price: buyPrice?.toString() ?? null,
    target_price: targetPrice?.toString() ?? null,
    note: optionalText(formData, "note"),
  };
  const { error } = id
    ? await supabase.from("watchlists").update(record).eq("id", id)
    : await supabase.from("watchlists").insert(record);

  if (error?.code === "23505") {
    return { error: `${symbol} อยู่ใน Watchlist แล้ว`, fieldErrors: { symbol: "มีอยู่แล้ว" } };
  }
  if (error) return { error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };

  revalidatePath("/watchlist");
  redirect("/watchlist");
}

export async function deleteWatch(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("watchlists").delete().eq("id", id);
  if (error) return { error: "ลบไม่สำเร็จ กรุณาลองใหม่" };
  revalidatePath("/watchlist");
  return {};
}
