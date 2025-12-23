import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { paymentsAPI, BankAccount } from '../../api/payments';
import { balancesAPI } from '../../api/balances';
import { authAPI } from '../../api/auth';
import { afisteTheme } from '../../styles/afiste-theme';

interface Payment {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
  processedAt?: string;
}

// Use sandbox mode unless explicitly disabled or in production
const SANDBOX_MODE = process.env.REACT_APP_SANDBOX_MODE === 'true' || process.env.NODE_ENV !== 'production';

const SANDBOX_API_DELAY_MS = 1000;
const BACKEND_PROCESSING_DELAY_MS = 500;

// Fake bank account for testing
const createMockBankAccount = (): BankAccount => ({
  id: 'sandbox-account-1',
  accountName: 'Sandbox Checking Account',
  bankName: 'Sandbox Bank',
  accountType: 'checking',
  accountNumber: '1234',
  verified: true,
  isDefault: true,
  createdAt: new Date().toISOString(),
});

const PaymentScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history' | 'accounts'>('deposit');
  const [balance, setBalance] = useState<number>(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deposit form state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositBankAccountId, setDepositBankAccountId] = useState('');
  const [depositProcessing, setDepositProcessing] = useState(false);

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBankAccountId, setWithdrawBankAccountId] = useState('');
  const [withdrawProcessing, setWithdrawProcessing] = useState(false);

  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }

    loadData();
  }, [navigate, location.pathname]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balancesData, accountsData, paymentsData] = await Promise.all([
        balancesAPI.getBalances(),
        paymentsAPI.getBankAccounts().catch((err: any) => {
          // Return empty array if 404 (endpoint not implemented yet)
          if (err.response?.status === 404) {
            console.warn('Bank accounts endpoint not available, returning empty array');
            return [];
          }
          throw err;
        }),
        paymentsAPI.getPaymentHistory(20, 0).catch((err: any) => {
          // Return empty array if 404
          if (err.response?.status === 404) {
            console.warn('Payment history endpoint not available, returning empty array');
            return [];
          }
          throw err;
        }),
      ]);

      // Get USDT balance - check both currency.code and currency_id
      const usdtBalance = balancesData.find((b: any) => {
        const currencyCode = b.currency?.code?.toLowerCase() || b.currency_id?.toLowerCase();
        return currencyCode === 'usdt';
      });
      
      const newBalance = usdtBalance ? Number(usdtBalance.available) : 0;
      setBalance(newBalance);

      // In sandbox mode, use mock bank account if no real accounts
      const finalAccounts = Array.isArray(accountsData) && accountsData.length > 0 
        ? accountsData 
        : (SANDBOX_MODE ? [createMockBankAccount()] : []);
      
      setBankAccounts(finalAccounts);
      
      // Map payment data to match frontend Payment interface
      const mappedPayments: Payment[] = Array.isArray(paymentsData) 
        ? paymentsData.map((p: any) => ({
            id: p.id,
            type: p.type,
            amount: typeof p.amount === 'string' ? parseFloat(p.amount) : (typeof p.amount === 'object' && p.amount?.toNumber ? p.amount.toNumber() : Number(p.amount)),
            currency: p.currency || 'USD',
            status: p.status,
            paymentMethod: p.paymentMethod || 'sandbox',
            createdAt: p.createdAt,
            processedAt: p.processedAt,
          }))
        : [];
      
      // Merge with existing payments to avoid losing locally added ones
      setPayments(prev => {
        const existingIds = new Set(mappedPayments.map(p => p.id));
        const newLocalPayments = prev.filter(p => !existingIds.has(p.id));
        return [...mappedPayments, ...newLocalPayments].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || !depositBankAccountId) {
      setError('Please fill in all fields');
      return;
    }


    try {
      setDepositProcessing(true);
      setError(null);
      
      let depositResult: any = null;
      
      if (SANDBOX_MODE) {
        // Sandbox mode: Simulate deposit instantly
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, SANDBOX_API_DELAY_MS));
        
        // Call sandbox deposit endpoint
        try {
          depositResult = await paymentsAPI.createDeposit({
            amount: parseFloat(depositAmount),
            bankAccountId: depositBankAccountId,
          });
          
          // Add payment to local state immediately if API succeeds
          if (depositResult?.payment) {
            const depositAmountNum = parseFloat(depositAmount);
            const newPayment: Payment = {
              id: depositResult.payment.id,
              type: 'deposit',
              amount: depositAmountNum,
              currency: depositResult.payment.currency || 'USD',
              status: depositResult.payment.status || 'completed',
              paymentMethod: depositResult.payment.paymentMethod || 'sandbox',
              createdAt: depositResult.payment.createdAt || new Date().toISOString(),
              processedAt: depositResult.payment.processedAt || new Date().toISOString(),
            };
            
            console.log('Adding payment to state:', newPayment);
            setPayments(prev => {
              // Check if payment already exists to avoid duplicates
              if (prev.find(p => p.id === newPayment.id)) {
                return prev;
              }
              return [newPayment, ...prev];
            });
          }
        } catch (apiErr: any) {
          console.error('Deposit API error:', {
            message: apiErr.message,
            status: apiErr.response?.status,
            data: apiErr.response?.data,
            bankAccountId: depositBankAccountId,
          });
          
          // If API fails, show error but don't simulate success
          // The backend should handle sandbox accounts properly now
          throw apiErr;
        }
      } else {
        // Real mode: Use actual API
        depositResult = await paymentsAPI.createDeposit({
          amount: parseFloat(depositAmount),
          bankAccountId: depositBankAccountId,
        });

        // If clientSecret is present, payment gateway will handle redirect
      }

      // Small delay to ensure backend has processed the transaction
      await new Promise(resolve => setTimeout(resolve, BACKEND_PROCESSING_DELAY_MS));
      
      // Reload data to get latest balance and payment history from server
      await loadData();
      
      setDepositAmount('');
      setDepositBankAccountId('');
      
      // Show success message
      setError(null);
      // Deposit completed successfully - user can now invest
    } catch (err: any) {
      setError(err.message || 'Error creating deposit');
    } finally {
      setDepositProcessing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !withdrawBankAccountId) {
      setError('Please fill in all fields');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount > balance) {
      setError('Insufficient balance');
      return;
    }


    try {
      setWithdrawProcessing(true);
      setError(null);
      
      let withdrawalResult: any = null;
      
      if (SANDBOX_MODE) {
        // Sandbox mode: Simulate withdrawal instantly
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, SANDBOX_API_DELAY_MS));
        
        // Call sandbox withdrawal endpoint
        try {
          withdrawalResult = await paymentsAPI.createWithdrawal({
            amount,
            bankAccountId: withdrawBankAccountId,
          });
          
          // Add payment to local state immediately if API succeeds
          if (withdrawalResult?.payment) {
            const newPayment: Payment = {
              id: withdrawalResult.payment.id,
              type: 'withdrawal',
              amount,
              currency: withdrawalResult.payment.currency || 'USD',
              status: withdrawalResult.payment.status || 'completed',
              paymentMethod: withdrawalResult.payment.paymentMethod || 'sandbox',
              createdAt: withdrawalResult.payment.createdAt || new Date().toISOString(),
              processedAt: withdrawalResult.payment.processedAt || new Date().toISOString(),
            };
            setPayments(prev => [newPayment, ...prev]);
          }
        } catch (apiErr: any) {
          // If API fails, simulate success in sandbox
          if (SANDBOX_MODE) {
            console.log('Sandbox mode: Simulating successful withdrawal');
            // Add to payment history
            const newPayment: Payment = {
              id: `sandbox-${Date.now()}`,
              type: 'withdrawal',
              amount,
              currency: 'USD',
              status: 'completed',
              paymentMethod: 'sandbox',
              createdAt: new Date().toISOString(),
              processedAt: new Date().toISOString(),
            };
            setPayments(prev => [newPayment, ...prev]);
          } else {
            throw apiErr;
          }
        }
      } else {
        // Real mode: Use actual API
        withdrawalResult = await paymentsAPI.createWithdrawal({
          amount,
          bankAccountId: withdrawBankAccountId,
        });
      }

      // Small delay to ensure backend has processed the transaction
      await new Promise(resolve => setTimeout(resolve, BACKEND_PROCESSING_DELAY_MS));
      
      // Reload data to get latest balance and payment history from server
      await loadData();
      
      setWithdrawAmount('');
      setWithdrawBankAccountId('');
      
      // Withdrawal completed successfully
    } catch (err: any) {
      setError(err.message || 'Error creating withdrawal');
    } finally {
      setWithdrawProcessing(false);
    }
  };

  const handleLinkBankAccount = async () => {
    if (SANDBOX_MODE) {
      // In sandbox mode, automatically add mock account
      const mockAccount = createMockBankAccount();
      setBankAccounts(prev => {
        if (prev.find(acc => acc.id === mockAccount.id)) {
          setError('Sandbox account already exists');
          return prev;
        }
        return [...prev, mockAccount];
      });
      // Sandbox account added successfully (user will see it in the list)
      return;
    }

    try {
      const { linkToken } = await paymentsAPI.createLinkToken();
      
      // In a real implementation, you would use Plaid Link
      // For now, show error message that this feature is not yet implemented
      setError('Bank account linking is not yet implemented. Please use sandbox mode for testing.');
      
      // After linking, exchange the public token
      // const { publicToken } = await plaidLink.open();
      // await paymentsAPI.exchangePublicToken(publicToken);
      // await loadData();
    } catch (err: any) {
      setError(err.message || 'Error linking bank account');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Pagos</h1>
          <p style={styles.subtitle}>Gestiona tus depósitos y retiros</p>
        </div>
        <div style={styles.balance}>
          <span style={styles.balanceLabel}>Saldo Disponible</span>
          <span style={styles.balanceAmount}>${balance.toFixed(2)}</span>
        </div>
      </div>

      {isWelcome && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'rgba(0, 82, 255, 0.1)',
          border: `1px solid ${afisteTheme.colors.primary}`,
          borderRadius: '8px',
          marginBottom: '24px',
          color: afisteTheme.colors.text,
        }}>
          <strong>¡Bienvenido a Afiste!</strong> Para comenzar a invertir, primero deposita fondos en tu cuenta. Puedes usar el modo sandbox para probar sin dinero real.
        </div>
      )}

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'deposit' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('deposit')}
        >
          Depositar
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'withdraw' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('withdraw')}
        >
          Retirar
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'history' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('history')}
        >
          Historial
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'accounts' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('accounts')}
        >
          Cuentas Bancarias
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'deposit' && (
          <div style={styles.formContainer}>
            <h2 style={styles.formTitle}>Depositar Fondos</h2>
            <form onSubmit={handleDeposit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Monto (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="10"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  style={styles.input}
                  required
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${afisteTheme.colors.primary}15`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Cuenta Bancaria</label>
                <select
                  value={depositBankAccountId}
                  onChange={(e) => setDepositBankAccountId(e.target.value)}
                  style={styles.select}
                  required
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${afisteTheme.colors.primary}15`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Seleccionar cuenta bancaria</option>
                  {bankAccounts
                    .filter(acc => acc.verified)
                    .map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} - ****{acc.accountNumber} {acc.isDefault ? '(Predeterminada)' : ''}
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={depositProcessing}
                style={{
                  ...styles.submitButton,
                  ...(depositProcessing ? styles.buttonDisabled : {}),
                }}
                onMouseEnter={(e) => {
                  if (!depositProcessing) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.opacity = '0.95';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {depositProcessing ? 'Procesando...' : 'Depositar'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div style={styles.formContainer}>
            <h2 style={styles.formTitle}>Retirar Fondos</h2>
            <form onSubmit={handleWithdraw}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Monto (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="10"
                  max={balance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  style={styles.input}
                  required
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${afisteTheme.colors.primary}15`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <div style={styles.helperText}>
                  Disponible: ${balance.toFixed(2)}
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Cuenta Bancaria</label>
                <select
                  value={withdrawBankAccountId}
                  onChange={(e) => setWithdrawBankAccountId(e.target.value)}
                  style={styles.select}
                  required
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${afisteTheme.colors.primary}15`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Seleccionar cuenta bancaria</option>
                  {bankAccounts
                    .filter(acc => acc.verified)
                    .map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} - ****{acc.accountNumber} {acc.isDefault ? '(Predeterminada)' : ''}
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={withdrawProcessing}
                style={{
                  ...styles.submitButton,
                  ...(withdrawProcessing ? styles.buttonDisabled : {}),
                }}
                onMouseEnter={(e) => {
                  if (!withdrawProcessing) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.opacity = '0.95';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {withdrawProcessing ? 'Procesando...' : 'Retirar'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div style={styles.historyContainer}>
            <h2 style={styles.formTitle}>Historial de Pagos</h2>
            {payments.length === 0 ? (
              <div style={styles.emptyState}>No hay pagos aún</div>
            ) : (
              <div style={styles.paymentsList}>
                {payments.map((payment) => (
                  <div key={payment.id} style={styles.paymentItem}>
                    <div style={styles.paymentInfo}>
                      <div style={styles.paymentType}>
                        {payment.type.toUpperCase()}
                      </div>
                      <div style={styles.paymentAmount}>
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </div>
                    </div>
                    <div style={styles.paymentMeta}>
                      <span style={{
                        ...styles.statusBadge,
                        ...(payment.status === 'completed' ? styles.statusCompleted : {}),
                        ...(payment.status === 'pending' ? styles.statusPending : {}),
                        ...(payment.status === 'failed' ? styles.statusFailed : {}),
                      }}>
                        {payment.status}
                      </span>
                      <div style={styles.paymentDate}>
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'accounts' && (
          <div style={styles.accountsContainer}>
            <div style={styles.accountsHeader}>
              <h2 style={styles.formTitle}>Cuentas Bancarias</h2>
              <button
                onClick={handleLinkBankAccount}
                style={styles.linkButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.opacity = '0.95';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                + Vincular Cuenta Bancaria
              </button>
            </div>
            {bankAccounts.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No hay cuentas bancarias vinculadas</p>
                <button
                  onClick={handleLinkBankAccount}
                  style={styles.primaryButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.opacity = '0.95';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Vincula tu Primera Cuenta Bancaria
                </button>
              </div>
            ) : (
              <div style={styles.accountsList}>
                {bankAccounts.map((account) => (
                  <div key={account.id} style={styles.accountItem}>
                    <div style={styles.accountInfo}>
                      <div style={styles.accountName}>{account.accountName}</div>
                      <div style={styles.accountDetails}>
                        {account.bankName} • {account.accountType} • ****{account.accountNumber}
                      </div>
                    </div>
                    <div style={styles.accountActions}>
                      {account.isDefault && (
                        <span style={styles.defaultBadge}>Predeterminada</span>
                      )}
                      {!account.verified && (
                        <span style={styles.verifyBadge}>Verificación Requerida</span>
                      )}
                      {!account.isDefault && account.verified && (
                        <button
                          onClick={async () => {
                            await paymentsAPI.setDefaultBankAccount(account.id);
                            await loadData();
                          }}
                          style={styles.actionButton}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                            e.currentTarget.style.color = afisteTheme.colors.primary;
                            e.currentTarget.style.backgroundColor = afisteTheme.colors.surfaceLight;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                            e.currentTarget.style.color = afisteTheme.colors.primary;
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          Establecer como Predeterminada
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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
  balance: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: '0.75rem',
    color: afisteTheme.colors.textSecondary,
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 'clamp(28px, 4vw, 36px)',
    fontWeight: '400',
    color: afisteTheme.colors.primary,
    letterSpacing: '-0.02em',
  },
  error: {
    maxWidth: '1400px',
    margin: '0 auto 24px',
    padding: '14px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '400',
    border: `1px solid rgba(239, 68, 68, 0.3)`,
  },
  tabs: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    gap: '8px',
    borderBottom: `1px solid ${afisteTheme.colors.borderLight}`,
  },
  tab: {
    padding: '14px 24px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '15px',
    fontWeight: '400',
    color: afisteTheme.colors.textSecondary,
    cursor: 'pointer',
    marginBottom: '-2px',
    transition: 'all 0.2s ease',
    letterSpacing: '0.3px',
  },
  tabActive: {
    color: afisteTheme.colors.primary,
    borderBottom: `2px solid ${afisteTheme.colors.primary}`,
    fontWeight: '500',
  },
  content: {
    maxWidth: '1400px',
    margin: '40px auto 0',
  },
  formContainer: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '10px',
    padding: '40px',
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  formTitle: {
    fontSize: '1.75rem',
    fontWeight: '400',
    color: afisteTheme.colors.text,
    marginBottom: '32px',
    letterSpacing: '-0.01em',
  },
  formGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: afisteTheme.colors.textSecondary,
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: '6px',
    backgroundColor: afisteTheme.colors.background,
    color: afisteTheme.colors.text,
    fontWeight: '400',
    transition: 'all 0.2s ease',
  },
  select: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: '6px',
    backgroundColor: afisteTheme.colors.background,
    color: afisteTheme.colors.text,
    fontWeight: '400',
    transition: 'all 0.2s ease',
  },
  helperText: {
    fontSize: '0.75rem',
    color: afisteTheme.colors.textSecondary,
    marginTop: '8px',
    fontWeight: '300',
  },
  submitButton: {
    width: '100%',
    padding: '16px 24px',
    fontSize: '15px',
    fontWeight: '500',
    backgroundColor: afisteTheme.colors.primary,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
    marginTop: '8px',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  historyContainer: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '10px',
    padding: '40px',
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  paymentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  paymentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: afisteTheme.colors.background,
    borderRadius: '8px',
    border: `1px solid ${afisteTheme.colors.borderLight}`,
  },
  paymentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  paymentType: {
    fontSize: '16px',
    fontWeight: '600',
    color: afisteTheme.colors.text,
  },
  paymentAmount: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: afisteTheme.colors.primary,
  },
  paymentMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: afisteTheme.colors.surfaceLight,
    color: afisteTheme.colors.textSecondary,
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  statusFailed: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  paymentDate: {
    fontSize: '12px',
    color: afisteTheme.colors.textSecondary,
  },
  accountsContainer: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '10px',
    padding: '40px',
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  accountsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  linkButton: {
    padding: '14px 28px',
    fontSize: '15px',
    fontWeight: '500',
    backgroundColor: afisteTheme.colors.primary,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
  },
  accountsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  accountItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: afisteTheme.colors.background,
    borderRadius: '8px',
    border: `1px solid ${afisteTheme.colors.borderLight}`,
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  accountName: {
    fontSize: '16px',
    fontWeight: '600',
    color: afisteTheme.colors.text,
  },
  accountDetails: {
    fontSize: '14px',
    color: afisteTheme.colors.textSecondary,
  },
  accountActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  defaultBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  verifyBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  actionButton: {
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: 'transparent',
    color: afisteTheme.colors.primary,
    border: `1px solid ${afisteTheme.colors.primary}`,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '64px 20px',
    color: afisteTheme.colors.textSecondary,
    fontSize: '15px',
    fontWeight: '300',
  },
  primaryButton: {
    padding: '16px 32px',
    marginTop: '24px',
    fontSize: '15px',
    fontWeight: '500',
    backgroundColor: afisteTheme.colors.primary,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
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
};

export default PaymentScreen;

