"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDecimal } from "@/lib/utils/decimal";

export type PriceFormState = { error?: string };

export async function saveManualPrice(_prev: PriceFormState, formData: FormData): Promise<PriceFormState> {
  const stockId = String(formData.get("stock_id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/portfolio");
  const priceDate = String(formData.get("price_date") ?? "");
  const price = parseDecimal(String(formData.get("price") ?? "").trim());

  if (!price || price.isNegative() || price.isZero()) return { error: "ราคาต้องมากกว่า 0" };
  if (price.decimalPlaces() > 4) return { error: "ทศนิยมได้ไม่เกิน 4 ตำแหน่ง" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(priceDate) || Number.isNaN(Date.parse(priceDate))) {
    return { error: "วันที่ไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manual_prices")
    .upsert({ stock_id: stockId, price: price.toString(), price_date: priceDate }, { onConflict: "user_id,stock_id" });
  if (error) return { error: "บันทึกราคาไม่สำเร็จ" };

  revalidatePath("/", "layout");
  redirect(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/portfolio");
}

/** Go back to using the last trade price. */
export async function clearManualPrice(stockId: string) {
  const supabase = await createClient();
  await supabase.from("manual_prices").delete().eq("stock_id", stockId);
  revalidatePath("/", "layout");
}
