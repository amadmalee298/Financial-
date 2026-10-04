import { type Decimal, toDecimal } from "@/lib/utils/decimal";
import { ratio } from "./profitLoss";

export type WatchStatus = "buy_zone" | "target_hit" | "watching" | "no_price";

/**
 * Where the current price sits relative to the user's buy price and target.
 *   toBuyPct : (price − buy) / price — how far price must fall, as a share of
 *              today's price, to reach the buy price (negative once below it)
 *   upsidePct: (target − price) / price
 */
export function watchStatus(
  price: Decimal.Value | null,
  buyPrice: Decimal.Value | null,
  targetPrice: Decimal.Value | null,
) {
  if (price === null) return { status: "no_price" as WatchStatus, toBuyPct: null, upsidePct: null };
  const p = toDecimal(price);
  const buy = buyPrice === null ? null : toDecimal(buyPrice);
  const target = targetPrice === null ? null : toDecimal(targetPrice);

  const toBuyPct = buy ? ratio(p.minus(buy), p) : null;
  const upsidePct = target ? ratio(target.minus(p), p) : null;

  let status: WatchStatus = "watching";
  if (target && p.greaterThanOrEqualTo(target)) status = "target_hit";
  else if (buy && p.lessThanOrEqualTo(buy)) status = "buy_zone";

  return { status, toBuyPct, upsidePct };
}
