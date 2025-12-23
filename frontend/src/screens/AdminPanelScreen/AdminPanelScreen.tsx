import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminVCFundsAPI } from '../../api/vcFunds';
import { adminAPI, AdminUser } from '../../api/admin';
import { authAPI } from '../../api/auth';
import { blockchainAPI } from '../../api/blockchain';
import { BlockchainTransactions, BlockchainTransaction } from '../../components/BlockchainTransactions/BlockchainTransactions';
import { VCFund } from '../../types/vcFund.types';
import { afisteTheme } from '../../styles/afiste-theme';

const AdminPanelScreen: React.FC = () => {
  const navigate = useNavigate();
  const [funds, setFunds] = useState<VCFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedFund, setSelectedFund] = useState<VCFund | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'funds' | 'users' | 'transactions'>('funds');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [blockchainTransactions, setBlockchainTransactions] = useState<BlockchainTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }

    checkAdminAccess();
    loadFunds();
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'transactions') {
      loadBlockchainTransactions();
    }
  }, [navigate, activeTab]);

  const loadBlockchainTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const data = await blockchainAPI.getTransactionHistory({ limit: 50 });
      setBlockchainTransactions(data.transactions);
    } catch (err) {
      console.error('Failed to load blockchain transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const checkAdminAccess = async () => {
    try {
      const profile = await authAPI.getProfile();
      setUser(profile);
      if (profile.role !== 'admin' && profile.role !== 'fund_manager') {
        navigate('/dashboard');
      }
    } catch (err) {
      navigate('/login');
    }
  };

  const loadFunds = async () => {
    try {
      setLoading(true);
      const response = await adminVCFundsAPI.getVCFunds();
      // Backend returns { data: [...], pagination: {...} } with camelCase
      // Transform to snake_case for frontend
      const fundsData = (response.data.data || []).map((fund: any) => ({
        id: fund.id,
        name: fund.name,
        description: fund.description,
        manager: fund.manager,
        total_supply: fund.totalSupply,
        available_supply: fund.availableSupply,
        fund_size: fund.fundSize,
        minimum_investment: fund.minimumInvestment,
        launch_date: fund.launchDate,
        maturity_date: fund.maturityDate,
        status: fund.status,
        risk_level: fund.riskLevel,
        regulatory_status: fund.regulatoryStatus,
        current_nav: fund.currentNav,
        tokens_available_percentage: fund.availableSupply && fund.totalSupply 
          ? (fund.availableSupply / fund.totalSupply) * 100 
          : 0,
      }));
      setFunds(fundsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading funds');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFund = async (formData: any) => {
    try {
      const response = await adminVCFundsAPI.createVCFund(formData);
      setShowCreateForm(false);
      setError(null);
      loadFunds();
    } catch (err: any) {
      // Log error details only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating fund:', {
          error: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
      }
      
      // Extract error message for user display
      let errorMessage = 'Error creating fund';
      if (err.response?.data) {
        errorMessage = err.response.data.error || err.response.data.message || 'An error occurred while creating the fund';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  const handleUpdateNAV = async (fundId: string, navData: any) => {
    try {
      await adminVCFundsAPI.updateNAV(fundId, navData);
      loadFunds();
    } catch (err: any) {
      setError(err.message || 'Error updating NAV');
    }
  };

  const handleMintTokens = async (fundId: string, amount: number, toAccountId: string) => {
    try {
      await adminVCFundsAPI.mintTokens(fundId, {
        amount,
        to_account_id: toAccountId,
      });
      loadFunds();
    } catch (err: any) {
      setError(err.message || 'Error minting tokens');
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await adminAPI.getUsers({ page: usersPage, limit: 50 });
      setUsers(response.data);
      setUsersTotal(response.pagination.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUpdateKYC = async (userId: string, kycLevel: number, kycStatus: string) => {
    try {
      const response = await adminAPI.updateUserKYC(userId, { kyc_level: kycLevel, kyc_status: kycStatus as any });
      loadUsers();
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message || 'Error updating KYC';
        setError(errorMsg);
      }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Cargando panel de administración...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Panel de Administración</h1>
        {activeTab === 'funds' && (
          <button
            style={styles.createButton}
            onClick={() => setShowCreateForm(true)}
          >
            + Crear Nuevo Fondo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'funds' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('funds')}
        >
          Fondos VC
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'users' ? styles.tabActive : {}),
          }}
          onClick={() => {
            setActiveTab('users');
            if (users.length === 0) loadUsers();
          }}
        >
          Usuarios
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'transactions' ? styles.tabActive : {}),
          }}
          onClick={() => {
            setActiveTab('transactions');
            if (blockchainTransactions.length === 0) loadBlockchainTransactions();
          }}
        >
          Blockchain Transactions
        </button>
      </div>

      {error && (
        <div style={styles.alertError}>{error}</div>
      )}

      {showCreateForm && (
        <CreateFundForm
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateFund}
        />
      )}

      <div style={styles.content}>
        {activeTab === 'funds' ? (
          <div style={styles.fundsList}>
            <h2 style={styles.sectionTitle}>Fondos VC</h2>
          {funds.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No hay fondos creados</p>
              <button
                style={styles.primaryButton}
                onClick={() => setShowCreateForm(true)}
              >
                Crear Primer Fondo
              </button>
            </div>
          ) : (
            <div style={styles.fundsGrid}>
              {funds.map((fund) => (
                <FundCard
                  key={fund.id}
                  fund={fund}
                  onUpdateNAV={handleUpdateNAV}
                  onMintTokens={handleMintTokens}
                  onViewDetails={() => setSelectedFund(fund)}
                />
              ))}
            </div>
          )}
          </div>
        ) : activeTab === 'users' ? (
          <div style={styles.usersList}>
            <h2 style={styles.sectionTitle}>Usuarios</h2>
            {usersLoading ? (
              <div style={styles.loading}>Cargando usuarios...</div>
            ) : users.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No hay usuarios</p>
              </div>
            ) : (
              <div style={styles.usersTable}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${afisteTheme.colors.border}` }}>
                      <th style={styles.tableHeader}>Email</th>
                      <th style={styles.tableHeader}>Nombre</th>
                      <th style={styles.tableHeader}>Rol</th>
                      <th style={styles.tableHeader}>KYC Level</th>
                      <th style={styles.tableHeader}>KYC Status</th>
                      <th style={styles.tableHeader}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} style={{ borderBottom: `1px solid ${afisteTheme.colors.border}` }}>
                        <td style={styles.tableCell}>{user.email}</td>
                        <td style={styles.tableCell}>
                          {user.first_name || user.last_name
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : '-'}
                        </td>
                        <td style={styles.tableCell}>{user.role}</td>
                        <td style={styles.tableCell}>{user.kyc_level}</td>
                        <td style={styles.tableCell}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              backgroundColor:
                                user.kyc_status === 'verified'
                                  ? '#10B981'
                                  : user.kyc_status === 'rejected'
                                  ? '#EF4444'
                                  : '#F59E0B',
                              color: '#FFFFFF',
                            }}
                          >
                            {user.kyc_status}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <button
                            style={styles.smallButton}
                            onClick={async () => {
                              const currentLevel = user.kyc_level ?? 0;
                              const newLevel = currentLevel < 3 ? currentLevel + 1 : 3;
                              await handleUpdateKYC(user.id, newLevel, 'verified');
                            }}
                          >
                            ↑ KYC
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div style={styles.transactionsList}>
            <h2 style={styles.sectionTitle}>Blockchain Transactions</h2>
            <BlockchainTransactions
              transactions={blockchainTransactions}
              loading={loadingTransactions}
              title="All Blockchain Transactions"
              showContractAddress={true}
            />
          </div>
        )}
      </div>

      {selectedFund && (
        <FundDetailModal
          fund={selectedFund}
          onClose={() => setSelectedFund(null)}
          onUpdateNAV={handleUpdateNAV}
          onMintTokens={handleMintTokens}
        />
      )}
    </div>
  );
};

// Create Fund Form Component
const CreateFundForm: React.FC<{
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    manager: '',
    description: '',
    total_supply: '',
    minimum_investment: '',
    fund_size: '',
    risk_level: 'medium',
    status: 'active',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.manager || !formData.total_supply || !formData.minimum_investment) {
      return;
    }
    
    const totalSupply = parseFloat(formData.total_supply);
    const minimumInvestment = parseFloat(formData.minimum_investment);
    
    if (isNaN(totalSupply) || totalSupply <= 0) {
      return;
    }
    
    if (isNaN(minimumInvestment) || minimumInvestment <= 0) {
      return;
    }
    
    onSubmit({
      name: formData.name.trim(),
      manager: formData.manager.trim(),
      description: formData.description.trim() || undefined,
      total_supply: totalSupply,
      minimum_investment: minimumInvestment,
      fund_size: formData.fund_size && formData.fund_size.trim() ? parseFloat(formData.fund_size) : undefined,
      risk_level: formData.risk_level,
      status: formData.status,
    });
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h2 style={styles.modalTitle}>Crear Nuevo Fondo VC</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nombre del Fondo *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Gestor *</label>
            <input
              type="text"
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={styles.textarea}
              rows={4}
            />
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Total Supply *</label>
              <input
                type="number"
                step="0.0001"
                value={formData.total_supply}
                onChange={(e) => setFormData({ ...formData, total_supply: e.target.value })}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Inversión Mínima *</label>
              <input
                type="number"
                step="0.01"
                value={formData.minimum_investment}
                onChange={(e) => setFormData({ ...formData, minimum_investment: e.target.value })}
                style={styles.input}
                required
              />
            </div>
          </div>
          <div style={styles.formActions}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" style={styles.submitButton}>
              Crear Fondo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Fund Card Component
const FundCard: React.FC<{
  fund: VCFund;
  onUpdateNAV: (id: string, data: any) => void;
  onMintTokens: (id: string, amount: number, toAccountId: string) => void;
  onViewDetails: () => void;
}> = ({ fund, onViewDetails }) => {
  return (
    <div style={styles.fundCard}>
      <h3 style={styles.fundName}>{fund.name}</h3>
      <div style={styles.fundInfo}>
        <div style={styles.infoRow}>
          <span>NAV:</span>
          <span>${fund.current_nav?.toFixed(4)}</span>
        </div>
        <div style={styles.infoRow}>
          <span>Estado:</span>
          <span>{fund.status}</span>
        </div>
        <div style={styles.infoRow}>
          <span>Riesgo:</span>
          <span>{fund.risk_level}</span>
        </div>
      </div>
      <button style={styles.viewButton} onClick={onViewDetails}>
        Gestionar
      </button>
    </div>
  );
};

// Fund Detail Modal Component
const FundDetailModal: React.FC<{
  fund: VCFund;
  onClose: () => void;
  onUpdateNAV: (id: string, data: any) => void;
  onMintTokens: (id: string, amount: number, toAccountId: string) => void;
}> = ({ fund, onClose, onUpdateNAV, onMintTokens }) => {

  const [navValue, setNavValue] = useState<string>(fund.current_nav?.toString() || '1');
  const [mintAmount, setMintAmount] = useState<string>('');
  const [mintToAccount, setMintToAccount] = useState<string>('');
  const [showUpdateNAV, setShowUpdateNAV] = useState(false);
  const [showMintTokens, setShowMintTokens] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const handleUpdateNAVSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nav = parseFloat(navValue);
    if (isNaN(nav) || nav <= 0) {
      return;
    }
    onUpdateNAV(fund.id, { current_nav: nav });
    setShowUpdateNAV(false);
  };

  const handleMintTokensSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(mintAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }
    if (!mintToAccount.trim()) {
      return;
    }
    onMintTokens(fund.id, amount, mintToAccount.trim());
    setMintAmount('');
    setMintToAccount('');
    setShowMintTokens(false);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h2 style={styles.modalTitle}>{fund.name}</h2>
        <div style={styles.modalBody}>
          {/* Fund Information */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: afisteTheme.colors.text }}>
              Información del Fondo
            </h3>
            <div style={styles.fundInfo}>
              {fund.description && (
                <div style={styles.infoRow}>
                  <span style={{ fontWeight: 600 }}>Descripción:</span>
                  <span style={{ textAlign: 'right', maxWidth: '60%' }}>{fund.description}</span>
                </div>
              )}
              <div style={styles.infoRow}>
                <span style={{ fontWeight: 600 }}>Gestor:</span>
                <span>{fund.manager || 'N/A'}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={{ fontWeight: 600 }}>Estado:</span>
                <span style={{ textTransform: 'capitalize' }}>{fund.status}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={{ fontWeight: 600 }}>Nivel de Riesgo:</span>
                <span style={{ textTransform: 'capitalize' }}>{fund.risk_level}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={{ fontWeight: 600 }}>NAV Actual:</span>
                <span>{formatCurrency(fund.current_nav || 0)}</span>
              </div>
              {fund.fund_size && (
                <div style={styles.infoRow}>
                  <span style={{ fontWeight: 600 }}>Tamaño del Fondo:</span>
                  <span>{formatCurrency(fund.fund_size)}</span>
                </div>
              )}
              <div style={styles.infoRow}>
                <span style={{ fontWeight: 600 }}>Inversión Mínima:</span>
                <span>{formatCurrency(fund.minimum_investment || 0)}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={{ fontWeight: 600 }}>Total Supply:</span>
                <span>{fund.total_supply?.toLocaleString() || '0'} tokens</span>
              </div>
              <div style={styles.infoRow}>
                <span style={{ fontWeight: 600 }}>Available Supply:</span>
                <span>{fund.available_supply?.toLocaleString() || '0'} tokens</span>
              </div>
              <div style={styles.infoRow}>
                <span style={{ fontWeight: 600 }}>Disponible:</span>
                <span>{formatPercentage(fund.tokens_available_percentage || 0)}</span>
              </div>
              {fund.launch_date && (
                <div style={styles.infoRow}>
                  <span style={{ fontWeight: 600 }}>Fecha de Lanzamiento:</span>
                  <span>{new Date(fund.launch_date).toLocaleDateString('es-ES')}</span>
                </div>
              )}
              {fund.maturity_date && (
                <div style={styles.infoRow}>
                  <span style={{ fontWeight: 600 }}>Fecha de Vencimiento:</span>
                  <span>{new Date(fund.maturity_date).toLocaleDateString('es-ES')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Management Actions */}
          <div style={{ borderTop: `1px solid ${afisteTheme.colors.border}`, paddingTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: afisteTheme.colors.text }}>
              Opciones de Gestión
            </h3>

            {/* Update NAV */}
            {!showUpdateNAV ? (
              <button
                onClick={() => setShowUpdateNAV(true)}
                style={{
                  ...styles.smallButton,
                  width: '100%',
                  marginBottom: '12px',
                }}
              >
                Actualizar NAV
              </button>
            ) : (
              <form onSubmit={handleUpdateNAVSubmit} style={{ marginBottom: '16px', padding: '16px', background: afisteTheme.colors.surfaceLight, borderRadius: '8px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nuevo NAV por Token (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={navValue}
                    onChange={(e) => setNavValue(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formActions}>
                  <button type="button" onClick={() => setShowUpdateNAV(false)} style={styles.cancelButton}>
                    Cancelar
                  </button>
                  <button type="submit" style={styles.submitButton}>
                    Actualizar NAV
                  </button>
                </div>
              </form>
            )}

            {/* Mint Tokens */}
            {!showMintTokens ? (
              <button
                onClick={() => setShowMintTokens(true)}
                style={{
                  ...styles.smallButton,
                  width: '100%',
                  marginBottom: '12px',
                }}
              >
                Mintear Tokens
              </button>
            ) : (
              <form onSubmit={handleMintTokensSubmit} style={{ marginBottom: '16px', padding: '16px', background: afisteTheme.colors.surfaceLight, borderRadius: '8px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Cantidad de Tokens</label>
                  <input
                    type="number"
                    step="0.01"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>ID de Cuenta Destino</label>
                  <input
                    type="text"
                    value={mintToAccount}
                    onChange={(e) => setMintToAccount(e.target.value)}
                    style={styles.input}
                    placeholder="account_id"
                    required
                  />
                </div>
                <div style={styles.formActions}>
                  <button type="button" onClick={() => setShowMintTokens(false)} style={styles.cancelButton}>
                    Cancelar
                  </button>
                  <button type="submit" style={styles.submitButton}>
                    Mintear Tokens
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        <button style={styles.closeButton} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: afisteTheme.colors.background,
    padding: '40px 20px',
  },
  header: {
    maxWidth: '1400px',
    margin: '0 auto 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: afisteTheme.colors.text,
  },
  tabs: {
    maxWidth: '1400px',
    margin: '0 auto 30px',
    display: 'flex',
    gap: '10px',
    borderBottom: `2px solid ${afisteTheme.colors.border}`,
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    color: afisteTheme.colors.textSecondary,
    marginBottom: '-2px',
  },
  tabActive: {
    color: afisteTheme.colors.primary,
    borderBottom: `2px solid ${afisteTheme.colors.primary}`,
    fontWeight: '600',
  },
  createButton: {
    padding: '14px 28px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '24px',
    color: afisteTheme.colors.text,
  },
  fundsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  },
  fundCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  fundName: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: afisteTheme.colors.text,
  },
  fundInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  viewButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: afisteTheme.colors.text,
  },
  modalBody: {
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: afisteTheme.colors.text,
  },
  input: {
    padding: '12px',
    border: `1px solid ${afisteTheme.colors.textSecondary}`,
    borderRadius: '8px',
    fontSize: '16px',
  },
  textarea: {
    padding: '12px',
    border: `1px solid ${afisteTheme.colors.textSecondary}`,
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: 'inherit',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: afisteTheme.colors.text,
    border: `2px solid ${afisteTheme.colors.textSecondary}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
  closeButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: afisteTheme.colors.textSecondary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: 'white',
    borderRadius: '12px',
  },
  primaryButton: {
    padding: '14px 28px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '20px',
  },
  alertError: {
    maxWidth: '1400px',
    margin: '0 auto 20px',
    padding: '16px',
    backgroundColor: '#FEE2E2',
    color: afisteTheme.colors.accent,
    borderRadius: '8px',
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '18px',
    color: afisteTheme.colors.textSecondary,
  },
  usersList: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  usersTable: {
    overflowX: 'auto',
  },
  tableHeader: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    color: afisteTheme.colors.text,
    backgroundColor: afisteTheme.colors.background,
  },
  tableCell: {
    padding: '12px',
    fontSize: '14px',
    color: afisteTheme.colors.text,
  },
  smallButton: {
    padding: '6px 12px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
};

export default AdminPanelScreen;

