import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header/Header';
import LandingScreen from './screens/LandingScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { MarketplaceScreen } from './screens/MarketplaceScreen';
import { VCFundDetailScreen } from './screens/VCFundDetailScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import WalletScreen from './screens/WalletScreen';
import ProfileScreen from './screens/ProfileScreen';
import TradingScreen from './screens/TradingScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';
import TokenOfferingScreen from './screens/TokenOfferingScreen';
import PaymentScreen from './screens/PaymentScreen';
import BlockchainExplorerScreen from './screens/BlockchainExplorerScreen/BlockchainExplorerScreen';
import './App.css';

// Update page title based on route
const PageTitle: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = 'Afiste - Venture Capital Tokenizado';

    switch (path) {
      case '/':
        title = 'Afiste - Venture Capital Tokenizado';
        break;
      case '/login':
        title = 'Iniciar Sesión - Afiste';
        break;
      case '/register':
        title = 'Crear Cuenta - Afiste';
        break;
      case '/marketplace':
        title = 'Marketplace - Afiste';
        break;
      case '/dashboard':
        title = 'Dashboard - Afiste';
        break;
      case '/wallet':
        title = 'Mi Wallet - Afiste';
        break;
      case '/payments':
        title = 'Pagos - Afiste';
        break;
      case '/profile':
        title = 'Mi Perfil - Afiste';
        break;
      case '/admin':
        title = 'Panel de Administración - Afiste';
        break;
      case '/blockchain':
        title = 'Blockchain Explorer - Afiste';
        break;
      default:
        if (path.startsWith('/funds/')) {
          title = 'Detalles del Fondo - Afiste';
        } else if (path.startsWith('/offerings/')) {
          title = 'Token Offering - Afiste';
        } else if (path.startsWith('/trading/')) {
          title = 'Trading - Afiste';
        }
        break;
    }

    document.title = title;
  }, [location]);

  return null;
};

function App() {
  return (
    <Router>
      <PageTitle />
      <Header />
      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/marketplace" element={<MarketplaceScreen />} />
        <Route path="/funds/:id" element={<VCFundDetailScreen />} />
        <Route path="/offerings/:id" element={<TokenOfferingScreen />} />
        <Route path="/trading/:market" element={<TradingScreen />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/wallet" element={<WalletScreen />} />
        <Route path="/payments" element={<PaymentScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/admin" element={<AdminPanelScreen />} />
        <Route path="/blockchain" element={<BlockchainExplorerScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
