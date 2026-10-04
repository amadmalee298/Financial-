"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

export type ChartPoint = {
  date: string;
  marketValue: number;
  costBasis: number;
  estimated: boolean;
};

// Validated categorical pair (dataviz palette slots 1 and 2).
const VALUE_COLOR = "#2a78d6";
const COST_COLOR = "#eb6834";

const RANGES = [
  { key: "1M", label: "1 เดือน", months: 1 },
  { key: "3M", label: "3 เดือน", months: 3 },
  { key: "6M", label: "6 เดือน", months: 6 },
  { key: "YTD", label: "ต้นปี", months: 0 },
  { key: "1Y", label: "1 ปี", months: 12 },
  { key: "ALL", label: "ทั้งหมด", months: -1 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const baht = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
const bahtExact = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 });
const compact = new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);

function cutoff(range: RangeKey, last: string) {
  const end = new Date(toTime(last));
  const option = RANGES.find((r) => r.key === range)!;
  if (option.months < 0) return -Infinity;
  if (option.months === 0) return Date.UTC(end.getUTCFullYear(), 0, 1);
  return Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - option.months, end.getUTCDate());
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as ChartPoint & { t: number };
  const gain = point.marketValue - point.costBasis;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 text-slate-500">
        {fullDate.format(point.t)}
        {point.estimated && " · ประมาณ"}
      </p>
      {[
        { label: "มูลค่าพอร์ต", value: point.marketValue, color: VALUE_COLOR },
        { label: "ต้นทุน", value: point.costBasis, color: COST_COLOR },
      ].map((row) => (
        <p key={row.label} className="flex items-center gap-2">
          <span className="h-0.5 w-3 rounded" style={{ background: row.color }} aria-hidden />
          <span className="font-semibold text-primary tabular-nums">{bahtExact.format(row.value)}</span>
          <span className="text-slate-500">{row.label}</span>
        </p>
      ))}
      <p className="mt-1 text-slate-500 tabular-nums">
        ส่วนต่าง {gain >= 0 ? "+" : "-"}
        {bahtExact.format(Math.abs(gain))}
      </p>
    </div>
  );
}

export function PerformanceChart({ points }: { points: ChartPoint[] }) {
  const [range, setRange] = useState<RangeKey>("ALL");

  const data = useMemo(() => {
    if (points.length === 0) return [];
    const from = cutoff(range, points.at(-1)!.date);
    const all = points.map((p) => ({ ...p, t: toTime(p.date) }));
    const inRange = all.filter((p) => p.t >= from);
    // Start the line at the range edge with the last value before it.
    const before = all.filter((p) => p.t < from).at(-1);
    return before ? [{ ...before, t: from }, ...inRange] : inRange;
  }, [points, range]);

  // Mostly real daily closes → draw a continuous line; mostly estimates only
  // change on trade dates, so keep the honest steps.
  const dense = data.length > 0 && data.filter((p) => !p.estimated).length / data.length > 0.5;

  const spanDays = data.length > 1 ? (data.at(-1)!.t - data[0].t) / 86_400_000 : 0;
  const tickFormat = (t: number) => (spanDays > 120 ? monthYear.format(t) : shortDate.format(t));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="performance-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="performance-title" className="font-semibold">
          ผลการดำเนินงาน
        </h2>
        <div className="grid w-full grid-cols-6 gap-1 sm:flex sm:w-auto" role="group" aria-label="ช่วงเวลา">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={range === r.key}
              onClick={() => setRange(r.key)}
              className="rounded-md px-1 py-1 text-xs whitespace-nowrap text-slate-500 hover:bg-slate-100 aria-pressed:bg-primary aria-pressed:text-white sm:px-2.5"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-3 flex gap-4 text-xs text-slate-600">
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: VALUE_COLOR }} aria-hidden />
          มูลค่าพอร์ต
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: COST_COLOR }} aria-hidden />
          ต้นทุน
        </li>
      </ul>

      {data.length < 2 ? (
        <p className="py-16 text-center text-sm text-slate-500">ยังมีข้อมูลไม่พอสำหรับช่วงเวลานี้</p>
      ) : (
        <div className="mt-2 h-64" role="img" aria-label="กราฟมูลค่าพอร์ตเทียบกับต้นทุนตามเวลา">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={tickFormat}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => compact.format(v)}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={ChartTooltip} cursor={{ stroke: "#94a3b8", strokeWidth: 1 }} />
              <Area
                type={dense ? "linear" : "stepAfter"}
                dataKey="marketValue"
                stroke={VALUE_COLOR}
                strokeWidth={2}
                fill={VALUE_COLOR}
                fillOpacity={0.1}
                activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="stepAfter"
                dataKey="costBasis"
                stroke={COST_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-2 text-xs text-slate-400">
        ราคาย้อนหลังใช้ราคาปิดรายวันจากตลาดเมื่อกด “อัปเดตราคา” ช่วงที่ยังไม่มีราคาปิดจะประมาณจากราคาซื้อขายล่าสุด (ระบุว่า “ประมาณ”) ·
        บันทึกมูลค่าจริงทุกวันที่เปิดหน้านี้
      </p>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-xs text-slate-500 hover:text-primary">ดูเป็นตาราง</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white text-right text-slate-500">
              <tr>
                <th className="py-1 text-left font-medium">วันที่</th>
                <th className="py-1 font-medium">มูลค่าพอร์ต</th>
                <th className="py-1 font-medium">ต้นทุน</th>
              </tr>
            </thead>
            <tbody className="text-right tabular-nums">
              {[...data].reverse().map((p) => (
                <tr key={p.t} className="border-t border-slate-100">
                  <td className="py-1 text-left">
                    {fullDate.format(p.t)}
                    {p.estimated && <span className="text-slate-400"> (ประมาณ)</span>}
                  </td>
                  <td className="py-1">{baht.format(p.marketValue)}</td>
                  <td className="py-1">{baht.format(p.costBasis)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
