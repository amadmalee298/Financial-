import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { formatTHB } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "ภาพรวม" };

const stats = [
  { label: "เงินลงทุน", value: 0 },
  { label: "เงินสด", value: 0 },
  { label: "เงินปันผล", value: 0 },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">ภาพรวม</h1>

      <Card className="border-0 bg-primary text-white">
        <p className="text-sm text-slate-400">มูลค่าพอร์ต</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatTHB(0)}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-700 pt-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums sm:text-base">
                {formatTHB(stat.value)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-sm text-slate-500">
          บันทึกรายการซื้อขายได้ที่เมนู “ซื้อขาย” — การคำนวณพอร์ตและกำไร/ขาดทุนจะมาใน Phase 3
          ส่วนกราฟและสัดส่วนพอร์ตจะมาใน Phase 4
        </p>
      </Card>
    </div>
  );
}
