import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "วิเคราะห์หุ้น" };

export default function Page() {
  return <ComingSoon title="วิเคราะห์หุ้น" phase={5} />;
}
