import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils/date";
import type { Holding } from "@/types/portfolio";
import { Modal } from "@/components/ui/Modal";
import { PriceForm } from "./PriceForm";

/** Server wrapper that opens the manual-price form for a holding. */
export async function PriceModal({ holding, returnTo }: { holding: Holding; returnTo: string }) {
  const supabase = await createClient();
  const { data: manual } = await supabase
    .from("manual_prices")
    .select("price")
    .eq("stock_id", holding.stockId)
    .maybeSingle();

  return (
    <Modal title={`อัปเดตราคา ${holding.symbol}`} closeHref={returnTo}>
      <PriceForm
        stockId={holding.stockId}
        symbol={holding.symbol}
        currentPrice={holding.price.toString()}
        today={todayISO()}
        hasManualPrice={Boolean(manual)}
        returnTo={returnTo}
      />
    </Modal>
  );
}
