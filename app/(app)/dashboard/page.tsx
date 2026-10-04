import type { Metadata } from "next";
import Link from "next/link";
import { getPerformance, getPortfolio, recordSnapshot } from "@/lib/data/portfolio";
import { allocation } from "@/lib/calculations/allocation";
import { Card } from "@/components/ui/Card";
import { AllocationChart, type AllocationRow } from "@/components/dashboard/AllocationChart";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { ReturnChart } from "@/components/dashboard/ReturnChart";
import { TopHoldings } from "@/components/dashboard/TopHoldings";
import type { AllocationSlice } from "@/lib/calculations/allocation";

export const metadata: Metadata = { title: "ภาพรวม" };

// Decimal → number happens only here, at the boundary to client charts.
const toRows = (slices: AllocationSlice[]): AllocationRow[] =>
  slices.map((s) => ({ label: s.label, value: s.value.toNumber(), weight: s.weight.toNumber() }));

export default async function DashboardPage() {
  const [{ holdings, summary }, performance] = await Promise.all([getPortfolio(), getPerformance()]);
  await recordSnapshot();

  if (holdings.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">ภาพรวม</h1>
        <PortfolioSummary summary={summary} />
        <Card>
          <p className="text-sm text-slate-500">
            ยังไม่มีข้อมูล{" "}
            <Link href="/transactions?new=1" className="font-medium text-primary underline">
              บันทึกการซื้อหุ้นครั้งแรก
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">ภาพรวม</h1>
      <PortfolioSummary summary={summary} />
      <PerformanceChart
        points={performance.map((p) => ({
          date: p.date,
          marketValue: p.marketValue.toNumber(),
          costBasis: p.costBasis.toNumber(),
          estimated: p.estimated,
        }))}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AllocationChart
          bySymbol={toRows(allocation(holdings, (h) => h.symbol, 6))}
          bySector={toRows(allocation(holdings, (h) => h.sector ?? "ไม่ระบุกลุ่ม", 6))}
        />
        <TopHoldings holdings={holdings} />
      </div>
      <ReturnChart holdings={holdings} />
    </div>
  );
}
