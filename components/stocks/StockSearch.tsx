import type { Stock } from "@/types/transaction";
import { Input } from "@/components/ui/Input";

/**
 * Symbol input with suggestions from the stock list. Typing a symbol that is
 * not listed adds it to the shared list when the form is saved.
 */
export function StockSearch({
  stocks,
  defaultValue,
  error,
}: {
  stocks: Stock[];
  defaultValue?: string;
  error?: string;
}) {
  return (
    <>
      <Input
        id="symbol"
        name="symbol"
        label="หุ้น"
        list="stock-options"
        placeholder="เช่น PTT"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        defaultValue={defaultValue}
        error={error}
        required
        className="uppercase"
      />
      <datalist id="stock-options">
        {stocks.map((stock) => (
          <option key={stock.id} value={stock.symbol}>
            {stock.name ?? stock.symbol}
          </option>
        ))}
      </datalist>
    </>
  );
}
