import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import TopUpPage from './pages/TopUpPage';
import UploadPage from './pages/UploadPage';
import ShareCreditsPage from './pages/ShareCreditsPage';
import GiftPage from './pages/GiftPage';
import DomainsPage from './pages/DomainsPage';
import CalculatorPage from './pages/CalculatorPage';
import ServicesCalculatorPage from './pages/ServicesCalculatorPage';
import BalanceCheckerPage from './pages/BalanceCheckerPage';
import RedeemPage from './pages/RedeemPage';
import { DeveloperPage } from './pages/DeveloperPage';
import GatewayInfoPage from './pages/GatewayInfoPage';
import DeploySitePage from './pages/DeploySitePage';
import { useStore } from './store/useStore';
import { WalletProviders } from './providers/WalletProviders';

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
  const navigate = useNavigate();
  
  // Helper function for pages that need navigation
  const navigateToService = (service?: 'topup' | 'upload' | 'share' | 'gift' | 'domains' | 'calculator' | 'balance-checker' | 'redeem' | 'developer') => {
    if (service) {
      navigate(`/${service}`);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <PaymentCallbackHandler />
      <div className="min-h-screen bg-canvas text-fg-muted flex flex-col">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
          <Header />
          <div className="mb-12">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/topup" element={<TopUpPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/deploy" element={<DeploySitePage />} />
              <Route path="/share" element={<ShareCreditsPage />} />
              <Route path="/gift" element={<GiftPage />} />
              <Route path="/domains" element={<DomainsPage />} />
              <Route path="/calculator" element={<CalculatorPage />} />
              <Route path="/balance-checker" element={<BalanceCheckerPage />} />
              <Route path="/redeem" element={<RedeemPage />} />
              <Route path="/developer" element={<DeveloperPage />} />
              <Route path="/gateway-info" element={<GatewayInfoPage />} />
              {/* Catch all route - redirect to home */}
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </div>
        </div>
        <Footer />
      </div>
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