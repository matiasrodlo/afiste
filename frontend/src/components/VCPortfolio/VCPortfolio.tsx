import React from 'react';
import { VCFundPortfolioCompany } from '../../types/vcFund.types';
import { afisteTheme } from '../../styles/afiste-theme';

interface VCPortfolioProps {
  companies: VCFundPortfolioCompany[];
}

export const VCPortfolio: React.FC<VCPortfolioProps> = ({ companies }) => {
  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value?: number) => {
    if (!value) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (companies.length === 0) {
    return (
      <div
        style={{
          padding: afisteTheme.spacing.xl,
          textAlign: 'center',
          color: afisteTheme.colors.textSecondary,
        }}
      >
        No hay empresas del portafolio disponibles
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: afisteTheme.colors.surface,
          borderRadius: afisteTheme.borderRadius.lg,
          overflow: 'hidden',
        }}
      >
        <thead>
          <tr style={{ background: afisteTheme.colors.background }}>
            <th
              style={{
                padding: afisteTheme.spacing.md,
                textAlign: 'left',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: afisteTheme.colors.text,
                borderBottom: `2px solid ${afisteTheme.colors.border}`,
              }}
            >
              Empresa
            </th>
            <th
              style={{
                padding: afisteTheme.spacing.md,
                textAlign: 'left',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: afisteTheme.colors.text,
                borderBottom: `2px solid ${afisteTheme.colors.border}`,
              }}
            >
              Sector
            </th>
            <th
              style={{
                padding: afisteTheme.spacing.md,
                textAlign: 'left',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: afisteTheme.colors.text,
                borderBottom: `2px solid ${afisteTheme.colors.border}`,
              }}
            >
              Etapa
            </th>
            <th
              style={{
                padding: afisteTheme.spacing.md,
                textAlign: 'right',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: afisteTheme.colors.text,
                borderBottom: `2px solid ${afisteTheme.colors.border}`,
              }}
            >
              Inversión
            </th>
            <th
              style={{
                padding: afisteTheme.spacing.md,
                textAlign: 'right',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: afisteTheme.colors.text,
                borderBottom: `2px solid ${afisteTheme.colors.border}`,
              }}
            >
              Valor Actual
            </th>
            <th
              style={{
                padding: afisteTheme.spacing.md,
                textAlign: 'right',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: afisteTheme.colors.text,
                borderBottom: `2px solid ${afisteTheme.colors.border}`,
              }}
            >
              ROI
            </th>
            <th
              style={{
                padding: afisteTheme.spacing.md,
                textAlign: 'right',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: afisteTheme.colors.text,
                borderBottom: `2px solid ${afisteTheme.colors.border}`,
              }}
            >
              Participación
            </th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company, index) => {
            const roi = company.roi || 0;
            const roiColor = roi >= 0 ? afisteTheme.colors.success : afisteTheme.colors.error;

            return (
              <tr
                key={company.id || index}
                style={{
                  borderBottom: `1px solid ${afisteTheme.colors.border}`,
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = afisteTheme.colors.background;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td style={{ padding: afisteTheme.spacing.md }}>
                  <div style={{ fontWeight: 500, color: afisteTheme.colors.text, marginBottom: afisteTheme.spacing.xs }}>
                    {company.name}
                  </div>
                  {company.description && (
                    <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textSecondary }}>
                      {company.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: afisteTheme.spacing.md, color: afisteTheme.colors.textSecondary }}>
                  {company.sector || 'N/A'}
                </td>
                <td style={{ padding: afisteTheme.spacing.md, color: afisteTheme.colors.textSecondary }}>
                  {company.stage || 'N/A'}
                </td>
                <td style={{ padding: afisteTheme.spacing.md, textAlign: 'right', color: afisteTheme.colors.text }}>
                  {formatCurrency(company.investment_amount)}
                  {company.investment_date && (
                    <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textSecondary, marginTop: afisteTheme.spacing.xs }}>
                      {formatDate(company.investment_date)}
                    </div>
                  )}
                </td>
                <td style={{ padding: afisteTheme.spacing.md, textAlign: 'right', color: afisteTheme.colors.text, fontWeight: 500 }}>
                  {formatCurrency(company.current_valuation)}
                </td>
                <td style={{ padding: afisteTheme.spacing.md, textAlign: 'right' }}>
                  <span style={{ color: roiColor, fontWeight: 600 }}>
                    {roi >= 0 ? '+' : ''}{formatPercentage(roi)}
                  </span>
                </td>
                <td style={{ padding: afisteTheme.spacing.md, textAlign: 'right', color: afisteTheme.colors.textSecondary }}>
                  {formatPercentage(company.ownership_percentage)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

