import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicTokenOfferingsAPI, accountTokenOfferingsAPI, TokenOffering } from '../../api/tokenOfferings';
import { authAPI } from '../../api/auth';
import { afisteTheme } from '../../styles/afiste-theme';

const TokenOfferingScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offering, setOffering] = useState<TokenOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/marketplace');
      return;
    }

    loadOffering();
  }, [id, navigate]);

  const loadOffering = async () => {
    try {
      setLoading(true);
      const response = await publicTokenOfferingsAPI.getOffering(id!);
      setOffering(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error loading offering');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (!offering || !id) return;

    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount < offering.minInvestment) {
      setError(`Minimum investment is $${offering.minInvestment}`);
      return;
    }

    if (offering.maxInvestment && amount > offering.maxInvestment) {
      setError(`Maximum investment is $${offering.maxInvestment}`);
      return;
    }

    try {
      setPurchasing(true);
      setError(null);
      setSuccess(null);

      const result = await accountTokenOfferingsAPI.purchaseTokens(id, { amount });
      
      setSuccess(`Successfully purchased ${result.tokensPurchased.toFixed(4)} tokens!`);
      setPurchaseAmount('');
      loadOffering(); // Refresh offering data
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to purchase tokens');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading offering...</div>
      </div>
    );
  }

  if (error && !offering) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <button style={styles.backButton} onClick={() => navigate('/marketplace')}>
          Back to Marketplace
        </button>
      </div>
    );
  }

  if (!offering) {
    return null;
  }

  const tokensRemaining = offering.totalTokensOffered - offering.tokensSold;
  const progressPercentage = (offering.tokensSold / offering.totalTokensOffered) * 100;
  const isActive = offering.status === 'active' && (!offering.endDate || new Date(offering.endDate) > new Date());

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/marketplace')}>
          ← Back
        </button>
        <h1 style={styles.title}>Token Offering</h1>
      </div>

      {error && (
        <div style={styles.alertError}>{error}</div>
      )}

      {success && (
        <div style={styles.alertSuccess}>{success}</div>
      )}

      <div style={styles.content}>
        {/* Fund Info */}
        <div style={styles.fundCard}>
          <h2 style={styles.fundName}>{offering.vcFund?.name || 'VC Fund'}</h2>
          <p style={styles.fundDescription}>{offering.vcFund?.description}</p>
          <div style={styles.fundDetails}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Manager:</span>
              <span style={styles.detailValue}>{offering.vcFund?.manager}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Current NAV:</span>
              <span style={styles.detailValue}>${offering.vcFund?.currentNav?.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Offering Details */}
        <div style={styles.offeringCard}>
          <h2 style={styles.sectionTitle}>Offering Details</h2>
          
          <div style={styles.offeringInfo}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Offering Price:</span>
              <span style={styles.infoValue}>${offering.offeringPrice.toFixed(4)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Minimum Investment:</span>
              <span style={styles.infoValue}>${offering.minInvestment.toFixed(2)}</span>
            </div>
            {offering.maxInvestment && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Maximum Investment:</span>
                <span style={styles.infoValue}>${offering.maxInvestment.toFixed(2)}</span>
              </div>
            )}
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Start Date:</span>
              <span style={styles.infoValue}>{new Date(offering.startDate).toLocaleDateString()}</span>
            </div>
            {offering.endDate && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>End Date:</span>
                <span style={styles.infoValue}>{new Date(offering.endDate).toLocaleDateString()}</span>
              </div>
            )}
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Status:</span>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: offering.status === 'active' ? afisteTheme.colors.success : 
                                offering.status === 'completed' ? afisteTheme.colors.textSecondary :
                                afisteTheme.colors.warning,
              }}>
                {offering.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={styles.progressSection}>
            <div style={styles.progressHeader}>
              <span>Tokens Sold</span>
              <span>{offering.tokensSold.toFixed(2)} / {offering.totalTokensOffered.toFixed(2)}</span>
            </div>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${progressPercentage}%`,
                  backgroundColor: afisteTheme.colors.primary,
                }}
              />
            </div>
            <div style={styles.progressFooter}>
              <span>{progressPercentage.toFixed(1)}% sold</span>
              <span>{tokensRemaining.toFixed(2)} remaining</span>
            </div>
          </div>
        </div>

        {/* Purchase Form */}
        {isActive && authAPI.isAuthenticated() && (
          <div style={styles.purchaseCard}>
            <h2 style={styles.sectionTitle}>Purchase Tokens</h2>
            <form onSubmit={handlePurchase} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Investment Amount (USD)</label>
                <input
                  type="number"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  style={styles.input}
                  placeholder={`Min: $${offering.minInvestment}`}
                  min={offering.minInvestment}
                  max={offering.maxInvestment}
                  step="0.01"
                  required
                />
                {purchaseAmount && !isNaN(parseFloat(purchaseAmount)) && (
                  <div style={styles.calculation}>
                    You will receive: <strong>{(parseFloat(purchaseAmount) / offering.offeringPrice).toFixed(4)} tokens</strong>
                  </div>
                )}
              </div>
              <button
                type="submit"
                style={styles.submitButton}
                disabled={purchasing || !purchaseAmount}
              >
                {purchasing ? 'Processing...' : 'Purchase Tokens'}
              </button>
            </form>
          </div>
        )}

        {!authAPI.isAuthenticated() && (
          <div style={styles.loginPrompt}>
            <p>Please log in to purchase tokens</p>
            <button style={styles.loginButton} onClick={() => navigate('/login')}>
              Login
            </button>
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
    padding: '40px 20px',
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto 30px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: afisteTheme.colors.text,
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '400',
  },
  title: {
    fontSize: '32px',
    fontWeight: '300',
    color: afisteTheme.colors.text,
    letterSpacing: '-0.02em',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '24px',
  },
  fundCard: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '12px',
    padding: '32px',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  fundName: {
    fontSize: '28px',
    fontWeight: '400',
    color: afisteTheme.colors.text,
    marginBottom: '16px',
    letterSpacing: '-0.01em',
  },
  fundDescription: {
    fontSize: '16px',
    color: afisteTheme.colors.textSecondary,
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  fundDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  detailLabel: {
    color: afisteTheme.colors.textSecondary,
  },
  detailValue: {
    color: afisteTheme.colors.text,
    fontWeight: '500',
  },
  offeringCard: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '12px',
    padding: '32px',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '400',
    color: afisteTheme.colors.text,
    marginBottom: '24px',
    letterSpacing: '-0.01em',
  },
  offeringInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '32px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '16px',
  },
  infoLabel: {
    color: afisteTheme.colors.textSecondary,
  },
  infoValue: {
    color: afisteTheme.colors.text,
    fontWeight: '500',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
  },
  progressSection: {
    marginTop: '32px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '14px',
    color: afisteTheme.colors.textSecondary,
  },
  progressBar: {
    width: '100%',
    height: '12px',
    backgroundColor: afisteTheme.colors.surfaceLight,
    borderRadius: '6px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  progressFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    fontSize: '12px',
    color: afisteTheme.colors.textSecondary,
  },
  purchaseCard: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '12px',
    padding: '32px',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: afisteTheme.colors.text,
  },
  input: {
    padding: '14px',
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: afisteTheme.colors.surfaceLight,
    color: afisteTheme.colors.text,
    outline: 'none',
  },
  calculation: {
    fontSize: '14px',
    color: afisteTheme.colors.textSecondary,
    marginTop: '8px',
  },
  submitButton: {
    padding: '16px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  loginPrompt: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    boxShadow: afisteTheme.shadows.md,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  loginButton: {
    marginTop: '16px',
    padding: '12px 24px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  alertError: {
    maxWidth: '1200px',
    margin: '0 auto 20px',
    padding: '16px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: afisteTheme.colors.accent,
    borderRadius: '8px',
    border: `1px solid ${afisteTheme.colors.accent}`,
  },
  alertSuccess: {
    maxWidth: '1200px',
    margin: '0 auto 20px',
    padding: '16px',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: afisteTheme.colors.success,
    borderRadius: '8px',
    border: `1px solid ${afisteTheme.colors.success}`,
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '18px',
    color: afisteTheme.colors.textSecondary,
  },
  error: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '18px',
    color: afisteTheme.colors.accent,
  },
};

export default TokenOfferingScreen;

