import React, { useState, useEffect } from 'react';
import { getBlockExplorerUrl, formatAddress } from '../../services/blockchain/web3';
import { afisteTheme } from '../../styles/afiste-theme';

interface Transaction {
  id: string;
  txHash: string;
  toAddress: string;
  amount: string;
  currency: string;
  type: string;
  status: string;
  createdAt: string;
  confirmedAt?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  loading = false,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'failed'>('all');

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return afisteTheme.colors.success;
      case 'pending':
      case 'broadcast':
        return afisteTheme.colors.warning;
      case 'failed':
        return afisteTheme.colors.error;
      default:
        return afisteTheme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '';
      case 'pending':
      case 'broadcast':
        return '';
      case 'failed':
        return '';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading transactions...</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>No transactions found</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Transaction History</h3>
        {onRefresh && (
          <button style={styles.refreshButton} onClick={onRefresh}>
            Refresh
          </button>
        )}
      </div>

      <div style={styles.filters}>
        {(['all', 'pending', 'confirmed', 'failed'] as const).map((f) => (
          <button
            key={f}
            style={{
              ...styles.filterButton,
              ...(filter === f ? styles.filterButtonActive : {}),
            }}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <div style={styles.tableCell}>Type</div>
          <div style={styles.tableCell}>To</div>
          <div style={styles.tableCell}>Amount</div>
          <div style={styles.tableCell}>Status</div>
          <div style={styles.tableCell}>Date</div>
          <div style={styles.tableCell}>Action</div>
        </div>

        {filteredTransactions.map((tx) => (
          <div key={tx.id} style={styles.tableRow}>
            <div style={styles.tableCell}>
              <span style={styles.typeBadge}>{tx.type}</span>
            </div>
            <div style={styles.tableCell}>
              <span style={styles.address}>{formatAddress(tx.toAddress)}</span>
            </div>
            <div style={styles.tableCell}>
              {parseFloat(tx.amount).toFixed(4)} {tx.currency}
            </div>
            <div style={styles.tableCell}>
              <span
                style={{
                  ...styles.statusBadge,
                  color: getStatusColor(tx.status),
                }}
              >
                {getStatusIcon(tx.status)} {tx.status}
              </span>
            </div>
            <div style={styles.tableCell}>
              {new Date(tx.createdAt).toLocaleDateString()}
            </div>
            <div style={styles.tableCell}>
              {tx.txHash && (
                <a
                  href={getBlockExplorerUrl(tx.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.explorerLink}
                >
                  View
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: afisteTheme.borderRadius.md,
    padding: afisteTheme.spacing.lg,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: afisteTheme.spacing.md,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: afisteTheme.colors.textDark,
  },
  refreshButton: {
    padding: `${afisteTheme.spacing.xs} ${afisteTheme.spacing.sm}`,
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: afisteTheme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  filters: {
    display: 'flex',
    gap: afisteTheme.spacing.xs,
    marginBottom: afisteTheme.spacing.md,
  },
  filterButton: {
    padding: `${afisteTheme.spacing.xs} ${afisteTheme.spacing.sm}`,
    backgroundColor: afisteTheme.colors.background,
    color: afisteTheme.colors.textSecondary,
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: afisteTheme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: 14,
  },
  filterButtonActive: {
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    borderColor: afisteTheme.colors.primary,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '100px 120px 120px 100px 100px 80px',
    gap: afisteTheme.spacing.sm,
    padding: afisteTheme.spacing.sm,
    backgroundColor: afisteTheme.colors.background,
    borderRadius: afisteTheme.borderRadius.sm,
    marginBottom: afisteTheme.spacing.xs,
    fontWeight: 600,
    fontSize: 12,
    color: afisteTheme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '100px 120px 120px 100px 100px 80px',
    gap: afisteTheme.spacing.sm,
    padding: afisteTheme.spacing.sm,
    borderBottom: `1px solid ${afisteTheme.colors.border}`,
    fontSize: 14,
  },
  tableCell: {
    display: 'flex',
    alignItems: 'center',
    color: afisteTheme.colors.textDark,
  },
  typeBadge: {
    padding: `${afisteTheme.spacing.xs} ${afisteTheme.spacing.sm}`,
    backgroundColor: afisteTheme.colors.background,
    borderRadius: afisteTheme.borderRadius.sm,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  address: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 500,
  },
  explorerLink: {
    color: afisteTheme.colors.primary,
    textDecoration: 'none',
    fontSize: 12,
  },
  loading: {
    padding: afisteTheme.spacing.lg,
    textAlign: 'center',
    color: afisteTheme.colors.textSecondary,
  },
  empty: {
    padding: afisteTheme.spacing.lg,
    textAlign: 'center',
    color: afisteTheme.colors.textSecondary,
  },
};

