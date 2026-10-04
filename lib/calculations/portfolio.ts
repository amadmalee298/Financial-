import { Decimal } from "@/lib/utils/decimal";
import type { Holding, LedgerTransaction, PortfolioSummary } from "@/types/portfolio";
import { pickPrice } from "./price";
import { compareTransactions, ratio, replayPosition, unrealized } from "./profitLoss";

export type PortfolioTransaction = LedgerTransaction & {
  stock_id: string;
  stock: { symbol: string; name: string | null; sector: string | null };
};

export type ManualPrice = { stock_id: string; price: Decimal.Value; price_date: string };

/** Newest stored market close for one stock. */
export type MarketPrice = { stock_id: string; close: Decimal.Value; price_date: string };

const ZERO = new Decimal(0);

/**
 * Build one holding per stock the user has traded, including fully sold
 * positions (shares = 0) so their realized P/L is still reported.
 * Holdings are sorted by market value, then by symbol.
 */
export function buildHoldings(
  transactions: PortfolioTransaction[],
  manualPrices: ManualPrice[] = [],
  dividends: Map<string, Decimal> = new Map(),
  marketPrices: MarketPrice[] = [],
): Holding[] {
  const byStock = new Map<string, PortfolioTransaction[]>();
  for (const tx of transactions) {
    const list = byStock.get(tx.stock_id);
    if (list) list.push(tx);
    else byStock.set(tx.stock_id, [tx]);
  }
  const manualByStock = new Map(manualPrices.map((p) => [p.stock_id, p]));
  const marketByStock = new Map(marketPrices.map((p) => [p.stock_id, p]));

  const holdings = [...byStock.entries()].map(([stockId, txs]): Holding => {
    const position = replayPosition(txs);
    const lastTrade = [...txs].sort(compareTransactions).at(-1)!;
    const manual = manualByStock.get(stockId);
    const market = marketByStock.get(stockId);

    // Newest price wins: manual, market close, or the last trade.
    const current = pickPrice([
      manual && { price: manual.price, date: manual.price_date, source: "manual" },
      market && { price: market.close, date: market.price_date, source: "market" },
      { price: lastTrade.price, date: lastTrade.trade_date, source: "last_trade" },
    ])!;
    const { price, date: priceDate, source: priceSource } = current;

    const { marketValue, unrealizedPL, unrealizedPct } = unrealized(position, price);
    const stockDividends = dividends.get(stockId) ?? ZERO;

    return {
      ...position,
      stockId,
      symbol: lastTrade.stock.symbol,
      name: lastTrade.stock.name,
      sector: lastTrade.stock.sector,
      price,
      priceDate,
      priceSource,
      marketValue,
      unrealizedPL,
      unrealizedPct,
      dividends: stockDividends,
      totalReturn: unrealizedPL.plus(position.realizedPL).plus(stockDividends),
      weight: ZERO,
    };
  });

  const totalValue = holdings.reduce((sum, h) => sum.plus(h.marketValue), ZERO);
  for (const h of holdings) h.weight = ratio(h.marketValue, totalValue);

  return holdings.sort(
    (a, b) => b.marketValue.comparedTo(a.marketValue) || a.symbol.localeCompare(b.symbol),
  );
}

/**
 * Portfolio totals. `otherDividends` covers dividends on stocks with no
 * recorded transactions (e.g. shares bought before using the app).
 */
export function summarize(holdings: Holding[], otherDividends: Decimal = ZERO): PortfolioSummary {
  const sum = (pick: (h: Holding) => Decimal) => holdings.reduce((acc, h) => acc.plus(pick(h)), ZERO);

  const costBasis = sum((h) => h.costBasis);
  const marketValue = sum((h) => h.marketValue);
  const unrealizedPL = sum((h) => h.unrealizedPL);
  const realizedPL = sum((h) => h.realizedPL);
  const dividends = sum((h) => h.dividends).plus(otherDividends);

  return {
    costBasis,
    marketValue,
    unrealizedPL,
    unrealizedPct: ratio(unrealizedPL, costBasis),
    realizedPL,
    dividends,
    totalReturn: unrealizedPL.plus(realizedPL).plus(dividends),
    totalBought: sum((h) => h.totalBought),
    holdingsCount: holdings.filter((h) => h.shares.greaterThan(0)).length,
  };
}
