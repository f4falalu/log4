/**
 * Currency formatting utilities.
 *
 * Usage:
 *   import { formatCurrency, getCurrencySymbol } from '@/lib/formatCurrency';
 *   const { data: settings } = useWorkspaceSettings();
 *   formatCurrency(1500, settings?.currency, settings?.locale)  // "₦1,500"
 */

/**
 * Format a number as currency using workspace locale settings.
 */
export function formatCurrency(
  amount: number,
  currency = 'NGN',
  locale = 'en-NG',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get the currency symbol for display in labels (e.g., "₦").
 */
export function getCurrencySymbol(currency = 'NGN', locale = 'en-NG'): string {
  return (
    new Intl.NumberFormat(locale, { style: 'currency', currency })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? currency
  );
}
