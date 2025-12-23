import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVCInvestments } from '../../hooks/useVCFunds';
import { authAPI } from '../../api/auth';
import { Portfolio, InvestmentFund } from '../../types/vcFund.types';
import { afisteTheme } from '../../styles/afiste-theme';

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getPortfolio, loading, error } = useVCInvestments();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    // Check authentication first
    if (!authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadPortfolio();
  }, [navigate, location.pathname]);

  const loadPortfolio = async () => {
    try {
      const data = await getPortfolio();
      setPortfolio(data);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load portfolio:', err);
      }
      // If 401 Unauthorized, redirect to login
      if (err?.response?.status === 401 || err?.status === 401) {
        authAPI.logout();
        navigate('/login');
      }
    }
  };

  const formatCurrency = (value: number | undefined | null) => {
    const numValue = typeof value === 'number' ? value : (value ? Number(value) : 0);
    if (isNaN(numValue)) return '$0';
    // Handle values very close to zero (rounding errors)
    const roundedValue = Math.abs(numValue) < 0.01 ? 0 : numValue;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(roundedValue);
  };

  const formatPercentage = (value: number | undefined | null) => {
    const numValue = typeof value === 'number' ? value : (value ? Number(value) : 0);
    if (isNaN(numValue)) return '+0.00%';
    // Handle values very close to zero (rounding errors)
    const roundedValue = Math.abs(numValue) < 0.01 ? 0 : numValue;
    return `${roundedValue >= 0 ? '+' : ''}${roundedValue.toFixed(2)}%`;
  };

  if (loading && !portfolio) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: afisteTheme.colors.background,
        }}
      >
        <div style={{ 
          fontSize: '15px', 
          color: afisteTheme.colors.textSecondary,
          fontWeight: '300',
        }}>
          Cargando portafolio...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: afisteTheme.colors.background,
          padding: afisteTheme.spacing.xl,
        }}
      >
        <div
          style={{
            background: afisteTheme.colors.surface,
            borderRadius: '10px',
            padding: '40px',
            border: `1px solid ${afisteTheme.colors.border}`,
            textAlign: 'center',
            maxWidth: '500px',
          }}
        >
          <h2 style={{ 
            margin: `0 0 ${afisteTheme.spacing.md} 0`, 
            color: afisteTheme.colors.text,
            fontSize: '1.5rem',
            fontWeight: '400',
            letterSpacing: '-0.01em',
          }}>
            Error
          </h2>
          <p style={{ 
            margin: 0, 
            color: afisteTheme.colors.textSecondary,
            fontSize: '15px',
            fontWeight: '300',
          }}>
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!portfolio || portfolio.funds.length === 0) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: afisteTheme.colors.background,
          padding: `${afisteTheme.spacing.xl} ${afisteTheme.spacing.md}`,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '56px' }}>
            <h1 style={{ 
              margin: `0 0 ${afisteTheme.spacing.sm} 0`, 
              fontSize: 'clamp(36px, 5vw, 52px)', 
              fontWeight: '400', 
              color: afisteTheme.colors.text,
              letterSpacing: '-0.02em',
              lineHeight: '1.2',
            }}>
              Dashboard
            </h1>
            <p style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '300',
              color: afisteTheme.colors.textSecondary,
              letterSpacing: '0.01em',
            }}>
              Resumen de tus inversiones
            </p>
          </div>
          <div
            style={{
              background: afisteTheme.colors.surface,
              borderRadius: '10px',
              padding: '64px 40px',
              border: `1px solid ${afisteTheme.colors.border}`,
              textAlign: 'center',
            }}
          >
            <p style={{ 
              fontSize: '16px', 
              fontWeight: '300',
              color: afisteTheme.colors.textSecondary, 
              margin: `0 0 ${afisteTheme.spacing.lg} 0`,
              letterSpacing: '0.01em',
            }}>
              Aún no tienes inversiones. Comienza depositando fondos y luego explora los fondos disponibles.
            </p>
            <div style={{ display: 'flex', gap: afisteTheme.spacing.md, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/payments')}
                style={{
                  padding: '16px 32px',
                  borderRadius: '6px',
                  border: 'none',
                  background: afisteTheme.colors.primary,
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  letterSpacing: '0.3px',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = afisteTheme.colors.primaryDark;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.opacity = '0.95';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = afisteTheme.colors.primary;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Depositar Fondos
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                style={{
                  padding: '16px 32px',
                  borderRadius: '6px',
                  border: `1px solid ${afisteTheme.colors.border}`,
                  background: 'transparent',
                  color: afisteTheme.colors.text,
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  letterSpacing: '0.3px',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                  e.currentTarget.style.color = afisteTheme.colors.primary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.border;
                  e.currentTarget.style.color = afisteTheme.colors.text;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Explorar Fondos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: afisteTheme.colors.background,
        padding: `${afisteTheme.spacing.xl} ${afisteTheme.spacing.md}`,
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '56px' }}>
          <h1 style={{ 
            margin: `0 0 ${afisteTheme.spacing.sm} 0`, 
            fontSize: 'clamp(36px, 5vw, 52px)', 
            fontWeight: '400', 
            color: afisteTheme.colors.text,
            letterSpacing: '-0.02em',
            lineHeight: '1.2',
          }}>
            Dashboard
          </h1>
          <p style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '300',
            color: afisteTheme.colors.textSecondary,
            letterSpacing: '0.01em',
          }}>
            Resumen de tus inversiones
          </p>
        </div>

        {/* Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: afisteTheme.spacing['2xl'],
          }}
        >
          <div
            style={{
              background: afisteTheme.colors.surface,
              borderRadius: '10px',
              padding: '32px',
              border: `1px solid ${afisteTheme.colors.border}`,
            }}
          >
            <div style={{ 
              fontSize: '0.7rem', 
              color: afisteTheme.colors.textSecondary, 
              marginBottom: '16px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              fontWeight: '500',
            }}>
              Valor Total
            </div>
            <div style={{ 
              fontSize: 'clamp(32px, 4vw, 40px)', 
              fontWeight: '400', 
              color: afisteTheme.colors.text,
              letterSpacing: '-0.02em',
            }}>
              {formatCurrency(portfolio?.total_value)}
            </div>
          </div>

          <div
            style={{
              background: afisteTheme.colors.surface,
              borderRadius: '10px',
              padding: '32px',
              border: `1px solid ${afisteTheme.colors.border}`,
            }}
          >
            <div style={{ 
              fontSize: '0.7rem', 
              color: afisteTheme.colors.textSecondary, 
              marginBottom: '16px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              fontWeight: '500',
            }}>
              Total Invertido
            </div>
            <div style={{ 
              fontSize: 'clamp(32px, 4vw, 40px)', 
              fontWeight: '400', 
              color: afisteTheme.colors.text,
              letterSpacing: '-0.02em',
            }}>
              {formatCurrency(portfolio?.total_invested)}
            </div>
          </div>

          <div
            style={{
              background: afisteTheme.colors.surface,
              borderRadius: '10px',
              padding: '32px',
              border: `1px solid ${afisteTheme.colors.border}`,
            }}
          >
            <div style={{ 
              fontSize: '0.7rem', 
              color: afisteTheme.colors.textSecondary, 
              marginBottom: '16px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              fontWeight: '500',
            }}>
              Ganancias Totales
            </div>
            <div
              style={{
                fontSize: 'clamp(32px, 4vw, 40px)',
                fontWeight: '400',
                color: (portfolio?.total_gains ?? 0) >= 0 ? afisteTheme.colors.success : afisteTheme.colors.error,
                letterSpacing: '-0.02em',
                marginBottom: '8px',
              }}
            >
              {formatCurrency(portfolio?.total_gains)}
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: '400',
                color: (portfolio?.total_gains ?? 0) >= 0 ? afisteTheme.colors.success : afisteTheme.colors.error,
                letterSpacing: '0.01em',
              }}
            >
              {formatPercentage(portfolio?.total_gains_percentage)}
            </div>
          </div>
        </div>

        {/* Funds List */}
        <div
          style={{
            background: afisteTheme.colors.surface,
            borderRadius: '10px',
            padding: '40px',
            border: `1px solid ${afisteTheme.colors.border}`,
          }}
        >
          <h2 style={{ 
            margin: `0 0 ${afisteTheme.spacing.xl} 0`, 
            fontSize: '1.75rem', 
            fontWeight: '400', 
            color: afisteTheme.colors.text,
            letterSpacing: '-0.01em',
          }}>
            Tus Inversiones
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${afisteTheme.colors.borderLight}` }}>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: afisteTheme.colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Fondo
                  </th>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'right',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: afisteTheme.colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Tokens
                  </th>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'right',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: afisteTheme.colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    NAV
                  </th>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'right',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: afisteTheme.colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Valor Actual
                  </th>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'right',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: afisteTheme.colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Ganancias/Pérdidas
                  </th>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: afisteTheme.colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {portfolio.funds.map((fund: InvestmentFund, index: number) => {
                  return (
                    <tr
                      key={fund.fund_id || index}
                      style={{
                        borderBottom: `1px solid ${afisteTheme.colors.borderLight}`,
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = afisteTheme.colors.background;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '20px' }}>
                        <div style={{ 
                          fontWeight: '500', 
                          color: afisteTheme.colors.text,
                          fontSize: '15px',
                          marginBottom: '4px',
                        }}>
                          {fund.fund_name}
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: afisteTheme.colors.textSecondary,
                          fontWeight: '300',
                        }}>
                          {fund.currency_id}
                        </div>
                      </td>
                      <td style={{ 
                        padding: '20px', 
                        textAlign: 'right', 
                        color: afisteTheme.colors.text,
                        fontSize: '15px',
                        fontWeight: '400',
                      }}>
                        {typeof fund.tokens === 'number' && !isNaN(fund.tokens) 
                          ? fund.tokens.toLocaleString('en-US', { maximumFractionDigits: 4 })
                          : '0'}
                      </td>
                      <td style={{ 
                        padding: '20px', 
                        textAlign: 'right', 
                        color: afisteTheme.colors.text,
                        fontSize: '15px',
                        fontWeight: '400',
                      }}>
                        {formatCurrency(fund.nav || 0)}
                      </td>
                      <td style={{ 
                        padding: '20px', 
                        textAlign: 'right', 
                        color: afisteTheme.colors.text, 
                        fontWeight: '500',
                        fontSize: '15px',
                      }}>
                        {formatCurrency(fund.current_value || 0)}
                      </td>
                      <td style={{ padding: '20px', textAlign: 'right' }}>
                        <div
                          style={{
                            color: (fund.gains ?? 0) >= 0 ? afisteTheme.colors.success : afisteTheme.colors.error,
                            fontWeight: '500',
                            fontSize: '15px',
                            marginBottom: '4px',
                          }}
                        >
                          {formatCurrency(fund.gains || 0)}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: (fund.gains ?? 0) >= 0 ? afisteTheme.colors.success : afisteTheme.colors.error,
                            fontWeight: '400',
                          }}
                        >
                          {formatPercentage(fund.gains_percentage || 0)}
                        </div>
                      </td>
                      <td style={{ padding: '20px', textAlign: 'center' }}>
                        {fund.fund_id ? (
                          <button
                            onClick={() => {
                              if (fund.fund_id) {
                                navigate(`/funds/${fund.fund_id}`);
                              } else {
                                console.error('Cannot navigate: fund_id is missing', fund);
                              }
                            }}
                            style={{
                              padding: '10px 18px',
                              borderRadius: '6px',
                              border: `1px solid ${afisteTheme.colors.border}`,
                              background: 'transparent',
                              color: afisteTheme.colors.text,
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              letterSpacing: '0.3px',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                              e.currentTarget.style.color = afisteTheme.colors.primary;
                              e.currentTarget.style.backgroundColor = afisteTheme.colors.surfaceLight;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = afisteTheme.colors.border;
                              e.currentTarget.style.color = afisteTheme.colors.text;
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                          Ver
                        </button>
                        ) : (
                          <span style={{ 
                            color: afisteTheme.colors.textSecondary, 
                            fontSize: '0.75rem',
                            fontWeight: '300',
                          }}>
                            N/A
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

