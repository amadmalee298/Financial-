import { YahooProvider } from "./yahoo";
import type { PriceProvider } from "./provider";

/**
 * Registered providers. Add a new source here (e.g. an official SET feed)
 * and select it with PRICE_PROVIDER — no other code needs to change.
 */
const providers: Record<string, () => PriceProvider> = {
  yahoo: () => new YahooProvider(process.env.YAHOO_BASE_URL || undefined),
};

export function getPriceProvider(): PriceProvider {
  const name = process.env.PRICE_PROVIDER || "yahoo";
  const factory = providers[name];
  if (!factory) throw new Error(`Unknown PRICE_PROVIDER "${name}". Available: ${Object.keys(providers).join(", ")}`);
  return factory();
}
