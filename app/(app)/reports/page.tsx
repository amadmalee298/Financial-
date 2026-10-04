import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "รายงาน" };

export default function Page() {
  return <ComingSoon title="รายงาน" phase={4} />;
}
