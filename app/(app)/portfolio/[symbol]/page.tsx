import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

type Props = { params: Promise<{ symbol: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  return { title: decodeURIComponent(symbol).toUpperCase() };
}

export default async function HoldingPage({ params }: Props) {
  const { symbol } = await params;
  return <ComingSoon title={decodeURIComponent(symbol).toUpperCase()} phase={3} />;
}
