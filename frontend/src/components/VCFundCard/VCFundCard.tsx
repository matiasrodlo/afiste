import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VCFund } from '../../types/vcFund.types';
import { publicTokenOfferingsAPI, TokenOffering } from '../../api/tokenOfferings';
import { afisteTheme } from '../../styles/afiste-theme';

interface VCFundCardProps {
  fund: VCFund;
  onInvest?: (fundId: string) => void;
  onViewDetails?: (fundId: string) => void;
}

export const VCFundCard: React.FC<VCFundCardProps> = ({
  fund,
  onInvest,
  onViewDetails,
}) => {
  const navigate = useNavigate();
  const [offering, setOffering] = useState<TokenOffering | null>(null);
  const riskLevel = afisteTheme.riskLevels[fund.risk_level] || afisteTheme.riskLevels.medium;
  const statusColor = afisteTheme.statusColors[fund.status] || afisteTheme.statusColors.active;

  useEffect(() => {
    // Check if fund has an active offering
    publicTokenOfferingsAPI.getOfferingByFund(fund.id).then(setOffering).catch(() => setOffering(null));
  }, [fund.id]);

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

  return (
    <div
      style={{
        background: afisteTheme.colors.surface,
        borderRadius: '10px',
        padding: '28px',
        border: `1px solid ${afisteTheme.colors.border}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = afisteTheme.colors.primary;
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 82, 255, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = afisteTheme.colors.border;
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={() => onViewDetails?.(fund.id)}
    >
      {/* Header */}
      <div style={{ marginBottom: afisteTheme.spacing.lg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.375rem', 
            fontWeight: '500', 
            color: afisteTheme.colors.text,
            letterSpacing: '-0.01em',
            lineHeight: '1.3',
          }}>
            {fund.name}
          </h3>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: statusColor.bg,
              color: statusColor.color,
              fontSize: '0.7rem',
              fontWeight: 500,
              textTransform: 'capitalize',
              letterSpacing: '0.3px',
            }}
          >
            {fund.status}
          </span>
        </div>
        <p style={{ 
          margin: 0, 
          fontSize: '0.875rem', 
          color: afisteTheme.colors.textSecondary,
          fontWeight: '400',
          letterSpacing: '0.1px',
        }}>
          {fund.manager}
        </p>
      </div>

      {/* Description */}
      {fund.description && (
        <p
          style={{
            margin: `0 0 ${afisteTheme.spacing.lg} 0`,
            fontSize: '0.875rem',
            color: afisteTheme.colors.textSecondary,
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontWeight: '300',
            letterSpacing: '0.01em',
          }}
        >
          {fund.description}
        </p>
      )}

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          marginBottom: afisteTheme.spacing.lg,
          paddingTop: afisteTheme.spacing.md,
          borderTop: `1px solid ${afisteTheme.colors.borderLight}`,
        }}
      >
        <div>
          <div style={{ 
            fontSize: '0.7rem', 
            color: afisteTheme.colors.textSecondary, 
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '500',
          }}>
            NAV por Token
          </div>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: '500', 
            color: afisteTheme.colors.text,
            letterSpacing: '-0.01em',
          }}>
            {formatCurrency(fund.current_nav)}
          </div>
        </div>
        <div>
          <div style={{ 
            fontSize: '0.7rem', 
            color: afisteTheme.colors.textSecondary, 
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '500',
          }}>
            Inv. Mínima
          </div>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: '500', 
            color: afisteTheme.colors.text,
            letterSpacing: '-0.01em',
          }}>
            {formatCurrency(fund.minimum_investment)}
          </div>
        </div>
        <div>
          <div style={{ 
            fontSize: '0.7rem', 
            color: afisteTheme.colors.textSecondary, 
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '500',
          }}>
            Disponible
          </div>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: '500', 
            color: afisteTheme.colors.text,
            letterSpacing: '-0.01em',
          }}>
            {formatPercentage(fund.tokens_available_percentage)}
          </div>
        </div>
        <div>
          <div style={{ 
            fontSize: '0.7rem', 
            color: afisteTheme.colors.textSecondary, 
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '500',
          }}>
            Nivel de Riesgo
          </div>
          <span
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: riskLevel.bg,
              color: riskLevel.color,
              fontSize: '0.7rem',
              fontWeight: 500,
              letterSpacing: '0.3px',
            }}
          >
            {riskLevel.text}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: afisteTheme.spacing.md, flexDirection: 'column' }}>
        {offering && offering.status === 'active' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/offerings/${offering.id}`);
            }}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: afisteTheme.colors.primary,
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              marginBottom: '8px',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = afisteTheme.colors.primaryDark;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = afisteTheme.colors.primary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Oferta de Tokens Disponible
          </button>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewDetails?.(fund.id);
            }}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '6px',
              border: `1px solid ${afisteTheme.colors.border}`,
              backgroundColor: 'transparent',
              color: afisteTheme.colors.text,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = afisteTheme.colors.text;
              e.currentTarget.style.color = afisteTheme.colors.text;
              e.currentTarget.style.backgroundColor = afisteTheme.colors.surfaceLight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = afisteTheme.colors.border;
              e.currentTarget.style.color = afisteTheme.colors.text;
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Ver Detalles
          </button>
          {fund.status === 'active' && !offering && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (fund.id) {
                  onInvest?.(fund.id);
                } else {
                  if (process.env.NODE_ENV === 'development') {
                    console.error('Fund ID is missing, cannot navigate to invest page');
                  }
                }
              }}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: afisteTheme.colors.primary,
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = afisteTheme.colors.primaryDark;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = afisteTheme.colors.primary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              Invertir Ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

