import React from 'react';
import { TransactionStatus as TxStatus } from '../../hooks/useTransaction';
import { getBlockExplorerUrl } from '../../services/blockchain/web3';
import { afisteTheme } from '../../styles/afiste-theme';

interface TransactionStatusProps {
  status: TxStatus;
  txHash: string | null;
  error: string | null;
  onClose?: () => void;
}

export const TransactionStatusComponent: React.FC<TransactionStatusProps> = ({
  status,
  txHash,
  error,
  onClose,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case TxStatus.PENDING:
        return afisteTheme.colors.warning;
      case TxStatus.CONFIRMED:
        return afisteTheme.colors.success;
      case TxStatus.FAILED:
        return afisteTheme.colors.error;
      default:
        return afisteTheme.colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case TxStatus.PREPARING:
        return 'Preparing transaction...';
      case TxStatus.SIGNING:
        return 'Please sign the transaction in your wallet';
      case TxStatus.PENDING:
        return 'Transaction pending...';
      case TxStatus.CONFIRMED:
        return 'Transaction confirmed!';
      case TxStatus.FAILED:
        return 'Transaction failed';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case TxStatus.PENDING:
        return '';
      case TxStatus.CONFIRMED:
        return '';
      case TxStatus.FAILED:
        return '';
      default:
        return '';
    }
  };

  if (status === TxStatus.IDLE) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <span style={styles.icon}>{getStatusIcon()}</span>
          <span style={{ ...styles.status, color: getStatusColor() }}>
            {getStatusText()}
          </span>
          {onClose && status !== TxStatus.PENDING && (
            <button style={styles.closeButton} onClick={onClose}>
              ×
            </button>
          )}
        </div>

        {error && (
          <div style={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {txHash && (
          <div style={styles.txHash}>
            <div style={styles.txHashLabel}>Transaction Hash:</div>
            <div style={styles.txHashValue}>{txHash}</div>
            <a
              href={getBlockExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.explorerLink}
            >
              Ver en Block Explorer
            </a>
          </div>
        )}

        {status === TxStatus.PENDING && (
          <div style={styles.pending}>
            <div style={styles.spinner}></div>
            <div>Waiting for confirmation...</div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: 20,
    right: 20,
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: afisteTheme.borderRadius.md,
    boxShadow: afisteTheme.shadows.lg,
    padding: afisteTheme.spacing.lg,
    minWidth: 300,
    maxWidth: 400,
    zIndex: 1000,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: afisteTheme.spacing.md,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: afisteTheme.spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  status: {
    flex: 1,
    fontWeight: 600,
    fontSize: 16,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 24,
    cursor: 'pointer',
    color: afisteTheme.colors.textSecondary,
    padding: 0,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    padding: afisteTheme.spacing.sm,
    backgroundColor: `${afisteTheme.colors.error}15`,
    borderRadius: afisteTheme.borderRadius.sm,
    color: afisteTheme.colors.error,
    fontSize: 14,
  },
  txHash: {
    padding: afisteTheme.spacing.sm,
    backgroundColor: afisteTheme.colors.background,
    borderRadius: afisteTheme.borderRadius.sm,
    fontSize: 12,
  },
  txHashLabel: {
    color: afisteTheme.colors.textSecondary,
    marginBottom: afisteTheme.spacing.xs,
  },
  txHashValue: {
    fontFamily: 'monospace',
    color: afisteTheme.colors.text,
    wordBreak: 'break-all',
    marginBottom: afisteTheme.spacing.xs,
  },
  explorerLink: {
    color: afisteTheme.colors.primary,
    textDecoration: 'none',
    fontSize: 12,
  },
  pending: {
    display: 'flex',
    alignItems: 'center',
    gap: afisteTheme.spacing.sm,
    color: afisteTheme.colors.textSecondary,
    fontSize: 14,
  },
  spinner: {
    width: 16,
    height: 16,
    border: `2px solid ${afisteTheme.colors.border}`,
    borderTop: `2px solid ${afisteTheme.colors.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Add spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

