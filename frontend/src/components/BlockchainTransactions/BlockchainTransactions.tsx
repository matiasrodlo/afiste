import React from 'react';
import { getBlockExplorerUrl, formatAddress } from '../../services/blockchain/web3';
import { afisteTheme } from '../../styles/afiste-theme';

export interface BlockchainTransaction {
  id: string;
  txHash: string;
  contractAddress: string;
  functionName: string;
  fromAddress: string;
  toAddress?: string;
  value: string;
  gasLimit?: string;
  gasPrice?: string;
  gasUsed?: string;
  status: string;
  blockNumber?: number;
  blockHash?: string;
  confirmations: number;
  error?: string;
  metadata?: Record<string, any>;
  events?: Array<{
    eventName: string;
    eventData: any;
    blockNumber: number;
  }>;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
}

interface BlockchainTransactionsProps {
  transactions: BlockchainTransaction[];
  loading?: boolean;
  title?: string;
  showContractAddress?: boolean;
}

export const BlockchainTransactions: React.FC<BlockchainTransactionsProps> = ({
  transactions,
  loading = false,
  title = 'Transacciones Blockchain',
  showContractAddress = true,
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return afisteTheme.colors.success;
      case 'pending':
      case 'sent':
        return afisteTheme.colors.warning;
      case 'failed':
        return afisteTheme.colors.error;
      default:
        return afisteTheme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '';
      case 'pending':
      case 'sent':
        return '';
      case 'failed':
        return '';
      default:
        return '';
    }
  };

  const formatValue = (value: string) => {
    try {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      if (num === 0) return '0';
      if (num < 0.0001) return num.toExponential(2);
      return num.toLocaleString('en-US', { maximumFractionDigits: 6 });
    } catch {
      return value;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div
        style={{
          background: afisteTheme.colors.surface,
          borderRadius: afisteTheme.borderRadius.lg,
          padding: afisteTheme.spacing.xl,
          border: `1px solid ${afisteTheme.colors.border}`,
          textAlign: 'center',
          color: afisteTheme.colors.textSecondary,
        }}
      >
        Cargando transacciones...
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div
        style={{
          background: afisteTheme.colors.surface,
          borderRadius: afisteTheme.borderRadius.lg,
          padding: afisteTheme.spacing.xl,
          border: `1px solid ${afisteTheme.colors.border}`,
          textAlign: 'center',
          color: afisteTheme.colors.textSecondary,
        }}
      >
        No se encontraron transacciones blockchain
      </div>
    );
  }

  return (
    <div
      style={{
        background: afisteTheme.colors.surface,
        borderRadius: afisteTheme.borderRadius.lg,
        padding: afisteTheme.spacing.xl,
        border: `1px solid ${afisteTheme.colors.border}`,
      }}
    >
      <h2
        style={{
          margin: `0 0 ${afisteTheme.spacing.lg} 0`,
          fontSize: '1.5rem',
          fontWeight: 600,
          color: afisteTheme.colors.text,
        }}
      >
        {title}
      </h2>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
          }}
        >
          <thead>
            <tr style={{ borderBottom: `2px solid ${afisteTheme.colors.border}` }}>
              <th
                style={{
                  padding: afisteTheme.spacing.md,
                  textAlign: 'left',
                  fontWeight: 600,
                  color: afisteTheme.colors.text,
                }}
              >
                Hash de Transacción
              </th>
              {showContractAddress && (
                <th
                  style={{
                    padding: afisteTheme.spacing.md,
                    textAlign: 'left',
                    fontWeight: 600,
                    color: afisteTheme.colors.text,
                  }}
                >
                  Contrato
                </th>
              )}
              <th
                style={{
                  padding: afisteTheme.spacing.md,
                  textAlign: 'left',
                  fontWeight: 600,
                  color: afisteTheme.colors.text,
                }}
              >
                Función
              </th>
              <th
                style={{
                  padding: afisteTheme.spacing.md,
                  textAlign: 'left',
                  fontWeight: 600,
                  color: afisteTheme.colors.text,
                }}
              >
                De
              </th>
              <th
                style={{
                  padding: afisteTheme.spacing.md,
                  textAlign: 'right',
                  fontWeight: 600,
                  color: afisteTheme.colors.text,
                }}
              >
                Valor
              </th>
              <th
                style={{
                  padding: afisteTheme.spacing.md,
                  textAlign: 'right',
                  fontWeight: 600,
                  color: afisteTheme.colors.text,
                }}
              >
                Gas Usado
              </th>
              <th
                style={{
                  padding: afisteTheme.spacing.md,
                  textAlign: 'center',
                  fontWeight: 600,
                  color: afisteTheme.colors.text,
                }}
              >
                Estado
              </th>
              <th
                style={{
                  padding: afisteTheme.spacing.md,
                  textAlign: 'left',
                  fontWeight: 600,
                  color: afisteTheme.colors.text,
                }}
              >
                Fecha
              </th>
              <th
                style={{
                  padding: afisteTheme.spacing.md,
                  textAlign: 'center',
                  fontWeight: 600,
                  color: afisteTheme.colors.text,
                }}
              >
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
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
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: afisteTheme.colors.primary,
                    }}
                  >
                    {formatAddress(tx.txHash)}
                  </div>
                </td>
                {showContractAddress && (
                  <td style={{ padding: afisteTheme.spacing.md }}>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: afisteTheme.colors.textSecondary,
                      }}
                    >
                      {formatAddress(tx.contractAddress)}
                    </div>
                  </td>
                )}
                <td style={{ padding: afisteTheme.spacing.md, color: afisteTheme.colors.textSecondary }}>
                  {tx.functionName || 'N/A'}
                </td>
                <td style={{ padding: afisteTheme.spacing.md }}>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: afisteTheme.colors.textSecondary,
                    }}
                  >
                    {formatAddress(tx.fromAddress)}
                  </div>
                </td>
                <td style={{ padding: afisteTheme.spacing.md, textAlign: 'right', color: afisteTheme.colors.text }}>
                  {formatValue(tx.value)} ETH
                </td>
                <td style={{ padding: afisteTheme.spacing.md, textAlign: 'right', color: afisteTheme.colors.textSecondary }}>
                  {tx.gasUsed ? formatValue(tx.gasUsed) : 'N/A'}
                </td>
                <td style={{ padding: afisteTheme.spacing.md, textAlign: 'center' }}>
                  <span
                    style={{
                      padding: `${afisteTheme.spacing.xs} ${afisteTheme.spacing.sm}`,
                      borderRadius: afisteTheme.borderRadius.sm,
                      backgroundColor: getStatusColor(tx.status) + '20',
                      color: getStatusColor(tx.status),
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    {getStatusIcon(tx.status)} {tx.status}
                  </span>
                </td>
                <td style={{ padding: afisteTheme.spacing.md, color: afisteTheme.colors.textSecondary, fontSize: '0.75rem' }}>
                  {formatDate(tx.createdAt)}
                </td>
                <td style={{ padding: afisteTheme.spacing.md, textAlign: 'center' }}>
                  <a
                    href={getBlockExplorerUrl(tx.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: afisteTheme.colors.primary,
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    Ver
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

