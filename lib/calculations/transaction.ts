import { Decimal, toDecimal } from "@/lib/utils/decimal";
import type { TransactionType } from "@/types/transaction";

export type TransactionAmounts = {
  type: TransactionType;
  quantity: Decimal.Value;
  price: Decimal.Value;
  commission?: Decimal.Value | null;
  fees?: Decimal.Value | null;
  vat?: Decimal.Value | null;
};

/** quantity × price, before costs. */
export function grossAmount({ quantity, price }: Pick<TransactionAmounts, "quantity" | "price">) {
  return toDecimal(quantity).times(toDecimal(price));
}

/** commission + fees + vat. */
export function totalCosts({ commission, fees, vat }: Pick<TransactionAmounts, "commission" | "fees" | "vat">) {
  return toDecimal(commission).plus(toDecimal(fees)).plus(toDecimal(vat));
}

/**
 * Cash paid (BUY) or received (SELL), rounded to satang.
 * Mirrors the generated `transactions.total_amount` column in the database.
 */
export function transactionTotal(input: TransactionAmounts) {
  const gross = grossAmount(input);
  const costs = totalCosts(input);
  const total = input.type === "BUY" ? gross.plus(costs) : gross.minus(costs);
  return total.toDecimalPlaces(2);
}

/** Thai brokers charge 7% VAT on commission. */
export function vatOnCommission(commission: Decimal.Value | null | undefined) {
  return toDecimal(commission).times("0.07").toDecimalPlaces(2);
}

/** Net shares held: Σ BUY quantity − Σ SELL quantity. */
export function netQuantity(rows: { transaction_type: TransactionType; quantity: Decimal.Value }[]) {
  return rows.reduce(
    (sum, row) =>
      row.transaction_type === "BUY"
        ? sum.plus(toDecimal(row.quantity))
        : sum.minus(toDecimal(row.quantity)),
    new Decimal(0),
  );
}
