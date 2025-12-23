import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { useWallet } from '../../hooks/useWallet';
import { formatAddress } from '../../services/blockchain/web3';
import { afisteTheme } from '../../styles/afiste-theme';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = authAPI.isAuthenticated();
  const { isConnected, address, connect, disconnect, error: walletError } = useWallet();

  if (!isAuthenticated || location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const handleLogout = () => {
    authAPI.logout();
    if (isConnected) {
      disconnect();
    }
    navigate('/');
  };

  const handleWalletConnect = async () => {
    try {
      await connect();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to connect wallet:', err);
      }
    }
  };

  const navItems = [
    { path: '/marketplace', label: 'Marketplace' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/wallet', label: 'Wallet' },
    { path: '/payments', label: 'Payments' },
    { path: '/profile', label: 'Profile' },
  ];

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <div style={styles.left}>
          <button
            style={styles.logo}
            onClick={() => navigate('/marketplace')}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            AFISTE
          </button>
        </div>
        <div style={styles.center}>
          {navItems.map((item) => (
            <button
              key={item.path}
              style={{
                ...styles.navItem,
                ...(location.pathname === item.path ? styles.navItemActive : {}),
              }}
              onClick={() => navigate(item.path)}
              onMouseEnter={(e) => {
                if (location.pathname !== item.path) {
                  e.currentTarget.style.color = afisteTheme.colors.textDark;
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== item.path) {
                  e.currentTarget.style.color = afisteTheme.colors.textSecondary;
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={styles.right}>
          {isConnected && address ? (
            <div style={styles.walletInfo}>
              <span style={styles.walletAddress}>{formatAddress(address)}</span>
              <button
                style={styles.disconnectButton}
                onClick={disconnect}
                title="Disconnect Wallet"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              style={styles.connectButton}
              onClick={handleWalletConnect}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = afisteTheme.colors.primaryDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = afisteTheme.colors.primary;
              }}
            >
              Connect Wallet
            </button>
          )}
          <button
            style={styles.logoutButton}
            onClick={handleLogout}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = afisteTheme.colors.accent;
              e.currentTarget.style.color = afisteTheme.colors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = afisteTheme.colors.border;
              e.currentTarget.style.color = afisteTheme.colors.textSecondary;
            }}
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: '#FFFFFF',
    borderBottom: `1px solid ${afisteTheme.colors.border}`,
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '72px',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    letterSpacing: '0.5px',
    fontWeight: '600',
    color: afisteTheme.colors.primary,
    cursor: 'pointer',
    padding: '8px 0',
    transition: 'opacity 0.2s ease',
  },
  center: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  navItem: {
    background: 'none',
    border: 'none',
    padding: '10px 16px',
    fontSize: '15px',
    fontWeight: '500',
    color: afisteTheme.colors.textSecondary,
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  },
  navItemActive: {
    color: afisteTheme.colors.primary,
    backgroundColor: 'transparent',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: afisteTheme.spacing.sm,
  },
  connectButton: {
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
  },
  walletInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: afisteTheme.spacing.sm,
    padding: '8px 12px',
    backgroundColor: afisteTheme.colors.background,
    borderRadius: '8px',
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  walletAddress: {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: afisteTheme.colors.textDark,
  },
  disconnectButton: {
    background: 'none',
    border: 'none',
    color: afisteTheme.colors.textSecondary,
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px 8px',
  },
  logoutButton: {
    background: 'none',
    border: `1px solid ${afisteTheme.colors.border}`,
    padding: '10px 20px',
    fontSize: '15px',
    fontWeight: '500',
    color: afisteTheme.colors.textDark,
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  },
};

export default Navigation;

