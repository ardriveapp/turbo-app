import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useFreeUploadLimit } from './hooks/useFreeUploadLimit';
import { useTheme } from './hooks/useTheme';
import LandingPage from './pages/LandingPage';
import TopUpPage from './pages/TopUpPage';
import UploadPage from './pages/UploadPage';
import CapturePage from './pages/CapturePage';
import ShareCreditsPage from './pages/ShareCreditsPage';
import GiftPage from './pages/GiftPage';
import DomainsPage from './pages/DomainsPage';
import CalculatorPage from './pages/CalculatorPage';
import ServicesCalculatorPage from './pages/ServicesCalculatorPage';
import BalanceCheckerPage from './pages/BalanceCheckerPage';
import RedeemPage from './pages/RedeemPage';
import GatewayInfoPage from './pages/GatewayInfoPage';
import DeploySitePage from './pages/DeploySitePage';
import RecentDeploymentsPage from './pages/RecentDeploymentsPage';
import AccountPage from './pages/AccountPage';
import TryItNowPage from './pages/TryItNowPage';
import { useStore } from './store/useStore';
import { WalletProviders } from './providers/WalletProviders';
import { useWalletAccountListener } from './hooks/useWalletAccountListener';

// Payment callback handler component
function PaymentCallbackHandler() {
  const { address } = useStore();
  const location = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      // Show success message and refresh balance
      if (address) {
        alert('Payment successful! Your credits have been added to your account.');
        // Trigger a balance refresh by dispatching a custom event
        window.dispatchEvent(new CustomEvent('refresh-balance'));
      }
    } else if (paymentStatus === 'cancelled') {
      alert('Payment cancelled.');
    }
  }, [location.search, address]);

  return null;
}

function AppRoutes() {
  // Listen for wallet account changes across all wallet types
  useWalletAccountListener();

  // Initialize bundler's free upload limit on app startup
  useFreeUploadLimit();

  // Apply theme class to document based on user preference
  useTheme();

  return (
    <>
      <PaymentCallbackHandler />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={<LandingPage />} />
          <Route path="topup" element={<TopUpPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="capture" element={<CapturePage />} />
          <Route path="deploy" element={<DeploySitePage />} />
          <Route path="deployments" element={<RecentDeploymentsPage />} />
          <Route path="share" element={<ShareCreditsPage />} />
          <Route path="gift" element={<GiftPage />} />
          <Route path="domains" element={<DomainsPage />} />
          <Route path="calculator" element={<CalculatorPage />} />
          <Route path="services-calculator" element={<ServicesCalculatorPage />} />
          <Route path="balances" element={<BalanceCheckerPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="redeem" element={<RedeemPage />} />
          <Route path="settings" element={<GatewayInfoPage />} />
          <Route path="try" element={<TryItNowPage />} />
          {/* Catch all route - redirect to home */}
          <Route path="*" element={<LandingPage />} />
        </Route>
      </Routes>
    </>
  );
}

export function App() {
  return (
    <WalletProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </WalletProviders>
  );
}