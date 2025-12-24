/**
 * Component for displaying prices with automatic currency conversion
 * Converts prices from item currency to user's preferred currency
 */

import { useState, useEffect, useMemo } from 'react';
import { TextProps, View, ViewProps, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Text';
import { convertCurrency } from '@/services/currency';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { getCurrencyByCode } from '@/utils/currencies';

interface PriceDisplayProps {
  amount: number;
  currency: string; // Original currency of the item
  showOriginal?: boolean; // Show original currency alongside converted
  textStyle?: TextProps['style'];
  containerStyle?: ViewProps['style'];
}

export function PriceDisplay({
  amount,
  currency,
  showOriginal = false,
  textStyle,
  containerStyle,
}: PriceDisplayProps) {
  const { userCurrency, isLoading: isLoadingCurrency } = useUserCurrency();
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Always convert to user's preferred currency if different
  // Use useMemo to prevent unnecessary re-renders
  const targetCurrency = useMemo(() => userCurrency || currency, [userCurrency, currency]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    async function convert() {
      // If same currency, no conversion needed
      if (currency.toUpperCase() === targetCurrency.toUpperCase()) {
        if (!cancelled) {
          setConvertedAmount(null);
          setIsConverting(false);
        }
        return;
      }

      if (!cancelled) {
        setIsConverting(true);
      }
      
      // Set a timeout to prevent hanging (10 seconds)
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          console.warn('Currency conversion timed out');
          setConvertedAmount(null);
          setIsConverting(false);
        }
      }, 10000);
      
      try {
        const converted = await convertCurrency(amount, currency, targetCurrency);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (!cancelled) {
          setConvertedAmount(converted);
          setIsConverting(false);
        }
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        console.error('Error converting currency:', error);
        if (!cancelled) {
          setConvertedAmount(null); // Fallback to original
          setIsConverting(false);
        }
      }
    }

    if (!isLoadingCurrency && targetCurrency) {
      convert();
    } else if (isLoadingCurrency) {
      // While loading user currency, show original
      setIsConverting(false);
    }

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [amount, currency, targetCurrency, isLoadingCurrency]);

  // Get currency info for display
  const originalCurrencyInfo = getCurrencyByCode(currency);
  const targetCurrencyInfo = getCurrencyByCode(targetCurrency);

  // Format number with appropriate decimal places
  const formatAmount = (value: number, currencyCode: string) => {
    // For currencies like JPY that typically don't use decimals
    if (currencyCode === 'JPY' || currencyCode === 'KRW' || currencyCode === 'VND') {
      return Math.round(value).toLocaleString();
    }
    return value.toFixed(2);
  };

  // Show original currency while loading or converting (don't block UI)
  const displayAmount = convertedAmount !== null ? convertedAmount : amount;
  const displayCurrency = (convertedAmount !== null && !isConverting) ? targetCurrency : currency;
  const displayCurrencyInfo = (convertedAmount !== null && !isConverting) ? targetCurrencyInfo : originalCurrencyInfo;

  // Merge textStyle with base styles, ensuring textStyle properties take precedence
  // Handle both array and object styles - flatten properly for React Native
  const baseStyle = { margin: 0, padding: 0, includeFontPadding: false };
  const mergedTextStyle = textStyle 
    ? (Array.isArray(textStyle) ? [baseStyle, ...textStyle] : [baseStyle, textStyle])
    : [baseStyle];

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', flexShrink: 0, margin: 0, padding: 0 }, containerStyle]}>
      <Text 
        style={mergedTextStyle}
        allowFontScaling={false}
      >
        {displayCurrencyInfo?.symbol || displayCurrency}{'\u00A0'}{formatAmount(displayAmount, displayCurrency)}
      </Text>
      {showOriginal && convertedAmount !== null && (
        <Text style={[{ marginLeft: 8, opacity: 0.6 }, ...mergedTextStyle]}>
          ({originalCurrencyInfo?.symbol || currency}{'\u00A0'}{formatAmount(amount, currency)})
        </Text>
      )}
      {(isLoadingCurrency || isConverting) && (
        <ActivityIndicator size="small" style={{ marginLeft: 4 }} />
      )}
    </View>
  );
}

/**
 * Simple hook for getting converted price (for use in calculations)
 */
export function useConvertedPrice(
  amount: number,
  fromCurrency: string,
  toCurrency?: string
): { convertedAmount: number | null; isLoading: boolean } {
  const { userCurrency, isLoading: isLoadingCurrency } = useUserCurrency();
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const targetCurrency = toCurrency || userCurrency;

  useEffect(() => {
    async function convert() {
      if (fromCurrency.toUpperCase() === targetCurrency.toUpperCase()) {
        setConvertedAmount(amount);
        setIsConverting(false);
        return;
      }

      setIsConverting(true);
      try {
        const converted = await convertCurrency(amount, fromCurrency, targetCurrency);
        setConvertedAmount(converted);
      } catch (error) {
        console.error('Error converting currency:', error);
        setConvertedAmount(amount); // Fallback to original
      } finally {
        setIsConverting(false);
      }
    }

    if (!isLoadingCurrency) {
      convert();
    }
  }, [amount, fromCurrency, targetCurrency, isLoadingCurrency]);

  return {
    convertedAmount: convertedAmount !== null ? convertedAmount : amount,
    isLoading: isLoadingCurrency || isConverting,
  };
}

