import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { afisteTheme } from '../../styles/afiste-theme';

const LandingScreen: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = authAPI.isAuthenticated();

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <div className="hero-title-wrapper">
            <h1 style={styles.heroTitle}>
              Invierte en empresas tecnológicas
            </h1>
          </div>
          <p style={styles.heroSubtitle}>
            Accede a fondos de Venture Capital
            <br />
            previamente filtrados y seleccionados
          </p>
          <div style={styles.heroActions}>
            {!isAuthenticated && (
              <button
                style={styles.primaryButton}
                onClick={() => navigate('/register')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = afisteTheme.colors.primaryDark;
                  e.currentTarget.style.opacity = '0.95';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = afisteTheme.colors.primary;
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Crear Cuenta
              </button>
            )}
            <button
              style={styles.primaryButton}
              onClick={() => navigate('/marketplace')}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = afisteTheme.colors.primaryDark;
                e.currentTarget.style.opacity = '0.95';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = afisteTheme.colors.primary;
                e.currentTarget.style.opacity = '1';
              }}
            >
              Explorar Fondos
            </button>
          </div>
          {!isAuthenticated && (
            <div style={styles.heroFooter}>
              <button
                style={styles.linkButton}
                onClick={() => navigate('/login')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.color = afisteTheme.colors.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                  e.currentTarget.style.color = afisteTheme.colors.textSecondary;
                }}
              >
                Ya tengo cuenta
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: afisteTheme.colors.background,
  },
  hero: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    position: 'relative',
  },
  heroContent: {
    maxWidth: '680px',
    textAlign: 'center',
    width: '100%',
  },
  heroTitle: {
    fontSize: 'clamp(36px, 5.5vw, 56px)',
    fontWeight: '400',
    lineHeight: '1.2',
    marginBottom: '32px',
    background: `linear-gradient(135deg, ${afisteTheme.colors.text} 0%, ${afisteTheme.colors.textSecondary} 50%, ${afisteTheme.colors.text} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.02em',
    marginLeft: 'auto',
    marginRight: 'auto',
    position: 'relative',
    backgroundSize: '200% 200%',
    animation: 'gradientShift 8s ease infinite',
    paddingBottom: '24px',
  },
  heroSubtitle: {
    fontSize: 'clamp(16px, 1.8vw, 20px)',
    fontWeight: '300',
    lineHeight: '1.7',
    marginBottom: '56px',
    color: afisteTheme.colors.textSecondary,
    letterSpacing: '0.02em',
    maxWidth: '540px',
    marginLeft: 'auto',
    marginRight: 'auto',
    opacity: 0.85,
  },
  heroActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '40px',
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: afisteTheme.colors.primary,
    color: '#FFFFFF',
    padding: '16px 40px',
    fontSize: '15px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: afisteTheme.colors.text,
    padding: '16px 40px',
    fontSize: '15px',
    fontWeight: '500',
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
  },
  heroFooter: {
    marginTop: '56px',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: afisteTheme.colors.textSecondary,
    fontSize: '14px',
    fontWeight: '400',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    letterSpacing: '0.2px',
    opacity: 0.7,
  },
};

// Add gradient animation and decorative line
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes gradientShift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .hero-title-wrapper {
    position: relative;
    animation: fadeInUp 0.8s ease-out;
  }
  .hero-title-wrapper::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${afisteTheme.colors.border}, transparent);
  }
`;
if (!document.head.querySelector('style[data-landing-animation]')) {
  styleSheet.setAttribute('data-landing-animation', 'true');
  document.head.appendChild(styleSheet);
}

export default LandingScreen;

