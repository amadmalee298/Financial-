import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Watchlist" };

export default function Page() {
  return <ComingSoon title="Watchlist" phase={5} />;
}
