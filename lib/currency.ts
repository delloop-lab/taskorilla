/**
 * Round to 2 decimal places to avoid float drift (e.g. 80 stored/returned as 79.999999 → 80).
 * Use for any currency or rate display.
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Format a rate/amount for display: round first, then show whole numbers without .00.
 * e.g. 80 → "80", 79.99 → "79.99", 25.5 → "25.5"
 */
export function formatRate(value: number): string {
  const r = roundCurrency(value)
  return r % 1 === 0 ? String(r) : r.toFixed(2)
}

/**
 * Format a euro amount for display. Rounds with roundCurrency first so small amounts
 * (e.g. 10% of €1 = €0.10) never show as 0.00 due to float drift.
 * @param value - amount in euros
 * @param showSymbol - if true (default), prefix with €
 */
export function formatEuro(value: number, showSymbol: boolean = true): string {
  const r = roundCurrency(value)
  const str = r % 1 === 0 ? String(r) : r.toFixed(2)
  return showSymbol ? `€${str}` : str
}
