// Afiste Design System Theme - Coinbase Style

export const afisteTheme = {
  colors: {
    primary: '#1d7eff',       // Afiste blue
    primaryLight: '#1d7eff',
    primaryDark: '#1565e0',  // Darker blue for hover states
    secondary: '#00D4AA',    // Coinbase green (gains/buy)
    secondaryLight: '#00D4AA',
    secondaryDark: '#00A882',
    accent: '#F94C53',        // Coinbase red (losses/sell)
    accentLight: '#F94C53',
    accentDark: '#D32F2F',
    background: '#FFFFFF',    // White background (Coinbase style)
    backgroundDark: '#F8F9FA',
    backgroundLight: '#FAFBFC',
    surface: '#FFFFFF',       // White surface
    surfaceLight: '#F8F9FA',
    surfaceDark: '#F0F2F5',
    text: '#0D1421',         // Dark text (Coinbase dark)
    textSecondary: '#5E6673',
    textLight: '#8A94A6',
    textDark: '#0D1421',
    border: '#E4E7EB',       // Light border
    borderLight: '#F0F2F5',
    borderDark: '#D1D5DB',
    success: '#00D4AA',      // Green for gains
    warning: '#F59E0B',
    error: '#F94C53',        // Red for losses
    info: '#1d7eff',
    buy: '#00D4AA',           // Buy color
    sell: '#F94C53',          // Sell color
    chartUp: '#00D4AA',
    chartDown: '#F94C53',
  },
  fonts: {
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'Menlo, Monaco, "Courier New", monospace',
  },
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
  },
  borderRadius: {
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    glow: '0 0 0 1px rgba(29, 126, 255, 0.1)',
    glowGreen: '0 0 0 1px rgba(0, 212, 170, 0.1)',
    glowRed: '0 0 0 1px rgba(249, 76, 83, 0.1)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  riskLevels: {
    low: {
      color: '#00D4AA',
      bg: '#E6F9F5',
      text: 'Low Risk',
    },
    medium: {
      color: '#F59E0B',
      bg: '#FEF3C7',
      text: 'Medium Risk',
    },
    high: {
      color: '#F94C53',
      bg: '#FEE2E2',
      text: 'High Risk',
    },
  },
  statusColors: {
    active: {
      color: '#00D4AA',
      bg: '#E6F9F5',
    },
    closed: {
      color: '#5E6673',
      bg: '#F0F2F5',
    },
    liquidated: {
      color: '#F94C53',
      bg: '#FEE2E2',
    },
  },
};

export type AfisteTheme = typeof afisteTheme;

