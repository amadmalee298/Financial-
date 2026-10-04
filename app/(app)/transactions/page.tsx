import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "รายการซื้อขาย" };

export default function Page() {
  return <ComingSoon title="รายการซื้อขาย" phase={2} />;
}
