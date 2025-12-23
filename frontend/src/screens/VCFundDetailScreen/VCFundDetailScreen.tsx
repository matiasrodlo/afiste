import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { VCFundDetail, VCFundPortfolioCompany, VCFundPerformanceRecord } from '../../types/vcFund.types';
import { useVCFunds } from '../../hooks/useVCFunds';
import { VCPortfolio } from '../../components/VCPortfolio/VCPortfolio';
import { VCPerformanceChart } from '../../components/VCPerformanceChart/VCPerformanceChart';
import { InvestmentForm } from '../../components/InvestmentForm/InvestmentForm';
import { BlockchainTransactions, BlockchainTransaction } from '../../components/BlockchainTransactions/BlockchainTransactions';
import { publicTokenOfferingsAPI, TokenOffering } from '../../api/tokenOfferings';
import { publicFeesAPI, FundFee } from '../../api/fees';
import { vcInvestmentsAPI } from '../../api/vcFunds';
import { blockchainAPI } from '../../api/blockchain';
import { authAPI } from '../../api/auth';
import { afisteTheme } from '../../styles/afiste-theme';

export const VCFundDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getVCFund, getVCFundPortfolio, getVCFundPerformance, loading, error } = useVCFunds();
  const [fund, setFund] = useState<VCFundDetail | null>(null);
  const [portfolio, setPortfolio] = useState<VCFundPortfolioCompany[]>([]);
  const [performance, setPerformance] = useState<VCFundPerformanceRecord[]>([]);
  // Check if we should show invest form from navigation state, hash, or query param
  // But only if user is authenticated
  const shouldShowFormInitially = 
    (location.state as any)?.showInvestForm || 
    location.hash === '#invest' || 
    searchParams.get('invest') === 'true';
  
  const [showInvestForm, setShowInvestForm] = useState(
    shouldShowFormInitially && authAPI.isAuthenticated()
  );
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('ALL');
  const [offering, setOffering] = useState<TokenOffering | null>(null);
  const [fees, setFees] = useState<FundFee[]>([]);
  const [blockchainTransactions, setBlockchainTransactions] = useState<BlockchainTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    if (id) {
      loadFundData();
    }
  }, [id]);

  // Handle location state, hash, or query param for showing invest form from marketplace
  useEffect(() => {
    const shouldShowForm = 
      (location.state as any)?.showInvestForm || 
      location.hash === '#invest' || 
      searchParams.get('invest') === 'true';
    
    if (shouldShowForm) {
      // Check authentication before showing form
      if (!authAPI.isAuthenticated()) {
        const currentPath = location.pathname + location.search;
        navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }
      
      if (!showInvestForm) {
        setShowInvestForm(true);
        // Remove query param from URL after reading it
        if (searchParams.get('invest') === 'true') {
          searchParams.delete('invest');
          setSearchParams(searchParams, { replace: true });
        }
        // Clear the state but preserve the pathname
        if (location.hash === '#invest') {
          window.history.replaceState({}, document.title, location.pathname);
        }
      }
    }
  }, [location.state, location.hash, location.pathname, searchParams, setSearchParams, showInvestForm, navigate]);

  // Scroll to invest form when it becomes visible
  useEffect(() => {
    if (showInvestForm && fund && !loading) {
      // Wait for form to render
      const scrollToInvestForm = () => {
        const investForm = document.getElementById('invest-form');
        if (investForm) {
          investForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Remove hash from URL after scrolling
          if (location.hash === '#invest') {
            window.history.replaceState({}, document.title, location.pathname);
          }
        }
      };
      
      // Delay to ensure component is fully rendered
      const SCROLL_DELAY_MS = 500;
      setTimeout(scrollToInvestForm, SCROLL_DELAY_MS);
    }
  }, [showInvestForm, fund, loading, location.hash, location.pathname]);

  const loadFundData = async () => {
    if (!id) return;
    const fundId = id; // TypeScript now knows this is string
    try {
      const [fundData, portfolioData, performanceData, offeringData, feesData] = await Promise.all([
        getVCFund(fundId),
        getVCFundPortfolio(fundId),
        getVCFundPerformance(fundId, { limit: 100 }),
        publicTokenOfferingsAPI.getOfferingByFund(fundId).catch(() => null),
        publicFeesAPI.getFundFees(fundId).catch(() => []),
      ]);
      setFund(fundData);
      setPortfolio(portfolioData);
      setPerformance(performanceData);
      setOffering(offeringData);
      setFees(feesData);
      
      // Update page title with fund name
      if (fundData?.name) {
        document.title = `${fundData.name} - Afiste`;
      }

      // Load blockchain transactions for this fund
      loadBlockchainTransactions(fundId);
    } catch (err) {
      console.error('Failed to load fund data:', err);
    }
  };

  const loadBlockchainTransactions = async (fundId: string) => {
    try {
      setLoadingTransactions(true);
      const data = await blockchainAPI.getFundTransactions(fundId, { limit: 20 });
      setBlockchainTransactions(data.transactions);
    } catch (err) {
      console.error('Failed to load blockchain transactions:', err);
      // Don't show error to user, just log it
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleInvest = async (amount: number) => {
    // Check authentication first
    if (!authAPI.isAuthenticated()) {
      // Redirect to login with return URL
      const currentPath = location.pathname + location.search;
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (!id) {
      throw new Error('Fund ID is required');
    }

    try {
      const response = await vcInvestmentsAPI.createInvestment(id, amount);
      
      // Reload fund data to update balances
      await loadFundData();
      
      // Hide form
      setShowInvestForm(false);
    } catch (error: any) {
      // Handle 401 Unauthorized - redirect to login
      if (error.response?.status === 401) {
        const currentPath = location.pathname + location.search;
        navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }
      
      // Re-throw error so InvestmentForm can display it
      throw error;
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

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
      return 'N/A';
    }
    return `${value.toFixed(2)}%`;
  };

  if (loading && !fund) {
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
        <div style={{ fontSize: '1.125rem', color: afisteTheme.colors.textSecondary }}>Cargando detalles del fondo...</div>
      </div>
    );
  }

  if (error || !fund) {
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
            borderRadius: afisteTheme.borderRadius.lg,
            padding: afisteTheme.spacing.xl,
            border: `1px solid ${afisteTheme.colors.border}`,
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: `0 0 ${afisteTheme.spacing.md} 0`, color: afisteTheme.colors.text }}>
            Fondo No Encontrado
          </h2>
          <p style={{ margin: `0 0 ${afisteTheme.spacing.lg} 0`, color: afisteTheme.colors.textSecondary }}>
            {error?.message || 'El fondo que buscas no existe.'}
          </p>
          <button
            onClick={() => navigate('/marketplace')}
            style={{
              padding: `${afisteTheme.spacing.sm} ${afisteTheme.spacing.lg}`,
              borderRadius: afisteTheme.borderRadius.md,
              border: 'none',
              background: afisteTheme.colors.primary,
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Volver al Marketplace
          </button>
        </div>
      </div>
    );
  }

  const riskLevel = afisteTheme.riskLevels[fund.risk_level] || afisteTheme.riskLevels.medium;
  const statusColor = afisteTheme.statusColors[fund.status] || afisteTheme.statusColors.active;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: afisteTheme.colors.background,
        padding: `${afisteTheme.spacing.xl} ${afisteTheme.spacing.md}`,
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            background: afisteTheme.colors.surface,
            borderRadius: '10px',
            padding: '48px 40px',
            marginBottom: afisteTheme.spacing['2xl'],
            border: `1px solid ${afisteTheme.colors.border}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: afisteTheme.spacing.xl }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ 
                margin: `0 0 ${afisteTheme.spacing.sm} 0`, 
                fontSize: 'clamp(32px, 4vw, 48px)', 
                fontWeight: '400', 
                color: afisteTheme.colors.text,
                letterSpacing: '-0.02em',
                lineHeight: '1.2',
              }}>
                {fund.name}
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: '1.125rem', 
                color: afisteTheme.colors.textSecondary,
                fontWeight: '300',
                letterSpacing: '0.01em',
              }}>
                {fund.manager}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: statusColor.bg,
                  color: statusColor.color,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  letterSpacing: '0.3px',
                }}
              >
                {fund.status}
              </span>
              <span
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: riskLevel.bg,
                  color: riskLevel.color,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                }}
              >
                {riskLevel.text}
              </span>
            </div>
          </div>

          {fund.description && (
            <p style={{ 
              margin: `0 0 ${afisteTheme.spacing.xl} 0`, 
              fontSize: '1rem', 
              color: afisteTheme.colors.text, 
              lineHeight: 1.7,
              fontWeight: '300',
              letterSpacing: '0.01em',
              maxWidth: '800px',
            }}>
              {fund.description}
            </p>
          )}

          {/* Key Stats - Enhanced Design */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
              paddingTop: afisteTheme.spacing.xl,
              borderTop: `1px solid ${afisteTheme.colors.borderLight}`,
              marginTop: afisteTheme.spacing.xl,
            }}
          >
            {/* Current NAV Card */}
            <div
              style={{
                background: afisteTheme.colors.background,
                borderRadius: '8px',
                padding: '28px',
                border: `1px solid ${afisteTheme.colors.border}`,
              }}
            >
              <div style={{ 
                fontSize: '0.7rem', 
                color: afisteTheme.colors.textSecondary, 
                marginBottom: '12px', 
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                NAV Actual por Token
              </div>
              <div style={{ 
                fontSize: 'clamp(28px, 3vw, 36px)', 
                fontWeight: '400', 
                marginBottom: '8px', 
                color: afisteTheme.colors.text,
                letterSpacing: '-0.02em',
              }}>
                {formatCurrency(fund.latest_nav || fund.current_nav)}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: afisteTheme.colors.textLight,
                fontWeight: '300',
              }}>
                Valor Neto de Activos
              </div>
            </div>

            {/* Fund Size Card */}
            <div
              style={{
                background: afisteTheme.colors.background,
                borderRadius: '8px',
                padding: '28px',
                border: `1px solid ${afisteTheme.colors.border}`,
              }}
            >
              <div style={{ 
                fontSize: '0.7rem', 
                color: afisteTheme.colors.textSecondary, 
                marginBottom: '12px', 
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Tamaño Total del Fondo
              </div>
              <div style={{ 
                fontSize: 'clamp(28px, 3vw, 36px)', 
                fontWeight: '400', 
                marginBottom: '8px', 
                color: afisteTheme.colors.text,
                letterSpacing: '-0.02em',
              }}>
                {formatCurrency(fund.fund_size || 0)}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: afisteTheme.colors.textLight,
                fontWeight: '300',
              }}>
                Total de Activos Bajo Gestión
              </div>
            </div>

            {/* Minimum Investment Card */}
            <div
              style={{
                background: afisteTheme.colors.background,
                borderRadius: '8px',
                padding: '28px',
                border: `1px solid ${afisteTheme.colors.border}`,
              }}
            >
              <div style={{ 
                fontSize: '0.7rem', 
                color: afisteTheme.colors.textSecondary, 
                marginBottom: '12px', 
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Inversión Mínima
              </div>
              <div style={{ 
                fontSize: 'clamp(28px, 3vw, 36px)', 
                fontWeight: '400', 
                marginBottom: '8px', 
                color: afisteTheme.colors.text,
                letterSpacing: '-0.02em',
              }}>
                {formatCurrency(fund.minimum_investment)}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: afisteTheme.colors.textLight,
                fontWeight: '300',
              }}>
                Umbral de Entrada
              </div>
            </div>

            {/* Available Tokens Card */}
            <div
              style={{
                background: afisteTheme.colors.background,
                borderRadius: '8px',
                padding: '28px',
                border: `1px solid ${afisteTheme.colors.border}`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ 
                fontSize: '0.7rem', 
                color: afisteTheme.colors.textSecondary, 
                marginBottom: '12px', 
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Tokens Disponibles
              </div>
              <div style={{ 
                fontSize: 'clamp(28px, 3vw, 36px)', 
                fontWeight: '400', 
                marginBottom: '8px', 
                color: afisteTheme.colors.text,
                letterSpacing: '-0.02em',
              }}>
                {formatPercentage(fund.tokens_available_percentage)}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: afisteTheme.colors.textLight,
                fontWeight: '300',
              }}>
                {fund.available_supply?.toLocaleString() || '0'} de {fund.total_supply?.toLocaleString() || '0'} tokens
              </div>
              {/* Progress bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: afisteTheme.colors.borderLight,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${fund.tokens_available_percentage || 0}%`,
                    background: afisteTheme.colors.primary,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Additional Info Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '32px',
              paddingTop: afisteTheme.spacing.xl,
              marginTop: afisteTheme.spacing.lg,
              borderTop: `1px solid ${afisteTheme.colors.borderLight}`,
            }}
          >
            {fund.launch_date && (
              <div>
                <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textSecondary, marginBottom: afisteTheme.spacing.xs, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Fecha de Lanzamiento
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: afisteTheme.colors.text }}>
                  {new Date(fund.launch_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            )}
            {fund.maturity_date && (
              <div>
                <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textSecondary, marginBottom: afisteTheme.spacing.xs, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Fecha de Vencimiento
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: afisteTheme.colors.text }}>
                  {new Date(fund.maturity_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            )}
            {fund.regulatory_status && (
              <div>
                <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textSecondary, marginBottom: afisteTheme.spacing.xs, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Estado Regulatorio
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: fund.regulatory_status === 'approved' ? '#10b981' : afisteTheme.colors.text, textTransform: 'capitalize' }}>
                  {fund.regulatory_status}
                </div>
              </div>
            )}
          </div>

          {/* Token Offering Button */}
          {offering && offering.status === 'active' && (
            <div style={{ marginTop: afisteTheme.spacing['2xl'] }}>
              <button
                onClick={() => navigate(`/offerings/${offering.id}`)}
                style={{
                  width: '100%',
                  padding: '18px 32px',
                  borderRadius: '6px',
                  border: 'none',
                  background: afisteTheme.colors.accent,
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  letterSpacing: '0.3px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.opacity = '0.95';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Ver Oferta de Tokens
              </button>
            </div>
          )}

          {/* Invest Button - Enhanced */}
          {fund.status === 'active' && !offering && (
            <div style={{ marginTop: afisteTheme.spacing['2xl'] }}>
              <button
                onClick={() => {
                  // Check authentication before showing invest form
                  if (!authAPI.isAuthenticated()) {
                    const currentPath = location.pathname + location.search;
                    navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
                    return;
                  }
                  setShowInvestForm(!showInvestForm);
                }}
                style={{
                  width: '100%',
                  padding: '18px 32px',
                  borderRadius: '6px',
                  border: 'none',
                  background: showInvestForm ? afisteTheme.colors.textSecondary : afisteTheme.colors.primary,
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  letterSpacing: '0.3px',
                }}
                onMouseEnter={(e) => {
                  if (!showInvestForm) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.opacity = '0.95';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {showInvestForm ? 'Cancelar Inversión' : 'Invertir en ' + fund.name}
              </button>
            </div>
          )}
        </div>

        {/* Investment Form */}
        {showInvestForm && fund.status === 'active' && (
          <div id="invest-form" style={{ marginBottom: afisteTheme.spacing.xl }}>
            <InvestmentForm fund={fund} onSubmit={handleInvest} onCancel={() => setShowInvestForm(false)} />
          </div>
        )}

        {/* Performance Chart */}
        {performance.length > 0 && (
          <div style={{ 
            marginBottom: afisteTheme.spacing['2xl'],
            background: afisteTheme.colors.surface,
            borderRadius: '10px',
            padding: '40px',
            border: `1px solid ${afisteTheme.colors.border}`,
          }}>
            <div style={{ marginBottom: afisteTheme.spacing.lg }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '6px',
                      border: `1px solid ${timeframe === tf ? afisteTheme.colors.primary : afisteTheme.colors.border}`,
                      background: timeframe === tf ? afisteTheme.colors.primary : 'transparent',
                      color: timeframe === tf ? '#FFFFFF' : afisteTheme.colors.text,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      letterSpacing: '0.3px',
                    }}
                    onMouseEnter={(e) => {
                      if (timeframe !== tf) {
                        e.currentTarget.style.borderColor = afisteTheme.colors.text;
                        e.currentTarget.style.backgroundColor = afisteTheme.colors.surfaceLight;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (timeframe !== tf) {
                        e.currentTarget.style.borderColor = afisteTheme.colors.border;
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <VCPerformanceChart records={performance} timeframe={timeframe} />
          </div>
        )}

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <div style={{ 
            marginBottom: afisteTheme.spacing['2xl'],
            background: afisteTheme.colors.surface,
            borderRadius: '10px',
            padding: '40px',
            border: `1px solid ${afisteTheme.colors.border}`,
          }}>
            <h2 style={{ 
              margin: `0 0 ${afisteTheme.spacing.xl} 0`, 
              fontSize: '1.75rem', 
              fontWeight: '400', 
              color: afisteTheme.colors.text,
              letterSpacing: '-0.01em',
            }}>
              Empresas del Portafolio
            </h2>
            <VCPortfolio companies={portfolio} />
          </div>
        )}

        {/* Fees */}
        {fees.length > 0 && (
          <div
            style={{
              background: afisteTheme.colors.surface,
              borderRadius: '10px',
              padding: '40px',
              border: `1px solid ${afisteTheme.colors.border}`,
              marginBottom: afisteTheme.spacing['2xl'],
            }}
          >
            <h2 style={{ 
              margin: `0 0 ${afisteTheme.spacing.xl} 0`, 
              fontSize: '1.75rem', 
              fontWeight: '400', 
              color: afisteTheme.colors.text,
              letterSpacing: '-0.01em',
            }}>
              Estructura de Comisiones
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: afisteTheme.spacing.md }}>
              {fees.map((fee) => (
                <div
                  key={fee.id}
                  style={{
                    padding: afisteTheme.spacing.md,
                    background: afisteTheme.colors.surfaceLight,
                    borderRadius: afisteTheme.borderRadius.md,
                    border: `1px solid ${afisteTheme.colors.border}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: afisteTheme.spacing.xs }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: afisteTheme.colors.text, textTransform: 'capitalize' }}>
                      {fee.feeType.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: afisteTheme.colors.primary }}>
                      {fee.rate}%
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: afisteTheme.colors.textSecondary }}>
                    {fee.calculationMethod.replace('_', ' ')} • {fee.period}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blockchain Transactions */}
        <div style={{ marginBottom: afisteTheme.spacing.xl }}>
          <BlockchainTransactions
            transactions={blockchainTransactions}
            loading={loadingTransactions}
            title="Transacciones Blockchain"
            showContractAddress={true}
          />
        </div>

        {/* Terms */}
        {fund.terms && (
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
              Términos y Condiciones
            </h2>
            <div 
              style={{ 
                color: afisteTheme.colors.text, 
                lineHeight: 1.5, 
                whiteSpace: 'pre-wrap',
                maxHeight: '250px',
                overflowY: 'auto',
                paddingRight: '16px',
                fontSize: '11px',
                fontFamily: afisteTheme.fonts.body,
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
              }}
              className="terms-scroll-container"
            >
              {fund.terms}
            </div>
            <style>{`
              .terms-scroll-container::-webkit-scrollbar {
                width: 8px;
              }
              .terms-scroll-container::-webkit-scrollbar-track {
                background: ${afisteTheme.colors.surfaceLight};
                borderRadius: 4px;
              }
              .terms-scroll-container::-webkit-scrollbar-thumb {
                background: ${afisteTheme.colors.borderDark};
                borderRadius: 4px;
              }
              .terms-scroll-container::-webkit-scrollbar-thumb:hover {
                background: ${afisteTheme.colors.textSecondary};
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
};

