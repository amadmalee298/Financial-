import type { Tables } from "./database";

export type TransactionType = Tables<"transactions">["transaction_type"];

export type Stock = Pick<Tables<"stocks">, "id" | "symbol" | "name" | "market" | "sector">;

/** A transaction row joined with its stock, as listed on /transactions. */
export type TransactionWithStock = Tables<"transactions"> & {
  stock: Pick<Tables<"stocks">, "symbol" | "name" | "market">;
};

/** A dividend row joined with its stock, as listed on /dividends. */
export type DividendWithStock = Tables<"dividends"> & {
  stock: Pick<Tables<"stocks">, "symbol" | "name">;
};
