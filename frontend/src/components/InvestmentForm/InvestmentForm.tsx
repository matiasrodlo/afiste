import React, { useState } from 'react';
import { VCFund } from '../../types/vcFund.types';
import { afisteTheme } from '../../styles/afiste-theme';

interface InvestmentFormProps {
  fund: VCFund;
  onSubmit: (amount: number) => Promise<void>;
  onCancel?: () => void;
}

export const InvestmentForm: React.FC<InvestmentFormProps> = ({ fund, onSubmit, onCancel }) => {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Por favor ingresa un monto válido');
      return;
    }

    if (numAmount < fund.minimum_investment) {
      setError(`La inversión mínima es ${formatCurrency(fund.minimum_investment)}`);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(numAmount);
      setAmount('');
    } catch (err: any) {
      // Extract error message from Axios response or Error object
      const errorMessage = err?.response?.data?.error || err?.message || 'Error al procesar la inversión';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateTokens = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return 0;
    return numAmount / fund.current_nav;
  };

  const tokens = calculateTokens();

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: afisteTheme.colors.surface,
        borderRadius: afisteTheme.borderRadius.lg,
        padding: afisteTheme.spacing.xl,
        border: `1px solid ${afisteTheme.colors.border}`,
        boxShadow: afisteTheme.shadows.lg,
      }}
    >
      <div style={{ marginBottom: afisteTheme.spacing.xl }}>
        <h3 style={{ margin: `0 0 ${afisteTheme.spacing.sm} 0`, fontSize: '1.75rem', fontWeight: 700, color: afisteTheme.colors.text }}>
          Invertir en {fund.name}
        </h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: afisteTheme.colors.textSecondary }}>
          Ingresa el monto de tu inversión a continuación para comprar tokens del fondo
        </p>
      </div>

      {/* Fund Info - Neutral */}
      <div
        style={{
          background: afisteTheme.colors.surfaceLight,
          borderRadius: afisteTheme.borderRadius.lg,
          padding: afisteTheme.spacing.lg,
          marginBottom: afisteTheme.spacing.xl,
          border: `1px solid ${afisteTheme.colors.border}`,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: afisteTheme.spacing.lg }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textSecondary, marginBottom: afisteTheme.spacing.xs, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>
              NAV Actual por Token
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: afisteTheme.colors.text }}>
              {formatCurrency(fund.current_nav)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textSecondary, marginBottom: afisteTheme.spacing.xs, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>
              Inversión Mínima
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: afisteTheme.colors.text }}>
              {formatCurrency(fund.minimum_investment)}
            </div>
          </div>
        </div>
      </div>

      {/* Amount Input - Improved */}
      <div style={{ marginBottom: afisteTheme.spacing.xl }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: afisteTheme.colors.text,
            marginBottom: afisteTheme.spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Monto de Inversión (USD)
        </label>
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: afisteTheme.spacing.lg,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '1.125rem',
              fontWeight: 600,
              color: afisteTheme.colors.textSecondary,
            }}
          >
            $
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`${fund.minimum_investment.toLocaleString()}`}
            min={fund.minimum_investment}
            step="0.01"
            required
            style={{
              width: '100%',
              padding: `${afisteTheme.spacing.md} ${afisteTheme.spacing.lg} ${afisteTheme.spacing.md} 2.5rem`,
              borderRadius: afisteTheme.borderRadius.md,
              border: `2px solid ${error ? afisteTheme.colors.error : afisteTheme.colors.border}`,
              fontSize: '1.25rem',
              fontWeight: 600,
              outline: 'none',
              transition: 'all 0.2s ease',
              background: afisteTheme.colors.background,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = afisteTheme.colors.primary;
              e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0, 82, 255, 0.1)`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? afisteTheme.colors.error : afisteTheme.colors.border;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        <div style={{ marginTop: afisteTheme.spacing.xs, fontSize: '0.75rem', color: afisteTheme.colors.textSecondary }}>
          Mínimo: {formatCurrency(fund.minimum_investment)}
        </div>
        {error && (
          <div style={{ marginTop: afisteTheme.spacing.sm, fontSize: '0.875rem', color: afisteTheme.colors.error, fontWeight: 500 }}>
            {error}
          </div>
        )}
      </div>

      {/* Tokens Preview - Neutral */}
      {tokens > 0 && (
        <div
          style={{
            background: afisteTheme.colors.surface,
            borderRadius: afisteTheme.borderRadius.lg,
            padding: afisteTheme.spacing.lg,
            marginBottom: afisteTheme.spacing.xl,
            border: `2px solid ${afisteTheme.colors.primary}`,
            boxShadow: afisteTheme.shadows.sm,
          }}
        >
          <div style={{ fontSize: '0.875rem', color: afisteTheme.colors.textSecondary, marginBottom: afisteTheme.spacing.xs, fontWeight: 500 }}>
            Recibirás aproximadamente
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: afisteTheme.spacing.xs, color: afisteTheme.colors.primary }}>
            {tokens.toLocaleString('es-ES', { maximumFractionDigits: 4 })} tokens
          </div>
          <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textLight }}>
            Basado en NAV actual de {formatCurrency(fund.current_nav)} por token
          </div>
        </div>
      )}

      {/* Actions - Improved */}
      <div style={{ display: 'flex', gap: afisteTheme.spacing.md }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: `${afisteTheme.spacing.md} ${afisteTheme.spacing.lg}`,
              borderRadius: afisteTheme.borderRadius.md,
              border: `2px solid ${afisteTheme.colors.border}`,
              background: 'transparent',
              color: afisteTheme.colors.text,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = afisteTheme.colors.textSecondary;
                e.currentTarget.style.background = afisteTheme.colors.surfaceLight;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = afisteTheme.colors.border;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !amount || parseFloat(amount) < fund.minimum_investment}
          style={{
            flex: 1,
            padding: `${afisteTheme.spacing.md} ${afisteTheme.spacing.lg}`,
            borderRadius: afisteTheme.borderRadius.md,
            border: 'none',
            background:
              loading || !amount || parseFloat(amount) < fund.minimum_investment
                ? afisteTheme.colors.border
                : afisteTheme.colors.primary,
            color: '#FFFFFF',
            fontSize: '1rem',
            fontWeight: 600,
            cursor:
              loading || !amount || parseFloat(amount) < fund.minimum_investment ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow:
              loading || !amount || parseFloat(amount) < fund.minimum_investment
                ? 'none'
                : '0 4px 6px rgba(0, 82, 255, 0.2)',
          }}
          onMouseEnter={(e) => {
            if (!loading && amount && parseFloat(amount) >= fund.minimum_investment) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 82, 255, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow =
              loading || !amount || parseFloat(amount) < fund.minimum_investment
                ? 'none'
                : '0 4px 6px rgba(0, 82, 255, 0.2)';
          }}
        >
          {loading ? 'Procesando...' : 'Invertir Ahora'}
        </button>
      </div>
    </form>
  );
};

