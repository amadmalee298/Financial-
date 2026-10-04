"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDecimal } from "@/lib/utils/decimal";
import { refreshPrices, type RefreshResult } from "@/lib/prices/refresh";
import { getRefreshTargets } from "@/lib/prices/targets";

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

export type RefreshState = { result?: RefreshResult; error?: string };

/**
 * Fetch market prices for the signed-in user's holdings and watchlist.
 * The prices are shared by everyone, so stocks refreshed in the last few
 * minutes are skipped (see FRESH_MINUTES) and one click cannot be spammed
 * into a flood of requests to the data provider.
 */
export async function refreshMyPrices(): Promise<RefreshState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY บนเซิร์ฟเวอร์" };
  }

  try {
    const targets = await getRefreshTargets(supabase);
    if (targets.length === 0) return { error: "ยังไม่มีหุ้นให้อัปเดต" };
    const result = await refreshPrices(targets);
    revalidatePath("/", "layout");
    return { result };
  } catch {
    return { error: "อัปเดตราคาไม่สำเร็จ กรุณาลองใหม่" };
  }
}
