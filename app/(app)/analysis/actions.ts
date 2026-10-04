"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveStock } from "@/lib/data/stocks";
import { decimalField, type FieldErrors, type FormState, hasErrors, optionalText, symbolField } from "@/lib/utils/form";
import { ANALYSIS_NUMBER_FIELDS, ANALYSIS_TEXT_FIELDS } from "@/components/analysis/fields";

export async function saveAnalysis(_prev: FormState, formData: FormData): Promise<FormState> {
  const errors: FieldErrors = {};
  const symbol = symbolField(formData, errors);

  const record: Record<string, string | null> = {};
  for (const field of ANALYSIS_NUMBER_FIELDS) {
    record[field.key] =
      decimalField(formData, field.key, field.scale, errors, { allowNegative: field.allowNegative })?.toString() ?? null;
  }
  for (const field of ANALYSIS_TEXT_FIELDS) record[field.key] = optionalText(formData, field.key, 20_000);

  if (hasErrors(errors) || !symbol) return { error: "กรุณาตรวจสอบข้อมูล", fieldErrors: errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stock = await resolveStock(supabase, symbol);
  if (!stock) return { error: "ไม่สามารถเพิ่มหุ้นนี้ได้" };

  const { error } = await supabase
    .from("stock_analysis")
    .upsert({ ...record, stock_id: stock.id }, { onConflict: "user_id,stock_id" });
  if (error) return { error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };

  revalidatePath("/analysis", "layout");
  redirect(`/analysis/${encodeURIComponent(symbol)}?saved=1`);
}

export async function deleteAnalysis(stockId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("stock_analysis").delete().eq("stock_id", stockId);
  if (error) return { error: "ลบไม่สำเร็จ กรุณาลองใหม่" };
  revalidatePath("/analysis", "layout");
  redirect("/analysis");
}
