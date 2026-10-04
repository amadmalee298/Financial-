import { type Decimal, toDecimal } from "@/lib/utils/decimal";
import { ratio } from "./profitLoss";

type Value = Decimal.Value | null | undefined;
const present = (v: Value): v is Decimal.Value => v !== null && v !== undefined && v !== "";

/**
 * Valuation figures at the current price:
 *   peAtPrice      = price / EPS (null unless EPS > 0)
 *   marginOfSafety = (fair value − price) / fair value
 *   upside         = (target − price) / price
 */
export function valuation({ price, eps, fairValue, targetPrice }: { price: Value; eps: Value; fairValue: Value; targetPrice: Value }) {
  if (!present(price)) return { peAtPrice: null, marginOfSafety: null, upside: null };
  const p = toDecimal(price);
  const e = present(eps) ? toDecimal(eps) : null;
  const fair = present(fairValue) ? toDecimal(fairValue) : null;
  const target = present(targetPrice) ? toDecimal(targetPrice) : null;

  return {
    peAtPrice: e && e.greaterThan(0) ? p.div(e) : null,
    marginOfSafety: fair && fair.greaterThan(0) ? ratio(fair.minus(p), fair) : null,
    upside: target && p.greaterThan(0) ? ratio(target.minus(p), p) : null,
  };
}
