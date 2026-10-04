import type { Metadata } from "next";
import Link from "next/link";
import { getPortfolio } from "@/lib/data/portfolio";
import { Card } from "@/components/ui/Card";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { TopHoldings } from "@/components/dashboard/TopHoldings";

export const metadata: Metadata = { title: "ภาพรวม" };

export default async function DashboardPage() {
  const { holdings, summary } = await getPortfolio();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">ภาพรวม</h1>

      <PortfolioSummary summary={summary} />

      {holdings.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            ยังไม่มีข้อมูล{" "}
            <Link href="/transactions?new=1" className="font-medium text-primary underline">
              บันทึกการซื้อหุ้นครั้งแรก
            </Link>
          </p>
        </Card>
      ) : (
        <TopHoldings holdings={holdings} />
      )}

      <p className="text-xs text-slate-400">กราฟผลตอบแทนและสัดส่วนพอร์ตจะมาใน Phase 4</p>
    </div>
  );
}
