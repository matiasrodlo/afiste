import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { useWallet } from '../../hooks/useWallet';
import { formatAddress } from '../../services/blockchain/web3';
import { afisteTheme } from '../../styles/afiste-theme';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = authAPI.isAuthenticated();
  const { isConnected, address, connect, disconnect } = useWallet();

  const isPublicPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';

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
    { path: '/payments', label: 'Pagos' },
    { path: '/blockchain', label: 'Blockchain' },
    { path: '/profile', label: 'Perfil' },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: '#FFFFFF',
        borderBottom: `1px solid ${afisteTheme.colors.border}`,
        boxShadow: afisteTheme.shadows.sm,
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: `0 ${afisteTheme.spacing.lg}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '72px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'opacity 0.2s ease',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <img
              src="/afiste-logo-azul.png"
              alt="AFISTE"
              style={{
                height: '60px',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </button>
        </div>

        {/* Navigation Items - Only show when authenticated */}
        {isAuthenticated && !isPublicPage && (
          <nav style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: `${afisteTheme.spacing.sm} ${afisteTheme.spacing.md}`,
                  fontSize: '15px',
                  fontWeight: 500,
                  color: location.pathname === item.path ? afisteTheme.colors.primary : afisteTheme.colors.textSecondary,
                  cursor: 'pointer',
                  borderRadius: afisteTheme.borderRadius.md,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== item.path) {
                    e.currentTarget.style.color = afisteTheme.colors.textDark;
                    e.currentTarget.style.backgroundColor = afisteTheme.colors.surfaceLight;
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== item.path) {
                    e.currentTarget.style.color = afisteTheme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        {/* Right Side Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: afisteTheme.spacing.sm }}>
          {isAuthenticated ? (
            <>
              {/* On home page, show Dashboard button instead of wallet connection */}
              {location.pathname === '/' ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    backgroundColor: afisteTheme.colors.primary,
                    color: '#FFFFFF',
                    border: 'none',
                    padding: `${afisteTheme.spacing.sm} ${afisteTheme.spacing.lg}`,
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderRadius: afisteTheme.borderRadius.md,
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = afisteTheme.colors.primaryDark;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = afisteTheme.colors.primary;
                  }}
                >
                  Dashboard
                </button>
              ) : (
                /* Wallet Connection - Only show when authenticated and not on home page */
                <>
                  {isConnected && address ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: afisteTheme.spacing.sm,
                        padding: `${afisteTheme.spacing.sm} ${afisteTheme.spacing.md}`,
                        backgroundColor: afisteTheme.colors.surfaceLight,
                        borderRadius: afisteTheme.borderRadius.md,
                        border: `1px solid ${afisteTheme.colors.border}`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          color: afisteTheme.colors.textDark,
                        }}
                      >
                        {formatAddress(address)}
                      </span>
                      <button
                        onClick={disconnect}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: afisteTheme.colors.textSecondary,
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: `${afisteTheme.spacing.xs} ${afisteTheme.spacing.sm}`,
                        }}
                        title="Desconectar Wallet"
                      >
                        Desconectar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleWalletConnect}
                      style={{
                        backgroundColor: afisteTheme.colors.primary,
                        color: '#FFFFFF',
                        border: 'none',
                        padding: `${afisteTheme.spacing.sm} ${afisteTheme.spacing.lg}`,
                        fontSize: '15px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        borderRadius: afisteTheme.borderRadius.md,
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = afisteTheme.colors.primaryDark;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = afisteTheme.colors.primary;
                      }}
                    >
                      Conectar Wallet
                    </button>
                  )}
                </>
              )}

              {/* Logout Button */}
              {!isPublicPage && (
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'none',
                    border: `1px solid ${afisteTheme.colors.border}`,
                    padding: `${afisteTheme.spacing.sm} ${afisteTheme.spacing.lg}`,
                    fontSize: '15px',
                    fontWeight: 500,
                    color: afisteTheme.colors.textDark,
                    cursor: 'pointer',
                    borderRadius: afisteTheme.borderRadius.md,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.accent;
                    e.currentTarget.style.color = afisteTheme.colors.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.border;
                    e.currentTarget.style.color = afisteTheme.colors.textDark;
                  }}
                >
                  Salir
                </button>
              )}
            </>
          ) : (
            /* Public Pages - Only show Login/Register buttons, no wallet connection */
            <div style={{ display: 'flex', gap: afisteTheme.spacing.sm }}>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: `1px solid ${afisteTheme.colors.border}`,
                  padding: `${afisteTheme.spacing.sm} ${afisteTheme.spacing.lg}`,
                  fontSize: '15px',
                  fontWeight: 500,
                  color: afisteTheme.colors.textDark,
                  cursor: 'pointer',
                  borderRadius: afisteTheme.borderRadius.md,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                  e.currentTarget.style.color = afisteTheme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = afisteTheme.colors.border;
                  e.currentTarget.style.color = afisteTheme.colors.textDark;
                }}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => navigate('/register')}
                style={{
                  backgroundColor: afisteTheme.colors.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  padding: `${afisteTheme.spacing.sm} ${afisteTheme.spacing.lg}`,
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  borderRadius: afisteTheme.borderRadius.md,
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = afisteTheme.colors.primaryDark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = afisteTheme.colors.primary;
                }}
              >
                Registrarse
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

