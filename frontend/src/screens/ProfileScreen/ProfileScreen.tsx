import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, User } from '../../api/auth';
import { kycAPI, KYCDocument, KYCStatus } from '../../api/kyc';
import { afisteTheme } from '../../styles/afiste-theme';

const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentType, setDocumentType] = useState('passport');
  const [documentUrl, setDocumentUrl] = useState('');

  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }

    loadProfile();
    loadKYCStatus();
  }, [navigate]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await authAPI.getProfile();
      setUser(profile);
      setFormData(profile);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const loadKYCStatus = async () => {
    try {
      const status = await kycAPI.getStatus();
      setKycStatus(status);
    } catch (err: any) {
      console.error('Error loading KYC status:', err);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!documentUrl.trim()) {
      setError('Please provide a document URL');
      return;
    }

    try {
      setUploadingDocument(true);
      setError(null);
      await kycAPI.uploadDocument({
        documentType,
        documentUrl: documentUrl.trim(),
      });
      setSuccess('Document uploaded successfully. Waiting for verification.');
      setDocumentUrl('');
      loadKYCStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to upload document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      const updated = await authAPI.updateProfile(formData);
      setUser(updated);
      setEditing(false);
      setSuccess('Perfil actualizado exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return afisteTheme.colors.secondary;
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return afisteTheme.colors.accent;
      default:
        return afisteTheme.colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Cargando perfil...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error loading profile</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Mi Perfil</h1>
        {!editing && (
          <button
            style={styles.editButton}
            onClick={() => setEditing(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.opacity = '0.95';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            Editar Perfil
          </button>
        )}
      </div>

      {error && (
        <div style={styles.alertError}>{error}</div>
      )}

      {success && (
        <div style={styles.alertSuccess}>{success}</div>
      )}

      <div style={styles.content}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Información Personal</h2>
          {editing ? (
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  style={styles.inputDisabled}
                />
                <small style={styles.helpText}>El email no se puede cambiar</small>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name || ''}
                    onChange={handleChange}
                    style={styles.input}
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
                  <label style={styles.label}>Apellido</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name || ''}
                    onChange={handleChange}
                    style={styles.input}
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

              <div style={styles.formGroup}>
                <label style={styles.label}>Teléfono</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  style={styles.input}
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
                <label style={styles.label}>Fecha de Nacimiento</label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date || ''}
                  onChange={handleChange}
                  style={styles.input}
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

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>País</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country || ''}
                    onChange={handleChange}
                    style={styles.input}
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
                  <label style={styles.label}>Ciudad</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city || ''}
                    onChange={handleChange}
                    style={styles.input}
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

              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => {
                    setEditing(false);
                    setFormData(user);
                    setError(null);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.text;
                    e.currentTarget.style.color = afisteTheme.colors.text;
                    e.currentTarget.style.backgroundColor = afisteTheme.colors.surfaceLight;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.border;
                    e.currentTarget.style.color = afisteTheme.colors.text;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={styles.saveButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.opacity = '0.95';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          ) : (
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Email:</span>
                <span style={styles.infoValue}>{user.email}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Nombre:</span>
                <span style={styles.infoValue}>{user.full_name || 'No especificado'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Teléfono:</span>
                <span style={styles.infoValue}>{user.phone || 'No especificado'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>País:</span>
                <span style={styles.infoValue}>{user.country || 'No especificado'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Ciudad:</span>
                <span style={styles.infoValue}>{user.city || 'No especificado'}</span>
              </div>
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Verificación KYC</h2>
          <div style={styles.kycInfo}>
            <div style={styles.kycItem}>
              <span style={styles.kycLabel}>Nivel KYC:</span>
              <span style={styles.kycValue}>{kycStatus?.kycLevel || user.kyc_level}</span>
            </div>
            <div style={styles.kycItem}>
              <span style={styles.kycLabel}>Estado:</span>
              <span
                style={{
                  ...styles.kycStatus,
                  color: getKYCStatusColor(kycStatus?.kycStatus || user.kyc_status),
                }}
              >
                {kycStatus?.kycStatus === 'verified' ? 'Verificado' :
                 kycStatus?.kycStatus === 'pending' ? 'Pendiente' :
                 'Rechazado'}
              </span>
            </div>
          </div>

          {/* KYC Documents */}
          {kycStatus && kycStatus.documents && kycStatus.documents.length > 0 && (
            <div style={styles.documentsSection}>
              <h3 style={styles.documentsTitle}>Documentos Subidos</h3>
              <div style={styles.documentsList}>
                {kycStatus.documents.map((doc) => (
                  <div key={doc.id} style={styles.documentItem}>
                    <div style={styles.documentInfo}>
                      <span style={styles.documentType}>{doc.documentType}</span>
                      <span style={{
                        ...styles.documentStatus,
                        color: doc.status === 'verified' ? afisteTheme.colors.success :
                               doc.status === 'rejected' ? afisteTheme.colors.accent :
                               afisteTheme.colors.warning,
                      }}>
                        {doc.status === 'verified' ? 'Verificado' :
                         doc.status === 'rejected' ? 'Rechazado' :
                         'Pendiente'}
                      </span>
                    </div>
                    {doc.rejectionReason && (
                      <div style={styles.rejectionReason}>
                        Razón: {doc.rejectionReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Document Form */}
          <div style={styles.uploadSection}>
            <h3 style={styles.uploadTitle}>Subir Documento KYC</h3>
            <form onSubmit={handleUploadDocument} style={styles.uploadForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Tipo de Documento</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  style={styles.select}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.primary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${afisteTheme.colors.primary}15`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = afisteTheme.colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="passport">Pasaporte</option>
                  <option value="id_card">Cédula/DNI</option>
                  <option value="proof_of_address">Comprobante de Domicilio</option>
                  <option value="accreditation">Acreditación de Inversor</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>URL del Documento</label>
                <input
                  type="url"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  style={styles.input}
                  placeholder="https://example.com/document.pdf"
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
                <small style={styles.helpText}>
                  Sube tu documento a un servicio de almacenamiento y pega la URL aquí
                </small>
              </div>
              <button
                type="submit"
                style={styles.uploadButton}
                disabled={uploadingDocument || !documentUrl.trim()}
                onMouseEnter={(e) => {
                  if (!uploadingDocument && documentUrl.trim()) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.opacity = '0.95';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {uploadingDocument ? 'Subiendo...' : 'Subir Documento'}
              </button>
            </form>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Cuenta</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Rol:</span>
              <span style={styles.infoValue}>
                {user.role === 'admin' ? 'Administrador' :
                 user.role === 'fund_manager' ? 'Gestor de Fondos' :
                 'Inversor'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Email Verificado:</span>
              <span style={styles.infoValue}>
                {user.is_email_verified ? 'Sí' : 'No'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Miembro desde:</span>
              <span style={styles.infoValue}>
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 'clamp(36px, 5vw, 52px)',
    fontWeight: '400',
    color: afisteTheme.colors.text,
    letterSpacing: '-0.02em',
    lineHeight: '1.2',
  },
  editButton: {
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
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  section: {
    backgroundColor: afisteTheme.colors.surface,
    borderRadius: '10px',
    padding: '40px',
    marginBottom: '28px',
    border: `1px solid ${afisteTheme.colors.border}`,
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: '400',
    marginBottom: '32px',
    color: afisteTheme.colors.text,
    letterSpacing: '-0.01em',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
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
    backgroundColor: afisteTheme.colors.background,
    color: afisteTheme.colors.text,
    fontWeight: '400',
    transition: 'all 0.2s ease',
  },
  inputDisabled: {
    padding: '14px 16px',
    border: `1px solid ${afisteTheme.colors.borderLight}`,
    borderRadius: '6px',
    fontSize: '15px',
    backgroundColor: afisteTheme.colors.background,
    color: afisteTheme.colors.textSecondary,
    fontWeight: '300',
  },
  helpText: {
    fontSize: '0.75rem',
    color: afisteTheme.colors.textSecondary,
    fontWeight: '300',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '14px 28px',
    backgroundColor: 'transparent',
    color: afisteTheme.colors.text,
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
  },
  saveButton: {
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
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '28px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: afisteTheme.colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoValue: {
    fontSize: '15px',
    color: afisteTheme.colors.text,
    fontWeight: '400',
  },
  kycInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  kycItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: afisteTheme.colors.background,
    borderRadius: '8px',
    border: `1px solid ${afisteTheme.colors.borderLight}`,
  },
  kycLabel: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: afisteTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kycValue: {
    fontSize: '18px',
    fontWeight: '500',
    color: afisteTheme.colors.primary,
  },
  kycStatus: {
    fontSize: '15px',
    fontWeight: '500',
  },
  kycButton: {
    padding: '14px 28px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  alertError: {
    maxWidth: '1400px',
    margin: '0 auto 24px',
    padding: '14px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#dc2626',
    borderRadius: '6px',
    border: `1px solid rgba(239, 68, 68, 0.3)`,
    fontSize: '14px',
    fontWeight: '400',
  },
  alertSuccess: {
    maxWidth: '1400px',
    margin: '0 auto 24px',
    padding: '14px 16px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#059669',
    borderRadius: '6px',
    border: `1px solid rgba(16, 185, 129, 0.3)`,
    fontSize: '14px',
    fontWeight: '400',
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
  documentsSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: `1px solid ${afisteTheme.colors.border}`,
  },
  documentsTitle: {
    fontSize: '1.125rem',
    fontWeight: '400',
    color: afisteTheme.colors.text,
    marginBottom: '20px',
    letterSpacing: '-0.01em',
  },
  documentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  documentItem: {
    padding: '20px',
    backgroundColor: afisteTheme.colors.background,
    borderRadius: '8px',
    border: `1px solid ${afisteTheme.colors.borderLight}`,
  },
  documentInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentType: {
    fontSize: '14px',
    fontWeight: '500',
    color: afisteTheme.colors.text,
    textTransform: 'capitalize',
  },
  documentStatus: {
    fontSize: '0.75rem',
    fontWeight: '500',
    letterSpacing: '0.3px',
  },
  rejectionReason: {
    marginTop: '10px',
    fontSize: '0.75rem',
    color: '#dc2626',
    fontWeight: '300',
  },
  uploadSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: `1px solid ${afisteTheme.colors.border}`,
  },
  uploadTitle: {
    fontSize: '1.125rem',
    fontWeight: '400',
    color: afisteTheme.colors.text,
    marginBottom: '20px',
    letterSpacing: '-0.01em',
  },
  uploadForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  select: {
    padding: '14px 16px',
    border: `1px solid ${afisteTheme.colors.border}`,
    borderRadius: '6px',
    fontSize: '15px',
    backgroundColor: afisteTheme.colors.background,
    color: afisteTheme.colors.text,
    fontWeight: '400',
    transition: 'all 0.2s ease',
  },
  uploadButton: {
    padding: '14px 28px',
    backgroundColor: afisteTheme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    alignSelf: 'flex-start',
    transition: 'all 0.25s ease',
    letterSpacing: '0.3px',
  },
};

export default ProfileScreen;

