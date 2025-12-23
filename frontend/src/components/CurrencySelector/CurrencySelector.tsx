// Currency selector - lets users pick their preferred currency
import React, { useState, useEffect } from 'react';
import {
  getSupportedCurrencies,
  getUserPreferredCurrency,
  setUserPreferredCurrency,
} from '../../api/exchangeRates';
import { afisteTheme } from '../../styles/afiste-theme';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface CurrencySelectorProps {
  onCurrencyChange?: (currency: string) => void;
  showLabel?: boolean;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  onCurrencyChange,
  showLabel = true,
}) => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      const [supportedCurrencies, preferred] = await Promise.all([
        getSupportedCurrencies(),
        getUserPreferredCurrency().catch(() => ({ currency: 'USD' })),
      ]);

      setCurrencies(supportedCurrencies);
      setSelectedCurrency(preferred.currency);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load currencies:', error);
      }
      // Fallback currencies
      setCurrencies([
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = event.target.value;
    setSelectedCurrency(newCurrency);

    try {
      await setUserPreferredCurrency(newCurrency);
      if (onCurrencyChange) {
        onCurrencyChange(newCurrency);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update preferred currency:', error);
      }
    }
  };

  if (loading) {
    return <div>Loading currencies...</div>;
  }

  return (
    <div style={styles.container}>
      {showLabel && <label style={styles.label}>Currency:</label>}
      <select
        value={selectedCurrency}
        onChange={handleCurrencyChange}
        style={styles.select}
      >
        {currencies.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.symbol} {currency.code} - {currency.name}
          </option>
        ))}
      </select>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    color: afisteTheme.colors.textSecondary,
    fontWeight: 500,
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: afisteTheme.borderRadius.md,
    backgroundColor: afisteTheme.colors.background,
    color: afisteTheme.colors.text,
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
};

export default CurrencySelector;

