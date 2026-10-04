import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "เงินปันผล" };

export default function Page() {
  return <ComingSoon title="เงินปันผล" phase={5} />;
}
