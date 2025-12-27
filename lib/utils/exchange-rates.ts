/**
 * Exchange Rate Utilities
 * Fetches real-time exchange rates from ExchangeRate-API
 * Includes caching to minimize API calls
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CurrencyCode } from './currency';

// Free API endpoint (no key required for basic usage)
// Base currency is GBP
const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/GBP';

// Cache keys
const CACHE_KEY = '@izimate_exchange_rates';
const CACHE_TIMESTAMP_KEY = '@izimate_exchange_rates_timestamp';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface ExchangeRatesResponse {
  rates: Record<string, number>;
  base: string;
  date: string;
}

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

/**
 * Get cached exchange rates if still valid
 */
async function getCachedRates(): Promise<Record<string, number> | null> {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cachedData || !cachedTimestamp) {
      return null;
    }
    
    const timestamp = parseInt(cachedTimestamp, 10);
    const now = Date.now();
    
    // Check if cache is still valid (within 1 hour)
    if (now - timestamp < CACHE_DURATION) {
      const rates = JSON.parse(cachedData);
      if (__DEV__) {
        console.log('💱 Using cached exchange rates');
      }
      return rates;
    }
    
    // Cache expired
    return null;
  } catch (error) {
    console.error('Error reading cached exchange rates:', error);
    return null;
  }
}

/**
 * Cache exchange rates with timestamp
 */
async function cacheRates(rates: Record<string, number>): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rates));
    await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error caching exchange rates:', error);
  }
}

/**
 * Fetch exchange rates from API
 */
async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    if (__DEV__) {
      console.log('💱 Fetching exchange rates from API...');
    }
    
    const response = await fetch(EXCHANGE_RATE_API_URL);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data: ExchangeRatesResponse = await response.json();
    
    // Ensure GBP is 1.0 (base currency)
    const rates: Record<string, number> = {
      ...data.rates,
      GBP: 1.0,
    };
    
    // Cache the rates
    await cacheRates(rates);
    
    if (__DEV__) {
      console.log('✅ Exchange rates fetched and cached successfully');
    }
    
    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    throw error;
  }
}

/**
 * Get exchange rates with caching
 * Returns cached rates if available and fresh, otherwise fetches from API
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  // Try to get cached rates first
  const cachedRates = await getCachedRates();
  if (cachedRates) {
    return cachedRates;
  }
  
  // Cache miss or expired, fetch from API
  try {
    return await fetchExchangeRates();
  } catch (error) {
    // If API fails, try to use stale cache as fallback
    const staleCache = await getCachedRates();
    if (staleCache) {
      if (__DEV__) {
        console.warn('⚠️ Using stale cache due to API error');
      }
      return staleCache;
    }
    
    // No cache available, return default rates as last resort
    if (__DEV__) {
      console.warn('⚠️ Using default exchange rates due to API error and no cache');
    }
    return getDefaultRates();
  }
}

/**
 * Get default exchange rates (fallback when API fails)
 * These are approximate rates and should be updated periodically
 */
function getDefaultRates(): Record<string, number> {
  return {
    GBP: 1.0,
    USD: 1.27,
    EUR: 1.17,
    CAD: 1.72,
    AUD: 1.94,
    JPY: 188.0,
    CHF: 1.10,
    CNY: 9.15,
    INR: 105.0,
    BRL: 6.30,
    MXN: 21.50,
    ZAR: 23.50,
    NZD: 2.08,
    SGD: 1.70,
    HKD: 9.90,
    NOK: 13.50,
    SEK: 13.20,
    DKK: 8.70,
    PLN: 5.05,
    CZK: 29.0,
  };
}

/**
 * Convert price from GBP to target currency
 * Uses real-time exchange rates with caching
 */
export async function convertPrice(
  priceGBP: number,
  targetCurrency: CurrencyCode
): Promise<number> {
  const rates = await getExchangeRates();
  const rate = rates[targetCurrency] || 1.0;
  return priceGBP * rate;
}

/**
 * Convert price synchronously using cached rates
 * Use this when you already have rates loaded
 */
export function convertPriceSync(
  priceGBP: number,
  targetCurrency: CurrencyCode,
  rates: Record<string, number>
): number {
  const rate = rates[targetCurrency] || 1.0;
  return priceGBP * rate;
}

/**
 * Preload exchange rates (useful for warming cache)
 */
export async function preloadExchangeRates(): Promise<void> {
  try {
    await getExchangeRates();
  } catch (error) {
    console.error('Error preloading exchange rates:', error);
  }
}

/**
 * Clear cached exchange rates (force refresh on next request)
 */
export async function clearExchangeRateCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
    if (__DEV__) {
      console.log('🗑️ Exchange rate cache cleared');
    }
  } catch (error) {
    console.error('Error clearing exchange rate cache:', error);
  }
}

