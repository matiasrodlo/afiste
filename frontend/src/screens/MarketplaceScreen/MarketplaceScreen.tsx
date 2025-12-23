import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VCFundCard } from '../../components/VCFundCard/VCFundCard';
import { useVCFunds } from '../../hooks/useVCFunds';
import { VCFund, VCFundFilters } from '../../types/vcFund.types';
import { afisteTheme } from '../../styles/afiste-theme';

export const MarketplaceScreen: React.FC = () => {
  const navigate = useNavigate();
  const { getVCFunds, loading, error, warning } = useVCFunds();
  const [funds, setFunds] = useState<VCFund[]>([]);
  const [filters, setFilters] = useState<VCFundFilters>({
    status: 'active',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    loadFunds();
  }, [filters]);

  const loadFunds = async () => {
    try {
      const data = await getVCFunds({
        status: filters.status,
        risk_level: filters.risk_level,
        page: filters.page,
        limit: filters.limit,
      });
      
      if (Array.isArray(data)) {
        setFunds(data);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('Unexpected response format:', data);
        }
        setFunds([]);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load VC funds:', err);
      }
      setFunds([]);
    }
  };

  const handleInvest = (fundId: string) => {
    if (!fundId || fundId.trim() === '') {
      if (process.env.NODE_ENV === 'development') {
        console.error('Fund ID is missing or invalid:', fundId);
      }
      return;
    }
    const id = String(fundId).trim();
    navigate(`/funds/${id}?invest=true`, { replace: false });
  };

  const handleViewDetails = (fundId: string) => {
    navigate(`/funds/${fundId}`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: afisteTheme.colors.background,
        padding: `${afisteTheme.spacing.xl} ${afisteTheme.spacing.md}`,
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Filters */}
        <div
          style={{
            background: afisteTheme.colors.surface,
            borderRadius: '10px',
            padding: '28px 32px',
            marginBottom: afisteTheme.spacing['2xl'],
            border: `1px solid ${afisteTheme.colors.border}`,
          }}
        >
          <div style={{ display: 'flex', gap: afisteTheme.spacing.lg, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 auto' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: afisteTheme.colors.textSecondary,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Estado
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${afisteTheme.colors.border}`,
                  fontSize: '14px',
                  minWidth: '140px',
                  backgroundColor: afisteTheme.colors.background,
                  color: afisteTheme.colors.text,
                  cursor: 'pointer',
                  fontWeight: '400',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${afisteTheme.colors.primary}15`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">Todos</option>
                <option value="active">Activo</option>
                <option value="closed">Cerrado</option>
                <option value="liquidated">Liquidado</option>
              </select>
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: afisteTheme.colors.textSecondary,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Nivel de Riesgo
              </label>
              <select
                value={filters.risk_level || ''}
                onChange={(e) => setFilters({ ...filters, risk_level: e.target.value as any })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${afisteTheme.colors.border}`,
                  fontSize: '14px',
                  minWidth: '140px',
                  backgroundColor: afisteTheme.colors.background,
                  color: afisteTheme.colors.text,
                  cursor: 'pointer',
                  fontWeight: '400',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${afisteTheme.colors.primary}15`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">Todos</option>
                <option value="low">Bajo</option>
                <option value="medium">Medio</option>
                <option value="high">Alto</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '280px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: afisteTheme.colors.textSecondary,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Buscar
              </label>
              <input
                type="text"
                placeholder="Buscar fondos..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${afisteTheme.colors.border}`,
                  fontSize: '14px',
                  backgroundColor: afisteTheme.colors.background,
                  color: afisteTheme.colors.text,
                  fontWeight: '400',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${afisteTheme.colors.primary}15`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* Warning State (e.g., database unavailable) */}
        {warning && (
          <div
            style={{
              background: '#FFF3CD',
              color: '#856404',
              padding: afisteTheme.spacing.md,
              borderRadius: afisteTheme.borderRadius.md,
              marginBottom: afisteTheme.spacing.lg,
              border: '1px solid #FFE69C',
            }}
          >
            <strong>Advertencia:</strong> {warning}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            style={{
              background: afisteTheme.colors.error,
              color: '#FFFFFF',
              padding: afisteTheme.spacing.md,
              borderRadius: afisteTheme.borderRadius.md,
              marginBottom: afisteTheme.spacing.lg,
            }}
          >
            {error.message}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: afisteTheme.spacing['2xl'] }}>
            <div style={{ 
              fontSize: '15px', 
              color: afisteTheme.colors.textSecondary,
              fontWeight: '400',
              letterSpacing: '0.3px',
            }}>
              Cargando fondos...
            </div>
          </div>
        )}

        {/* Funds Grid */}
        {!loading && !error && (
          <>
            {funds.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: `${afisteTheme.spacing['3xl']} ${afisteTheme.spacing.xl}`,
                  background: afisteTheme.colors.surface,
                  borderRadius: '10px',
                  border: `1px solid ${afisteTheme.colors.border}`,
                }}
              >
                <p style={{ 
                  fontSize: '15px', 
                  color: afisteTheme.colors.textSecondary,
                  fontWeight: '400',
                  letterSpacing: '0.2px',
                }}>
                  No se encontraron fondos que coincidan con tus criterios
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                  gap: '28px',
                }}
              >
                {funds.map((fund) => (
                  <VCFundCard
                    key={fund.id}
                    fund={fund}
                    onInvest={handleInvest}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

