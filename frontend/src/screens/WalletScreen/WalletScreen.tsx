import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { balancesAPI } from '../../api/balances';
import { authAPI } from '../../api/auth';
import { blockchainAPI } from '../../api/blockchain';
import { BlockchainTransactions, BlockchainTransaction } from '../../components/BlockchainTransactions/BlockchainTransactions';
import { afisteTheme } from '../../styles/afiste-theme';

interface Balance {
  currency_id: string;
  balance: number;
  locked: number;
  available: number;
}

const WalletScreen: React.FC = () => {
  const navigate = useNavigate();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockchainTransactions, setBlockchainTransactions] = useState<BlockchainTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }

    loadBalances();
  }, [navigate]);

  const loadBalances = async () => {
    try {
      setLoading(true);
      const data = await balancesAPI.getBalances();
      setBalances(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading balances');
    } finally {
      setLoading(false);
    }
  };

  const loadBlockchainTransactions = async () => {
    try {
      setLoadingTransactions(true);
      // Get user's wallet address if available, or load all recent transactions
      const data = await blockchainAPI.getTransactionHistory({ limit: 20 });
      setBlockchainTransactions(data.transactions);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load blockchain transactions:', err);
      }
      // Don't show error to user, just log it
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (authAPI.isAuthenticated()) {
      loadBlockchainTransactions();
    }
  }, []);

  const formatCurrency = (amount: number, currencyId: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyId.toUpperCase() === 'USDT' || currencyId.toUpperCase() === 'USDC' ? 'USD' : 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Cargando balances...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <button style={styles.retryButton} onClick={loadBalances}>
          Reintentar
        </button>
      </div>
    );
  }

  const vcBalances = balances.filter((b) => b.currency_id.startsWith('vc-'));
  const stablecoinBalances = balances.filter((b) => 
    ['usdt', 'usdc'].includes(b.currency_id.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Mi Wallet</h1>
          <p style={styles.subtitle}>Gestiona tus stablecoins y tokens VC</p>
        </div>
        <button
          style={styles.refreshButton}
          onClick={loadBalances}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.opacity = '0.95';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.opacity = '1';
          }}
        >
          Actualizar
        </button>
      </div>

      {/* Stablecoins Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Stablecoins</h2>
        {stablecoinBalances.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No tienes stablecoins en tu wallet</p>
            <button
              style={styles.primaryButton}
              onClick={() => navigate('/payments')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.opacity = '0.95';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.opacity = '1';
              }}
            >
              Depositar
            </button>
          </div>
        ) : (
          <div style={styles.balancesGrid}>
            {stablecoinBalances.map((balance) => (
              <div key={balance.currency_id} style={styles.balanceCard}>
                <div style={styles.balanceHeader}>
                  <h3 style={styles.currencyName}>{balance.currency_id.toUpperCase()}</h3>
                </div>
                <div style={styles.balanceDetails}>
                  <div style={styles.balanceRow}>
                    <span style={styles.balanceLabel}>Disponible:</span>
                    <span style={styles.balanceValue}>
                      {formatCurrency(balance.available, balance.currency_id)}
                    </span>
                  </div>
                  <div style={styles.balanceRow}>
                    <span style={styles.balanceLabel}>Bloqueado:</span>
                    <span style={styles.balanceValue}>
                      {formatCurrency(balance.locked, balance.currency_id)}
                    </span>
                  </div>
                  <div style={styles.balanceRow}>
                    <span style={styles.balanceLabel}>Total:</span>
                    <span style={styles.balanceValue}>
                      {formatCurrency(balance.balance, balance.currency_id)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* VC Tokens Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Tokens VC</h2>
        {vcBalances.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No tienes tokens VC en tu wallet</p>
            <button
              style={styles.primaryButton}
              onClick={() => navigate('/marketplace')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.opacity = '0.95';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.opacity = '1';
              }}
            >
              Explorar Fondos
            </button>
          </div>
        ) : (
          <div style={styles.balancesGrid}>
            {vcBalances.map((balance) => (
              <div key={balance.currency_id} style={styles.balanceCard}>
                <div style={styles.balanceHeader}>
                  <h3 style={styles.currencyName}>{balance.currency_id}</h3>
                </div>
                <div style={styles.balanceDetails}>
                  <div style={styles.balanceRow}>
                    <span style={styles.balanceLabel}>Tokens:</span>
                    <span style={styles.balanceValue}>
                      {balance.balance.toFixed(4)}
                    </span>
                  </div>
                  <div style={styles.balanceRow}>
                    <span style={styles.balanceLabel}>Disponible:</span>
                    <span style={styles.balanceValue}>
                      {balance.available.toFixed(4)}
                    </span>
                  </div>
                  <div style={styles.balanceRow}>
                    <span style={styles.balanceLabel}>Bloqueado:</span>
                    <span style={styles.balanceValue}>
                      {balance.locked.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div style={styles.balanceActions}>
                  <button
                    style={styles.actionButton}
                    onClick={() => navigate(`/funds/${balance.currency_id.replace('vc-', '')}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.opacity = '0.95';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    Ver Detalles
                  </button>
                  <button
                    style={styles.secondaryButton}
                    onClick={() => navigate(`/trading/${balance.currency_id}-usdt`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = afisteTheme.colors.text;
                      e.currentTarget.style.color = afisteTheme.colors.text;
                      e.currentTarget.style.backgroundColor = afisteTheme.colors.surfaceLight;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                      e.currentTarget.style.color = afisteTheme.colors.primary;
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Vender
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Blockchain Transactions Section */}
      <section style={styles.section}>
        <BlockchainTransactions
          transactions={blockchainTransactions}
          loading={loadingTransactions}
          title="Transacciones Blockchain"
          showContractAddress={false}
        />
      </section>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: afisteTheme.colors.background,
    padding: `${afisteTheme.spacing.xl} ${afisteTheme.spacing.md}`,
  },
  header: {
    maxWidth: '1400px',
    margin: '0 auto 56px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 'clamp(36px, 5vw, 52px)',
    fontWeight: '400',
    color: afisteTheme.colors.text,
    margin: `0 0 ${afisteTheme.spacing.sm} 0`,
    letterSpacing: '-0.02em',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '16px',
    fontWeight: '300',
    color: afisteTheme.colors.textSecondary,
    margin: 0,
    letterSpacing: '0.01em',
  },
  refreshButton: {
    padding: '14px 28px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
  },
  section: {
    maxWidth: '1400px',
    margin: '0 auto 56px',
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: '400',
    marginBottom: '32px',
    color: afisteTheme.colors.text,
    letterSpacing: '-0.01em',
  },
  balancesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '28px',
  },
  balanceCard: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '10px',
    padding: '32px',
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  balanceHeader: {
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: `1px solid ${afisteTheme.colors.borderLight}`,
  },
  currencyName: {
    fontSize: '1.25rem',
    fontWeight: '500',
    color: afisteTheme.colors.text,
    letterSpacing: '-0.01em',
  },
  balanceDetails: {
    marginBottom: '24px',
  },
  balanceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  balanceLabel: {
    fontSize: '0.75rem',
    color: afisteTheme.colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  balanceValue: {
    fontSize: '15px',
    fontWeight: '500',
    color: afisteTheme.colors.text,
  },
  balanceActions: {
    display: 'flex',
    gap: '12px',
    paddingTop: '20px',
    borderTop: `1px solid ${afisteTheme.colors.borderLight}`,
  },
  actionButton: {
    flex: 1,
    padding: '14px 20px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
  },
  secondaryButton: {
    flex: 1,
    padding: '14px 20px',
    backgroundColor: 'transparent',
    color: afisteTheme.colors.primary,
    border: `1px solid ${afisteTheme.colors.primary}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '64px 40px',
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '10px',
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  primaryButton: {
    padding: '16px 32px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    marginTop: '24px',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '15px',
    color: afisteTheme.colors.textSecondary,
    fontWeight: '300',
  },
  error: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '15px',
    color: '#dc2626',
    fontWeight: '400',
  },
  retryButton: {
    padding: '14px 28px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    margin: '20px auto',
    display: 'block',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
  },
  walletConnect: {
    padding: afisteTheme.spacing.lg,
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: afisteTheme.borderRadius.md,
    border: `1px solid ${afisteTheme.colors.border}`,
    textAlign: 'center',
  },
  walletConnectText: {
    color: afisteTheme.colors.textSecondary,
    marginBottom: afisteTheme.spacing.md,
  },
  connectButton: {
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    padding: `${afisteTheme.spacing.sm} ${afisteTheme.spacing.lg}`,
    borderRadius: afisteTheme.borderRadius.sm,
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
  },
  walletInfo: {
    padding: afisteTheme.spacing.lg,
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: afisteTheme.borderRadius.md,
    border: `1px solid ${afisteTheme.colors.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: afisteTheme.spacing.sm,
  },
  walletDetail: {
    display: 'flex',
    gap: afisteTheme.spacing.sm,
  },
  walletLabel: {
    color: afisteTheme.colors.textSecondary,
    fontWeight: 500,
  },
  walletValue: {
    color: afisteTheme.colors.textDark,
    fontFamily: 'monospace',
  },
};

export default WalletScreen;

