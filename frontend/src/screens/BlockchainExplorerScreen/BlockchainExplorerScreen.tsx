import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { blockchainAPI } from '../../api/blockchain';
import { BlockchainTransactions, BlockchainTransaction } from '../../components/BlockchainTransactions/BlockchainTransactions';
import { afisteTheme } from '../../styles/afiste-theme';

const BlockchainExplorerScreen: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    contractAddress: '',
    fromAddress: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadTransactions();
  }, [page, filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {
        limit,
        offset: (page - 1) * limit,
      };
      if (filters.status) params.status = filters.status;
      if (filters.contractAddress) params.contractAddress = filters.contractAddress;
      if (filters.fromAddress) params.fromAddress = filters.fromAddress;

      const data = await blockchainAPI.getTransactionHistory(params);
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Error loading transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(1); // Reset to first page when filters change
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: afisteTheme.colors.background,
        padding: `${afisteTheme.spacing.xl} ${afisteTheme.spacing.lg}`,
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: '56px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 'clamp(36px, 5vw, 52px)',
                fontWeight: '400',
                color: afisteTheme.colors.text,
                margin: `0 0 ${afisteTheme.spacing.sm} 0`,
                letterSpacing: '-0.02em',
                lineHeight: '1.2',
              }}
            >
              Explorador Blockchain
            </h1>
            <p
              style={{
                color: afisteTheme.colors.textSecondary,
                margin: 0,
                fontSize: '16px',
                fontWeight: '300',
                letterSpacing: '0.01em',
              }}
            >
              Explora todas las transacciones blockchain de la plataforma
            </p>
          </div>
          <button
            onClick={loadTransactions}
            style={{
              padding: '14px 28px',
              backgroundColor: afisteTheme.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 500,
              transition: 'all 0.25s ease',
              letterSpacing: '0.3px',
            }}
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

        {/* Filters */}
        <div
          style={{
            background: afisteTheme.colors.surface,
            borderRadius: '10px',
            padding: '28px 32px',
            border: `1px solid ${afisteTheme.colors.border}`,
            marginBottom: afisteTheme.spacing['2xl'],
          }}
        >
          <h3
            style={{
              margin: `0 0 ${afisteTheme.spacing.lg} 0`,
              fontSize: '1.125rem',
              fontWeight: '400',
              color: afisteTheme.colors.text,
              letterSpacing: '-0.01em',
            }}
          >
            Filtros
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: afisteTheme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `1px solid ${afisteTheme.colors.border}`,
                  borderRadius: '6px',
                  backgroundColor: afisteTheme.colors.background,
                  color: afisteTheme.colors.text,
                  fontSize: '14px',
                  fontWeight: '400',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${afisteTheme.colors.primary}15`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">Todos los Estados</option>
                <option value="pending">Pendiente</option>
                <option value="sent">Enviado</option>
                <option value="confirmed">Confirmado</option>
                <option value="failed">Fallido</option>
              </select>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: afisteTheme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Dirección del Contrato
              </label>
              <input
                type="text"
                value={filters.contractAddress}
                onChange={(e) => handleFilterChange('contractAddress', e.target.value)}
                placeholder="0x..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `1px solid ${afisteTheme.colors.border}`,
                  borderRadius: '6px',
                  backgroundColor: afisteTheme.colors.background,
                  color: afisteTheme.colors.text,
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  fontWeight: '400',
                  transition: 'all 0.2s ease',
                }}
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
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: afisteTheme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Dirección Desde
              </label>
              <input
                type="text"
                value={filters.fromAddress}
                onChange={(e) => handleFilterChange('fromAddress', e.target.value)}
                placeholder="0x..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `1px solid ${afisteTheme.colors.border}`,
                  borderRadius: '6px',
                  backgroundColor: afisteTheme.colors.background,
                  color: afisteTheme.colors.text,
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  fontWeight: '400',
                  transition: 'all 0.2s ease',
                }}
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
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              padding: '14px 16px',
              borderRadius: '6px',
              marginBottom: afisteTheme.spacing.lg,
              border: `1px solid rgba(239, 68, 68, 0.3)`,
              fontSize: '14px',
              fontWeight: '400',
            }}
          >
            {error}
          </div>
        )}

        {/* Transactions */}
        <BlockchainTransactions
          transactions={transactions}
          loading={loading}
          title={`Transacciones Blockchain (${total} total)`}
          showContractAddress={true}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              marginTop: afisteTheme.spacing['2xl'],
            }}
          >
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              style={{
                padding: '12px 24px',
                backgroundColor: page === 1 ? afisteTheme.colors.borderLight : afisteTheme.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: page === 1 ? 0.5 : 1,
                transition: 'all 0.25s ease',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={(e) => {
                if (page !== 1) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.opacity = '0.95';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.opacity = page === 1 ? '0.5' : '1';
              }}
            >
              Anterior
            </button>
            <span
              style={{
                color: afisteTheme.colors.text,
                fontSize: '14px',
                fontWeight: '400',
              }}
            >
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              style={{
                padding: '12px 24px',
                backgroundColor: page === totalPages ? afisteTheme.colors.borderLight : afisteTheme.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: page === totalPages ? 0.5 : 1,
                transition: 'all 0.25s ease',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={(e) => {
                if (page !== totalPages) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.opacity = '0.95';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.opacity = page === totalPages ? '0.5' : '1';
              }}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainExplorerScreen;

