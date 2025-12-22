/**
 * Currency utilities for mobile platform
 * Provides currency formatting compatible with React Native
 */

export type CurrencyCode =
  | 'USD'
  | 'GBP'
  | 'EUR'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'CHF'
  | 'CNY'
  | 'INR'
  | 'BRL'
  | 'MXN'
  | 'ZAR'
  | 'NZD'
  | 'SGD'
  | 'HKD'
  | 'NOK'
  | 'SEK'
  | 'DKK'
  | 'PLN'
  | 'CZK'

export interface Currency {
  code: CurrencyCode
  symbol: string
  name: string
  flag: string
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', flag: '🇨🇿' },
]

/**
 * Country to Currency mapping
 * Maps country names/codes to their primary currency
 */
const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  // United Kingdom
  'UK': 'GBP',
  'GB': 'GBP',
  'United Kingdom': 'GBP',
  'Great Britain': 'GBP',
  'England': 'GBP',
  'Scotland': 'GBP',
  'Wales': 'GBP',
  'Northern Ireland': 'GBP',
  
  // European Union countries (Euro)
  'AT': 'EUR', // Austria
  'BE': 'EUR', // Belgium
  'CY': 'EUR', // Cyprus
  'DE': 'EUR', // Germany
  'EE': 'EUR', // Estonia
  'FI': 'EUR', // Finland
  'FR': 'EUR', // France
  'GR': 'EUR', // Greece
  'IE': 'EUR', // Ireland
  'IT': 'EUR', // Italy
  'LV': 'EUR', // Latvia
  'LT': 'EUR', // Lithuania
  'LU': 'EUR', // Luxembourg
  'MT': 'EUR', // Malta
  'NL': 'EUR', // Netherlands
  'PT': 'EUR', // Portugal
  'SK': 'EUR', // Slovakia
  'SI': 'EUR', // Slovenia
  'ES': 'EUR', // Spain
  'Austria': 'EUR',
  'Belgium': 'EUR',
  'Cyprus': 'EUR',
  'Germany': 'EUR',
  'Estonia': 'EUR',
  'Finland': 'EUR',
  'France': 'EUR',
  'Greece': 'EUR',
  'Ireland': 'EUR',
  'Italy': 'EUR',
  'Latvia': 'EUR',
  'Lithuania': 'EUR',
  'Luxembourg': 'EUR',
  'Malta': 'EUR',
  'Netherlands': 'EUR',
  'Portugal': 'EUR',
  'Slovakia': 'EUR',
  'Slovenia': 'EUR',
  'Spain': 'EUR',
  
  // Non-EU European countries
  'NO': 'NOK', // Norway
  'SE': 'SEK', // Sweden
  'DK': 'DKK', // Denmark
  'PL': 'PLN', // Poland
  'CZ': 'CZK', // Czech Republic
  'CH': 'CHF', // Switzerland
  'Norway': 'NOK',
  'Sweden': 'SEK',
  'Denmark': 'DKK',
  'Poland': 'PLN',
  'Czech Republic': 'CZK',
  'Czechia': 'CZK',
  'Switzerland': 'CHF',
  
  // North America
  'US': 'USD',
  'USA': 'USD',
  'United States': 'USD',
  'United States of America': 'USD',
  'CA': 'CAD',
  'Canada': 'CAD',
  'MX': 'MXN',
  'Mexico': 'MXN',
  
  // Asia Pacific
  'AU': 'AUD',
  'Australia': 'AUD',
  'NZ': 'NZD',
  'New Zealand': 'NZD',
  'JP': 'JPY',
  'Japan': 'JPY',
  'CN': 'CNY',
  'China': 'CNY',
  'IN': 'INR',
  'India': 'INR',
  'SG': 'SGD',
  'Singapore': 'SGD',
  'HK': 'HKD',
  'Hong Kong': 'HKD',
  
  // South America
  'BR': 'BRL',
  'Brazil': 'BRL',
  
  // Africa
  'ZA': 'ZAR',
  'South Africa': 'ZAR',
}

/**
 * Get currency code from country name or code
 */
export function getCurrencyFromCountry(country?: string | null): CurrencyCode {
  if (!country) return 'GBP' // Default to GBP
  
  const normalizedCountry = country.trim()
  
  // Try exact match first
  if (COUNTRY_TO_CURRENCY[normalizedCountry]) {
    return COUNTRY_TO_CURRENCY[normalizedCountry]
  }
  
  // Try case-insensitive match
  const upperCountry = normalizedCountry.toUpperCase()
  if (COUNTRY_TO_CURRENCY[upperCountry]) {
    return COUNTRY_TO_CURRENCY[upperCountry]
  }
  
  // Try partial match (e.g., "United Kingdom" contains "UK")
  for (const [key, currency] of Object.entries(COUNTRY_TO_CURRENCY)) {
    if (normalizedCountry.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(normalizedCountry.toLowerCase())) {
      return currency
    }
  }
  
  // Default to GBP if no match found
  return 'GBP'
}

/**
 * Get currency information by code
 */
export function getCurrency(code?: string | null): Currency {
  const currency = CURRENCIES.find((c) => c.code === code) || CURRENCIES.find((c) => c.code === 'GBP')!
  return currency
}

/**
 * Get user's currency code
 * Priority: user.currency > country-based detection > default GBP
 */
export function getUserCurrency(
  userCurrency?: string | null,
  userCountry?: string | null
): CurrencyCode {
  // If user has explicitly set currency, use it
  if (userCurrency && CURRENCIES.some(c => c.code === userCurrency)) {
    return userCurrency as CurrencyCode
  }
  
  // Otherwise, detect from country
  if (userCountry) {
    return getCurrencyFromCountry(userCountry)
  }
  
  // Default to GBP
  return 'GBP'
}

/**
 * Format a price with currency symbol
 */
export function formatCurrency(amount: number | string | null | undefined, currencyCode?: string | null): string {
  if (amount === null || amount === undefined) return ''
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return ''

  const currency = getCurrency(currencyCode)
  
  // For JPY, don't use decimals
  if (currency.code === 'JPY') {
    return `${currency.symbol}${Math.round(numAmount).toLocaleString()}`
  }

  // Format with 2 decimal places for most currencies
  return `${currency.symbol}${numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

/**
 * Format a price range
 */
export function formatCurrencyRange(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
  currencyCode?: string | null
): string {
  if (!min && !max) return ''
  if (min && max) {
    return `${formatCurrency(min, currencyCode)} - ${formatCurrency(max, currencyCode)}`
  }
  if (min) return formatCurrency(min, currencyCode)
  if (max) return formatCurrency(max, currencyCode)
  return ''
}

/**
 * Get currency symbol only
 */
export function getCurrencySymbol(currencyCode?: string | null): string {
  return getCurrency(currencyCode).symbol
}
