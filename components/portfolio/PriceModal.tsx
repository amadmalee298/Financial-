import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils/date";
import { Modal } from "@/components/ui/Modal";
import { PriceForm } from "./PriceForm";

/** Server wrapper that opens the manual-price form for a stock. */
export async function PriceModal({
  stockId,
  symbol,
  currentPrice,
  returnTo,
}: {
  stockId: string;
  symbol: string;
  currentPrice: string;
  returnTo: string;
}) {
  const supabase = await createClient();
  const { data: manual } = await supabase
    .from("manual_prices")
    .select("price")
    .eq("stock_id", stockId)
    .maybeSingle();

  return (
    <Modal title={`อัปเดตราคา ${symbol}`} closeHref={returnTo}>
      <PriceForm
        stockId={stockId}
        symbol={symbol}
        currentPrice={currentPrice}
        today={todayISO()}
        hasManualPrice={Boolean(manual)}
        returnTo={returnTo}
      />
    </Modal>
  );
}
