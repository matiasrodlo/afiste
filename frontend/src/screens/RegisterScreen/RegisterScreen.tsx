import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { afisteTheme } from '../../styles/afiste-theme';

const RegisterScreen: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirmation: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.password_confirmation) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      if (response.user) {
        // Redirect to payments to deposit funds first
        navigate('/payments?welcome=true');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Crear Cuenta</h1>
          <p style={styles.subtitle}>Únete a Afiste y comienza a invertir</p>
        </div>

        {error && (
          <div style={styles.alertError}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                style={styles.input}
                placeholder="Nombre"
                autoComplete="given-name"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Apellido</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                style={styles.input}
                placeholder="Apellido"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Contraseña *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={styles.input}
              placeholder="Mínimo 8 caracteres"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirmar Contraseña *</label>
            <input
              type="password"
              name="password_confirmation"
              value={formData.password_confirmation}
              onChange={handleChange}
              style={styles.input}
              placeholder="Repite tu contraseña"
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            style={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={styles.link}>
              Inicia sesión aquí
            </Link>
          </p>
          <Link to="/" style={styles.backLink}>
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
    maxWidth: '450px',
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '12px',
    padding: '40px',
    boxShadow: afisteTheme.shadows.lg,
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: afisteTheme.colors.text,
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: afisteTheme.colors.textSecondary,
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
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
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: afisteTheme.colors.surfaceLight,
    color: afisteTheme.colors.text,
  },
  submitButton: {
    padding: '14px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: afisteTheme.colors.textSecondary,
    margin: '0 0 12px 0',
  },
  link: {
    color: afisteTheme.colors.primary,
    textDecoration: 'none',
    fontWeight: '600',
  },
  backLink: {
    display: 'block',
    fontSize: '14px',
    color: afisteTheme.colors.textSecondary,
    textDecoration: 'none',
    marginTop: '12px',
  },
  alertError: {
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: afisteTheme.colors.accent,
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    border: `1px solid ${afisteTheme.colors.accent}`,
  },
};

export default RegisterScreen;

