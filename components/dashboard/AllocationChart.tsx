"use client";

import { useState } from "react";

export type AllocationRow = { label: string; value: number; weight: number };

const BAR_COLOR = "#2a78d6";
const baht = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });

/** Horizontal bars of portfolio weight, by stock or by sector. */
export function AllocationChart({ bySymbol, bySector }: { bySymbol: AllocationRow[]; bySector: AllocationRow[] }) {
  const [mode, setMode] = useState<"symbol" | "sector">("symbol");
  const rows = mode === "symbol" ? bySymbol : bySector;
  const max = Math.max(...rows.map((r) => r.weight), 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="allocation-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="allocation-title" className="font-semibold">
          สัดส่วนพอร์ต
        </h2>
        <div className="flex gap-1" role="group" aria-label="จัดกลุ่มตาม">
          {(
            [
              ["symbol", "รายหุ้น"],
              ["sector", "รายกลุ่ม"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
              className="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 aria-pressed:bg-primary aria-pressed:text-white"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีหุ้นที่ถืออยู่</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <li
              key={row.label}
              className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3 text-sm"
              title={`${row.label}: ${baht.format(row.value)}`}
            >
              <span className="truncate font-medium">{row.label}</span>
              <span className="h-5" aria-hidden>
                <span
                  className="block h-full rounded-r"
                  style={{ width: `${max > 0 ? (row.weight / max) * 100 : 0}%`, minWidth: 2, background: BAR_COLOR }}
                />
              </span>
              <span className="text-right text-slate-600 tabular-nums">{(row.weight * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
