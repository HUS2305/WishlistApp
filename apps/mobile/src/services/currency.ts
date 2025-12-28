/**
 * Currency conversion service
 * Uses exchangerate-api.com free tier for exchange rates
 * API endpoint: https://api.exchangerate-api.com/v4/latest/{baseCurrency}
 * No API key required for free tier (1500 requests/month)
 */

import { CURRENCIES } from '@/utils/currencies';

interface ExchangeRates {
  [currencyCode: string]: number;
}

interface ExchangeRateResponse {
  rates: ExchangeRates;
  base: string;
  date: string;
}

/**
 * Validate if a currency code is valid (3-letter ISO 4217 code)
 */
const isValidCurrencyCode = (code: string): boolean => {
  if (!code || typeof code !== 'string') return false;
  const normalizedCode = code.toUpperCase().trim();
  // Check if it's a 3-letter code and exists in our currency list
  return normalizedCode.length === 3 && CURRENCIES.some(c => c.code === normalizedCode);
};

// Cache for exchange rates (valid for 24 hours)
let exchangeRateCache: {
  rates: ExchangeRates;
  base: string;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetch exchange rates from the API
 * Uses exchangerate-api.com free tier (no API key required for basic usage)
 */
const fetchExchangeRates = async (baseCurrency: string = 'USD'): Promise<ExchangeRates> => {
  // Normalize and validate currency code
  const normalizedCurrency = baseCurrency?.toUpperCase().trim() || 'USD';
  
  if (!isValidCurrencyCode(normalizedCurrency)) {
    console.warn(`Invalid currency code: ${baseCurrency}. Using USD as fallback.`);
    // If invalid, try with USD instead
    if (normalizedCurrency !== 'USD') {
      return fetchExchangeRates('USD');
    }
    return {};
  }

  try {
    // Check cache first
    if (exchangeRateCache && 
        exchangeRateCache.base === normalizedCurrency &&
        Date.now() - exchangeRateCache.timestamp < CACHE_DURATION) {
      return exchangeRateCache.rates;
    }

    // Fetch from API
    // Using exchangerate-api.com free tier (no API key needed for basic usage)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${normalizedCurrency}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText} (${response.status})`);
    }

    const data: ExchangeRateResponse = await response.json();
    
    // Update cache
    exchangeRateCache = {
      rates: data.rates,
      base: normalizedCurrency,
      timestamp: Date.now(),
    };

    return data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Return cached rates even if expired, as fallback
    if (exchangeRateCache && exchangeRateCache.base === normalizedCurrency) {
      console.warn('Using expired exchange rate cache as fallback');
      return exchangeRateCache.rates;
    }
    
    // If no cache, return empty object (conversion will fail gracefully)
    return {};
  }
};

/**
 * Convert amount from one currency to another
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  // Normalize currency codes
  const normalizedFrom = fromCurrency?.toUpperCase().trim() || 'USD';
  const normalizedTo = toCurrency?.toUpperCase().trim() || 'USD';

  // If same currency, no conversion needed
  if (normalizedFrom === normalizedTo) {
    return amount;
  }

  // Validate currency codes
  if (!isValidCurrencyCode(normalizedFrom)) {
    console.warn(`Invalid fromCurrency code: ${fromCurrency}. Cannot convert.`);
    return amount;
  }

  if (!isValidCurrencyCode(normalizedTo)) {
    console.warn(`Invalid toCurrency code: ${toCurrency}. Cannot convert.`);
    return amount;
  }

  try {
    // Fetch exchange rates (base currency is fromCurrency)
    const rates = await fetchExchangeRates(normalizedFrom);
    
    // Get the rate for the target currency
    const rate = rates[normalizedTo];
    
    if (!rate) {
      console.warn(`Exchange rate not found for ${normalizedTo} (from ${normalizedFrom})`);
      return amount; // Return original amount if rate not found
    }

    // Convert: amount * rate
    return amount * rate;
  } catch (error) {
    console.error('Error converting currency:', error);
    return amount; // Return original amount on error
  }
};

/**
 * Get exchange rate between two currencies
 */
export const getExchangeRate = async (
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> => {
  // Normalize currency codes
  const normalizedFrom = fromCurrency?.toUpperCase().trim() || 'USD';
  const normalizedTo = toCurrency?.toUpperCase().trim() || 'USD';

  if (normalizedFrom === normalizedTo) {
    return 1;
  }

  // Validate currency codes
  if (!isValidCurrencyCode(normalizedFrom) || !isValidCurrencyCode(normalizedTo)) {
    console.warn(`Invalid currency code(s): from=${fromCurrency}, to=${toCurrency}`);
    return null;
  }

  try {
    const rates = await fetchExchangeRates(normalizedFrom);
    const rate = rates[normalizedTo];
    return rate || null;
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    return null;
  }
};

/**
 * Clear the exchange rate cache (useful for testing or forcing refresh)
 */
export const clearExchangeRateCache = () => {
  exchangeRateCache = null;
};

