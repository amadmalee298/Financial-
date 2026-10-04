import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/** Parse user input or a DB value into a Decimal. Empty input becomes 0. */
export function toDecimal(value: Decimal.Value | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  return new Decimal(typeof value === "string" ? value.replace(/,/g, "").trim() : value);
}

/** Like toDecimal, but returns null instead of throwing on invalid input. */
export function parseDecimal(value: unknown): Decimal | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  try {
    const d = toDecimal(value);
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}
