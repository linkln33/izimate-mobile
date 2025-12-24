/**
 * Price formatting utilities for mobile platform
 * Wrapper around currency utilities for consistent price display
 */

import { formatCurrency, formatCurrencyRange, getUserCurrency, type CurrencyCode } from './currency'
import type { User } from '@/lib/types'

/**
 * Format a price with currency symbol
 * Uses the currency utility for consistent formatting
 */
export function formatPrice(
  amount: number | string | null | undefined,
  currencyCode?: CurrencyCode | string | null
): string {
  return formatCurrency(amount, currencyCode)
}

/**
 * Format a price range
 * Example: "£50.00 - £100.00"
 */
export function formatPriceRange(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
  currencyCode?: CurrencyCode | string | null
): string {
  return formatCurrencyRange(min, max, currencyCode)
}

/**
 * Format a budget display text
 * Handles different budget types (fixed, range, hourly, price_list)
 */
export function formatBudget(
  budgetMin: number | string | null | undefined,
  budgetMax: number | string | null | undefined,
  budgetType?: 'fixed' | 'range' | 'hourly' | 'price_list' | null,
  currencyCode?: CurrencyCode | string | null
): string {
  if (budgetType === 'fixed' && budgetMin) {
    return formatPrice(budgetMin, currencyCode)
  }

  if (budgetType === 'range') {
    if (budgetMin && budgetMax) {
      return formatPriceRange(budgetMin, budgetMax, currencyCode)
    }
    if (budgetMin) {
      return `${formatPrice(budgetMin, currencyCode)}+`
    }
    if (budgetMax) {
      return `Up to ${formatPrice(budgetMax, currencyCode)}`
    }
  }

  if (budgetType === 'hourly' && budgetMin) {
    return `${formatPrice(budgetMin, currencyCode)}/hour`
  }

  if (budgetType === 'price_list') {
    return 'See price list'
  }

  return 'Price negotiable'
}

/**
 * Get currency code from user object
 * Uses user.currency if set, otherwise detects from user.country
 */
export function getCurrencyFromUser(user?: User | null): CurrencyCode {
  if (!user) return 'GBP'
  return getUserCurrency(user.currency, user.country)
}
