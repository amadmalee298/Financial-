import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "พอร์ตการลงทุน" };

export default function Page() {
  return <ComingSoon title="พอร์ตการลงทุน" phase={3} />;
}
