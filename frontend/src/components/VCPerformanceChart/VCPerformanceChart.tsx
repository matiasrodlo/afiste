import React, { useMemo } from 'react';
import { VCFundPerformanceRecord } from '../../types/vcFund.types';
import { afisteTheme } from '../../styles/afiste-theme';

interface VCPerformanceChartProps {
  records: VCFundPerformanceRecord[];
  timeframe?: '1M' | '3M' | '6M' | '1Y' | 'ALL';
  height?: number;
}

export const VCPerformanceChart: React.FC<VCPerformanceChartProps> = ({
  records,
  timeframe = 'ALL',
  height = 300,
}) => {
  const filteredRecords = useMemo(() => {
    if (timeframe === 'ALL' || records.length === 0) return records;

    const now = new Date();
    const monthsAgo = {
      '1M': 1,
      '3M': 3,
      '6M': 6,
      '1Y': 12,
    }[timeframe];

    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate());
    return records.filter((record) => new Date(record.record_date) >= cutoffDate);
  }, [records, timeframe]);

  if (filteredRecords.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: afisteTheme.colors.surface,
          borderRadius: afisteTheme.borderRadius.lg,
          border: `1px solid ${afisteTheme.colors.border}`,
          color: afisteTheme.colors.textSecondary,
        }}
      >
        No hay datos de rendimiento disponibles
      </div>
    );
  }

  const navValues = filteredRecords
    .map((r) => {
      const nav = typeof r.nav_per_token === 'number' ? r.nav_per_token : parseFloat(r.nav_per_token);
      return isNaN(nav) ? 0 : nav;
    })
    .filter((v) => !isNaN(v) && isFinite(v));

  if (navValues.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: afisteTheme.colors.surface,
          borderRadius: afisteTheme.borderRadius.lg,
          border: `1px solid ${afisteTheme.colors.border}`,
          color: afisteTheme.colors.textSecondary,
        }}
      >
        No hay datos de rendimiento válidos disponibles
      </div>
    );
  }

  const minNav = Math.min(...navValues);
  const maxNav = Math.max(...navValues);
  const range = maxNav - minNav || 1;
  const padding = 40;
  const chartHeight = height - padding * 2;
  const chartWidth = 800;
  const pointWidth = filteredRecords.length > 1 ? chartWidth / (filteredRecords.length - 1) : 0;

  const points = filteredRecords.map((record, index) => {
    const nav = typeof record.nav_per_token === 'number' ? record.nav_per_token : parseFloat(record.nav_per_token);
    const validNav = isNaN(nav) || !isFinite(nav) ? minNav : nav;
    const x = index * pointWidth;
    const y = padding + chartHeight - ((validNav - minNav) / range) * chartHeight;
    return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? padding + chartHeight : y, record };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      style={{
        background: afisteTheme.colors.surface,
        borderRadius: afisteTheme.borderRadius.lg,
        padding: afisteTheme.spacing.lg,
        border: `1px solid ${afisteTheme.colors.border}`,
      }}
    >
      <div style={{ marginBottom: afisteTheme.spacing.md }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: afisteTheme.colors.text }}>
          Rendimiento NAV
        </h3>
        <p style={{ margin: `${afisteTheme.spacing.xs} 0 0 0`, fontSize: '0.875rem', color: afisteTheme.colors.textSecondary }}>
          Valor Neto de Activos por token a lo largo del tiempo
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg width={chartWidth} height={height} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="navGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={afisteTheme.colors.primary} stopOpacity="0.3" />
              <stop offset="100%" stopColor={afisteTheme.colors.primary} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding + ratio * chartHeight;
            const value = minNav + (1 - ratio) * range;
            return (
              <g key={ratio}>
                <line
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke={afisteTheme.colors.border}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={0}
                  y={y + 4}
                  fontSize="12"
                  fill={afisteTheme.colors.textSecondary}
                  textAnchor="start"
                >
                  {formatCurrency(value)}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          <path
            d={`${pathData} L ${chartWidth} ${chartHeight + padding} L 0 ${chartHeight + padding} Z`}
            fill="url(#navGradient)"
          />

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke={afisteTheme.colors.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((point, index) => {
            if (index % Math.ceil(points.length / 10) !== 0 && index !== points.length - 1) return null;
            return (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={afisteTheme.colors.primary}
                  stroke={afisteTheme.colors.surface}
                  strokeWidth="2"
                />
                <text
                  x={point.x}
                  y={chartHeight + padding + 20}
                  fontSize="10"
                  fill={afisteTheme.colors.textSecondary}
                  textAnchor="middle"
                >
                  {formatDate(point.record.record_date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: afisteTheme.spacing.md,
          marginTop: afisteTheme.spacing.lg,
          paddingTop: afisteTheme.spacing.lg,
          borderTop: `1px solid ${afisteTheme.colors.border}`,
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textSecondary, marginBottom: afisteTheme.spacing.xs }}>
            NAV Actual
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: afisteTheme.colors.text }}>
            {formatCurrency(filteredRecords[filteredRecords.length - 1]?.nav_per_token || 0)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textSecondary, marginBottom: afisteTheme.spacing.xs }}>
            NAV Mínimo
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: afisteTheme.colors.text }}>
            {formatCurrency(minNav)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textSecondary, marginBottom: afisteTheme.spacing.xs }}>
            NAV Máximo
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: afisteTheme.colors.text }}>
            {formatCurrency(maxNav)}
          </div>
        </div>
        {filteredRecords.length > 1 && (
          <div>
            <div style={{ fontSize: '0.75rem', color: afisteTheme.colors.textSecondary, marginBottom: afisteTheme.spacing.xs }}>
              Retorno Total
            </div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color:
                  filteredRecords[filteredRecords.length - 1].nav_per_token >= filteredRecords[0].nav_per_token
                    ? afisteTheme.colors.success
                    : afisteTheme.colors.error,
              }}
            >
              {(
                ((filteredRecords[filteredRecords.length - 1].nav_per_token - filteredRecords[0].nav_per_token) /
                  filteredRecords[0].nav_per_token) *
                100
              ).toFixed(2)}
              %
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

