import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { afisteTheme } from '../../styles/afiste-theme';

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authAPI.login({ email, password });
      if (response.user) {
        // Check for redirect parameter
        const redirectPath = searchParams.get('redirect');
        if (redirectPath) {
          navigate(decodeURIComponent(redirectPath));
        } else {
          // Redirect based on user role
          if (response.user.role === 'admin' || response.user.role === 'fund_manager') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Iniciar Sesión</h1>
          <p style={styles.subtitle}>Accede a tu cuenta de Afiste</p>
        </div>

        {error && (
          <div style={styles.alertError}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="tu@email.com"
              required
              autoComplete="email"
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
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
              autoComplete="current-password"
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

          <button
            type="submit"
            style={styles.submitButton}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.opacity = '0.95';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            ¿No tienes cuenta?{' '}
            <Link 
              to="/register" 
              style={styles.link}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Regístrate aquí
            </Link>
          </p>
          <Link 
            to="/" 
            style={styles.backLink}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = afisteTheme.colors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = afisteTheme.colors.textSecondary;
            }}
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: afisteTheme.colors.background,
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '10px',
    padding: '48px 40px',
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: 'clamp(32px, 4vw, 40px)',
    fontWeight: '400',
    color: afisteTheme.colors.text,
    margin: '0 0 12px 0',
    letterSpacing: '-0.02em',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '15px',
    color: afisteTheme.colors.textSecondary,
    margin: 0,
    fontWeight: '300',
    letterSpacing: '0.01em',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: afisteTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '14px 16px',
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: '6px',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: afisteTheme.colors.background,
    color: afisteTheme.colors.text,
    fontWeight: '400',
  },
  submitButton: {
    padding: '16px 24px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
    marginTop: '8px',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: afisteTheme.colors.textSecondary,
    margin: '0 0 16px 0',
    fontWeight: '300',
  },
  link: {
    color: afisteTheme.colors.primary,
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'opacity 0.2s ease',
  },
  backLink: {
    display: 'block',
    fontSize: '14px',
    color: afisteTheme.colors.textSecondary,
    textDecoration: 'none',
    marginTop: '16px',
    fontWeight: '300',
    transition: 'color 0.2s ease',
  },
  alertError: {
    padding: '14px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#dc2626',
    borderRadius: '6px',
    marginBottom: '24px',
    fontSize: '14px',
    border: `1px solid rgba(239, 68, 68, 0.3)`,
    fontWeight: '400',
  },
};

export default LoginScreen;

