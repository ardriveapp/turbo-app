import { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import TopUpPage from './pages/TopUpPage';
import UploadPage from './pages/UploadPage';
import ShareCreditsPage from './pages/ShareCreditsPage';
import GiftPage from './pages/GiftPage';
import DomainsPage from './pages/DomainsPage';
import CalculatorPage from './pages/CalculatorPage';
import BalanceCheckerPage from './pages/BalanceCheckerPage';
import RedeemPage from './pages/RedeemPage';
import { DeveloperPage } from './pages/DeveloperPage';
import GatewayInfoPage from './pages/GatewayInfoPage';
// import DeploySitePage from './pages/DeploySitePage';
import { useStore } from './store/useStore';
import { WalletProviders } from './providers/WalletProviders';

type PageType = 'home' | 'topup' | 'upload' | 'deploy' | 'share' | 'gift' | 'domains' | 'calculator' | 'balance-checker' | 'redeem' | 'developer' | 'gateway-info';

export function App() {
  const { address } = useStore();
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  // No more selectedFeature state needed
  const loggedIn = address !== null;

  // Handle URL parameters for navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const pageParam = urlParams.get('page');
    
    if (paymentStatus === 'success') {
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname);
      
      // Show success message and refresh balance
      if (loggedIn) {
        alert('Payment successful! Your credits have been added to your account.');
        // Trigger a balance refresh by dispatching a custom event
        window.dispatchEvent(new CustomEvent('refresh-balance'));
      }
    } else if (paymentStatus === 'cancelled') {
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname);
      alert('Payment cancelled.');
    } else if (pageParam === 'redeem') {
      // Navigate to redeem page
      setCurrentPage('redeem');
      // Clear URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    } else if (pageParam === 'balance-checker') {
      // Navigate to balance checker page
      setCurrentPage('balance-checker');
      // Clear URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loggedIn]);

  // Helper function to navigate to specific service pages
  const navigateToService = (service?: 'topup' | 'upload' | 'share' | 'gift' | 'domains' | 'calculator' | 'balance-checker' | 'redeem' | 'developer') => {
    if (service) {
      setCurrentPage(service);
    } else {
      setCurrentPage('home');
    }
  };

  // Simple routing - you could also use React Router for this
  const renderPage = () => {
    if (currentPage === 'topup') {
      return <TopUpPage />;
    }
    
    if (currentPage === 'upload') {
      return <UploadPage />;
    }
    
    if (currentPage === 'deploy') {
      return <div className="text-center py-12"><p>Deploy Site feature temporarily disabled</p></div>;
    }
    
    if (currentPage === 'share') {
      return <ShareCreditsPage />;
    }
    
    if (currentPage === 'gift') {
      return <GiftPage />;
    }
    
    if (currentPage === 'domains') {
      return <DomainsPage />;
    }
    
    if (currentPage === 'calculator') {
      return <CalculatorPage navigateToService={navigateToService} />;
    }
    
    if (currentPage === 'balance-checker') {
      return <BalanceCheckerPage />;
    }
    
    if (currentPage === 'redeem') {
      return <RedeemPage />;
    }
    
    if (currentPage === 'developer') {
      return <DeveloperPage />;
    }
    
    if (currentPage === 'gateway-info') {
      return <GatewayInfoPage />;
    }
    
    return <LandingPage setCurrentPage={handleSetPage} loggedIn={loggedIn} />;
  };

  
  // Helper for Header to set page  
  const handleSetPage = (page: PageType) => {
    setCurrentPage(page);
  };

  return (
    <WalletProviders>
      <div className="min-h-screen bg-canvas text-fg-muted flex flex-col">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
          <Header 
            currentPage={currentPage} 
            setCurrentPage={handleSetPage}
          />
          <div className="mb-12">
            {renderPage()}
          </div>
        </div>
        <Footer />
      </div>
    </WalletProviders>
  );
}