import { Decimal } from "@/lib/utils/decimal";
import type { Holding } from "@/types/portfolio";
import { ratio } from "./profitLoss";

export type AllocationSlice = { label: string; value: Decimal; weight: Decimal };

const ZERO = new Decimal(0);

/**
 * Group open holdings by `key`, largest first. Groups past `limit` fold into
 * a single "อื่นๆ" (others) row.
 */
export function allocation(holdings: Holding[], key: (h: Holding) => string, limit: number): AllocationSlice[] {
  const open = holdings.filter((h) => h.marketValue.greaterThan(0));
  const total = open.reduce((sum, h) => sum.plus(h.marketValue), ZERO);

  const groups = new Map<string, Decimal>();
  for (const h of open) groups.set(key(h), (groups.get(key(h)) ?? ZERO).plus(h.marketValue));

  const sorted = [...groups.entries()]
    .map(([label, value]) => ({ label, value, weight: ratio(value, total) }))
    .sort((a, b) => b.value.comparedTo(a.value) || a.label.localeCompare(b.label));

  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1).reduce((sum, s) => sum.plus(s.value), ZERO);
  return [...head, { label: "อื่นๆ", value: rest, weight: ratio(rest, total) }];
}
