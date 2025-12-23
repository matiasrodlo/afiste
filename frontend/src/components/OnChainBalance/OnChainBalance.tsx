import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { VCTokenService } from '../../services/blockchain/vcToken';
import { formatAddress, getBlockExplorerAddressUrl } from '../../services/blockchain/web3';
import { afisteTheme } from '../../styles/afiste-theme';

interface TokenBalance {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  balance: string;
  balanceRaw: string;
  decimals: number;
}

interface OnChainBalanceProps {
  address?: string;
  tokenAddresses?: string[];
}

export const OnChainBalance: React.FC<OnChainBalanceProps> = ({
  address,
  tokenAddresses = [],
}) => {
  const { address: walletAddress, isConnected } = useWallet();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayAddress = address || walletAddress;

  useEffect(() => {
    if (displayAddress && tokenAddresses.length > 0) {
      loadBalances();
    }
  }, [displayAddress, tokenAddresses]);

  const loadBalances = async () => {
    if (!displayAddress) return;

    setLoading(true);
    setError(null);

    try {
      const balancePromises = tokenAddresses.map(async (tokenAddress) => {
        try {
          const vcTokenService = new VCTokenService(tokenAddress);
          const [balance, name, symbol, decimals] = await Promise.all([
            vcTokenService.getBalance(displayAddress),
            vcTokenService.getName(),
            vcTokenService.getSymbol(),
            vcTokenService.getDecimals(),
          ]);

          return {
            tokenAddress,
            tokenName: name,
            tokenSymbol: symbol,
            balance: (Number(balance) / Math.pow(10, decimals)).toFixed(4),
            balanceRaw: balance.toString(),
            decimals,
          };
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading balance for ${tokenAddress}:`, err);
          }
          return null;
        }
      });

      const results = await Promise.all(balancePromises);
      setBalances(results.filter((b): b is TokenBalance => b !== null));
    } catch (err: any) {
      setError(err.message || 'Failed to load balances');
    } finally {
      setLoading(false);
    }
  };

  if (!displayAddress) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>No wallet connected</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading balances...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>On-Chain Balances</h3>
        <div style={styles.address}>
          <span style={styles.addressLabel}>Address:</span>
          <span style={styles.addressValue}>{formatAddress(displayAddress, 6)}</span>
          <a
            href={getBlockExplorerAddressUrl(displayAddress)}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.explorerLink}
          >
            Ver en Explorer
          </a>
        </div>
      </div>

      {balances.length === 0 ? (
        <div style={styles.empty}>No token balances found</div>
      ) : (
        <div style={styles.balances}>
          {balances.map((token) => (
            <div key={token.tokenAddress} style={styles.balanceCard}>
              <div style={styles.balanceHeader}>
                <div>
                  <div style={styles.tokenName}>{token.tokenName}</div>
                  <div style={styles.tokenSymbol}>{token.tokenSymbol}</div>
                </div>
                <div style={styles.balanceAmount}>
                  {token.balance} {token.tokenSymbol}
                </div>
              </div>
              <div style={styles.tokenAddress}>
                <span style={styles.addressLabel}>Contract:</span>
                <span style={styles.addressValue}>{formatAddress(token.tokenAddress, 6)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
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
    marginBottom: afisteTheme.spacing.md,
  },
  title: {
    margin: 0,
    marginBottom: afisteTheme.spacing.sm,
    fontSize: 20,
    fontWeight: 600,
    color: afisteTheme.colors.textDark,
  },
  address: {
    display: 'flex',
    alignItems: 'center',
    gap: afisteTheme.spacing.sm,
    fontSize: 14,
    color: afisteTheme.colors.textSecondary,
  },
  addressLabel: {
    fontWeight: 500,
  },
  addressValue: {
    fontFamily: 'monospace',
    color: afisteTheme.colors.textDark,
  },
  explorerLink: {
    color: afisteTheme.colors.primary,
    textDecoration: 'none',
    fontSize: 12,
    marginLeft: 'auto',
  },
  balances: {
    display: 'flex',
    flexDirection: 'column',
    gap: afisteTheme.spacing.md,
  },
  balanceCard: {
    padding: afisteTheme.spacing.md,
    backgroundColor: afisteTheme.colors.background,
    borderRadius: afisteTheme.borderRadius.sm,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  balanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: afisteTheme.spacing.sm,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: 600,
    color: afisteTheme.colors.textDark,
    marginBottom: afisteTheme.spacing.xs,
  },
  tokenSymbol: {
    fontSize: 12,
    color: afisteTheme.colors.textSecondary,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: 600,
    color: afisteTheme.colors.textDark,
  },
  tokenAddress: {
    display: 'flex',
    alignItems: 'center',
    gap: afisteTheme.spacing.xs,
    fontSize: 12,
    color: afisteTheme.colors.textSecondary,
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
  error: {
    padding: afisteTheme.spacing.md,
    backgroundColor: `${afisteTheme.colors.error}15`,
    borderRadius: afisteTheme.borderRadius.sm,
    color: afisteTheme.colors.error,
  },
};

