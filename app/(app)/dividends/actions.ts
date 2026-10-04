"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveStock } from "@/lib/data/stocks";
import { dividendAmounts } from "@/lib/calculations/dividend";
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

export async function saveDividend(_prev: FormState, formData: FormData): Promise<FormState> {
  const errors: FieldErrors = {};
  const id = text(formData, "id") || null;
  const symbol = symbolField(formData, errors);
  const xdDate = dateField(formData, "xd_date", errors);
  const paymentDate = dateField(formData, "payment_date", errors, { required: true });
  const shares = decimalField(formData, "shares", 4, errors, { required: true, positive: true });
  const dividendPerShare = decimalField(formData, "dividend_per_share", 4, errors, { required: true, positive: true });
  const withholdingTax = decimalField(formData, "withholding_tax", 2, errors);

  if (xdDate && paymentDate && paymentDate < xdDate) errors.payment_date = "วันจ่ายต้องไม่ก่อนวัน XD";
  if (hasErrors(errors) || !symbol || !paymentDate || !shares || !dividendPerShare) {
    return { error: "กรุณาตรวจสอบข้อมูล", fieldErrors: errors };
  }

  const amounts = dividendAmounts({ shares, dividendPerShare, withholdingTax });
  if (amounts.net.isNegative()) {
    return { error: "ภาษีหัก ณ ที่จ่ายมากกว่าเงินปันผล", fieldErrors: { withholding_tax: "มากกว่าเงินปันผล" } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stock = await resolveStock(supabase, symbol);
  if (!stock) return { error: "ไม่สามารถเพิ่มหุ้นนี้ได้" };

  const record = {
    stock_id: stock.id,
    xd_date: xdDate,
    payment_date: paymentDate,
    shares: shares.toString(),
    dividend_per_share: dividendPerShare.toString(),
    gross_amount: amounts.gross.toString(),
    withholding_tax: amounts.withholdingTax.toString(),
    net_amount: amounts.net.toString(),
    note: optionalText(formData, "note"),
  };

  const { error } = id
    ? await supabase.from("dividends").update(record).eq("id", id)
    : await supabase.from("dividends").insert(record);
  if (error) return { error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };

  revalidatePath("/", "layout");
  redirect("/dividends");
}

export async function deleteDividend(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("dividends").delete().eq("id", id);
  if (error) return { error: "ลบไม่สำเร็จ กรุณาลองใหม่" };
  revalidatePath("/", "layout");
  return {};
}
