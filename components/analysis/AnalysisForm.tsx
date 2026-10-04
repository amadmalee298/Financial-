"use client";

import { startTransition, useActionState } from "react";
import { saveAnalysis } from "@/app/(app)/analysis/actions";
import type { FormState } from "@/lib/utils/form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ANALYSIS_NUMBER_FIELDS, ANALYSIS_TEXT_FIELDS, type AnalysisFormValues } from "./fields";

export function AnalysisForm({ symbol, initial }: { symbol: string; initial: AnalysisFormValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAnalysis, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="symbol" value={symbol} />

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">บันทึกการลงทุน</h2>
        {ANALYSIS_TEXT_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <label htmlFor={field.key} className="text-sm font-medium text-slate-700">
              {field.label}
            </label>
            <textarea
              id={field.key}
              name={field.key}
              rows={field.key === "investment_thesis" ? 5 : 3}
              placeholder={field.placeholder}
              defaultValue={initial[field.key]}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 placeholder:text-slate-400 focus:border-primary focus:outline-none"
            />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">ตัวเลขสำคัญ</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {ANALYSIS_NUMBER_FIELDS.map((field) => (
            <Input
              key={field.key}
              id={field.key}
              name={field.key}
              label={field.label}
              inputMode="decimal"
              defaultValue={initial[field.key]}
              error={errors[field.key]}
            />
          ))}
        </div>
      </section>

      {state.error && (
        <p role="alert" className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกบทวิเคราะห์"}
        </Button>
      </div>
    </form>
  );
}
