/**
 * Currency formatting utilities
 * All prices are displayed in EUR (Euros)
 */

const euroFormatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})

const euroFormatterNoDecimals = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Format a number as Euro currency
 * @param value - The amount to format
 * @param showDecimals - Whether to show decimal places (default: true)
 * @returns Formatted string like "€50.00" or empty string if value is invalid
 */
export function formatEuro(value?: number | null, showDecimals: boolean = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return ''
  }
  
  const formatter = showDecimals ? euroFormatter : euroFormatterNoDecimals
  return formatter.format(value)
}

/**
 * Format a number as Euro currency with simple € symbol (no decimals)
 * Useful for display where you want "€50" instead of "€50.00"
 * @param value - The amount to format
 * @returns Formatted string like "€50" or empty string if value is invalid
 */
export function formatEuroSimple(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return ''
  }
  return `€${Math.round(value)}`
}

/**
 * Format a number as Euro currency with decimals
 * @param value - The amount to format
 * @returns Formatted string like "€50.00" or empty string if value is invalid
 */
export function formatEuroWithDecimals(value?: number | null): string {
  return formatEuro(value, true)
}


