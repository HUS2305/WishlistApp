/**
 * Currency conversion service
 * Uses exchangerate-api.com free tier for exchange rates
 * API endpoint: https://api.exchangerate-api.com/v4/latest/{baseCurrency}
 * No API key required for free tier (1500 requests/month)
 */

interface ExchangeRates {
  [currencyCode: string]: number;
}

interface ExchangeRateResponse {
  rates: ExchangeRates;
  base: string;
  date: string;
}

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
  try {
    // Check cache first
    if (exchangeRateCache && 
        exchangeRateCache.base === baseCurrency &&
        Date.now() - exchangeRateCache.timestamp < CACHE_DURATION) {
      return exchangeRateCache.rates;
    }

    // Fetch from API
    // Using exchangerate-api.com free tier (no API key needed for basic usage)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data: ExchangeRateResponse = await response.json();
    
    // Update cache
    exchangeRateCache = {
      rates: data.rates,
      base: baseCurrency,
      timestamp: Date.now(),
    };

    return data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Return cached rates even if expired, as fallback
    if (exchangeRateCache && exchangeRateCache.base === baseCurrency) {
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
  // If same currency, no conversion needed
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amount;
  }

  try {
    // Fetch exchange rates (base currency is fromCurrency)
    const rates = await fetchExchangeRates(fromCurrency);
    
    // Get the rate for the target currency
    const rate = rates[toCurrency.toUpperCase()];
    
    if (!rate) {
      console.warn(`Exchange rate not found for ${toCurrency}`);
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
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return 1;
  }

  try {
    const rates = await fetchExchangeRates(fromCurrency);
    const rate = rates[toCurrency.toUpperCase()];
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

