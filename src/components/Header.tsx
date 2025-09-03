import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ExternalLink, Coins, Calculator, RefreshCw, Wallet, CreditCard, Upload, Share2, Gift, Globe, Code, Search, Ticket, Grid3x3, Info, Zap } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TurboFactory, ArconnectSigner } from '@ardrive/turbo-sdk/web';
import CopyButton from './CopyButton';
import { useStore } from '../store/useStore';
import { formatWalletAddress } from '../utils';
import TurboLogo from './TurboLogo';
import WalletSelectionModal from './modals/WalletSelectionModal';
import { useArNSName } from '../hooks/useArNSName';
import { useNavigate } from 'react-router-dom';
import { useTurboConfig } from '../hooks/useTurboConfig';

// Services for logged-in users
const accountServices = [
  { name: 'Buy Credits', page: 'topup' as const, icon: CreditCard },
  { name: 'Upload Files', page: 'upload' as const, icon: Upload },
  { name: 'Deploy Site', page: 'deploy' as const, icon: Zap },
  { name: 'Share Credits', page: 'share' as const, icon: Share2 },
  { name: 'Send Gift', page: 'gift' as const, icon: Gift },
];

// Public utility services  
const utilityServices = [
  { name: 'Search Domains', page: 'domains' as const, icon: Globe },
  { name: 'Developer Resources', page: 'developer' as const, icon: Code },
  { name: 'Pricing Calculator', page: 'calculator' as const, icon: Calculator },
  { name: 'Check Balance', page: 'balance-checker' as const, icon: Search },
  { name: 'Redeem Gift', page: 'redeem' as const, icon: Ticket },
  { name: 'Service Info', page: 'gateway-info' as const, icon: Info },
];

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { address, walletType, clearAddress, clearAllPaymentState, setCreditBalance, configMode } = useStore();
  const turboConfig = useTurboConfig();
  // Only check ArNS for Arweave/Ethereum wallets - Solana can't own ArNS names
  const { arnsName, loading: loadingArNS } = useArNSName(walletType !== 'solana' ? address : null);
  
  const [credits, setCredits] = useState<string>('0');
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // Fetch actual credit balance from Turbo API
  const fetchBalance = useCallback(async () => {
    if (!address) {
      setCredits('0');
      return;
    }
    
    setLoadingBalance(true);
    try {
      // For balance checking, let the SDK handle address conversion
      // Use authenticated client when possible for better address handling
      let turbo;
      let addressToUse = address;
      
      try {
        // Try to create authenticated client which handles native address conversion
        if (walletType === 'arweave' && window.arweaveWallet) {
          const signer = new ArconnectSigner(window.arweaveWallet);
          turbo = TurboFactory.authenticated({ ...turboConfig, signer });
          addressToUse = address;
        } else {
          // Fallback to unauthenticated client
          turbo = TurboFactory.unauthenticated(turboConfig);
          addressToUse = address;
        }
      } catch {
        // If authentication fails, use unauthenticated
        turbo = TurboFactory.unauthenticated(turboConfig);
        addressToUse = address;
      }
      
      const balance = await turbo.getBalance(addressToUse);
      
      // Convert winc to credits and format with smart precision
      const creditsAmount = Number(balance.winc) / 1e12;
      setCreditBalance(creditsAmount);
      
      // Smart formatting for different credit amounts
      let formattedCredits;
      if (creditsAmount >= 1) {
        // Normal amounts: show 2 decimal places
        formattedCredits = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(creditsAmount);
      } else if (creditsAmount > 0) {
        // Small amounts: show more decimals to avoid showing 0
        formattedCredits = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 3,
          maximumFractionDigits: 6,
        }).format(creditsAmount);
      } else {
        formattedCredits = '0';
      }
      
      setCredits(formattedCredits);
    } catch (error) {
      // Balance fetch failed
      if (error instanceof Error && error.message.includes('Invalid')) {
        // Address format may not be supported for balance checking
        setCredits('0');
      } else {
        setCredits('---');
      }
    } finally {
      setLoadingBalance(false);
      setIsRefreshing(false);
    }
  }, [address, walletType, setCreditBalance, turboConfig]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Refresh balance when configuration changes
  useEffect(() => {
    if (address) {
      fetchBalance();
    }
  }, [configMode, address, fetchBalance]);

  // Listen for balance refresh events from payment success
  useEffect(() => {
    const handleRefreshBalance = () => {
      fetchBalance();
    };

    window.addEventListener('refresh-balance', handleRefreshBalance);
    return () => window.removeEventListener('refresh-balance', handleRefreshBalance);
  }, [fetchBalance]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBalance();
  };

  return (
    <div className="flex items-center py-3 sm:py-4">
      <Link to="/" className="cursor-pointer">
        <TurboLogo />
      </Link>
      
      {/* Dev Mode Indicator */}
      {configMode !== 'production' && (
        <div className="ml-4 flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <span className="text-xs text-amber-400 font-medium uppercase">
            {configMode} MODE
          </span>
        </div>
      )}
      
      <div className="grow" />
      
      {/* Clean Services Waffle Popover */}
      <div className="mr-3">
        <Popover className="relative">
          <PopoverButton className="flex items-center p-3 text-link hover:text-fg-muted transition-colors focus:outline-none" title="All Services">
            <Grid3x3 className="w-6 h-6" />
          </PopoverButton>
          
          <PopoverPanel className="absolute right-0 mt-2 w-56 sm:w-64 overflow-auto rounded-lg bg-surface border border-default shadow-lg z-50 py-1">
            {({ close }) => (
              <>
                {/* Services (only if logged in) */}
                {address && (
                  <>
                    <div className="px-4 py-2 text-xs font-medium text-link uppercase tracking-wider">Services</div>
                    {accountServices.map((service) => {
                      const isActive = location.pathname === `/${service.page}`;
                      return (
                        <Link
                          key={service.page}
                          to={`/${service.page}`}
                          onClick={() => close()}
                          className={`flex items-center gap-3 py-2 px-4 text-sm transition-colors ${
                            isActive 
                              ? 'bg-canvas text-fg-muted font-medium' 
                              : 'text-link hover:bg-canvas hover:text-fg-muted'
                          }`}
                        >
                          <service.icon className={`w-4 h-4 ${
                            isActive ? 'text-turbo-red' : 'text-link'
                          }`} />
                          {service.name}
                        </Link>
                      );
                    })}
                    <div className="border-t border-default my-1" />
                  </>
                )}
                
                {/* Public Services */}
                <div className="px-4 py-2 text-xs font-medium text-link uppercase tracking-wider">Tools</div>
                {utilityServices.map((service) => {
                  const isActive = location.pathname === `/${service.page}`;
                  return (
                    <Link
                      key={service.page}
                      to={`/${service.page}`}
                      onClick={() => close()}
                      className={`flex items-center gap-3 py-2 px-4 text-sm transition-colors ${
                        isActive 
                          ? 'bg-canvas text-fg-muted font-medium' 
                          : 'text-link hover:bg-canvas hover:text-fg-muted'
                      }`}
                    >
                      <service.icon className={`w-4 h-4 ${
                        isActive ? 'text-turbo-red' : 'text-link'
                      }`} />
                      {service.name}
                    </Link>
                  );
                })}
              </>
            )}
          </PopoverPanel>
        </Popover>
      </div>

      {/* Profile Dropdown - only for logged in users */}
      {address && (
        <Popover className="relative">
          <PopoverButton className="flex items-center gap-3 rounded border border-default px-3 py-2 font-semibold hover:bg-surface/50 transition-colors">
            <div className={`size-2 rounded-full ${
              walletType === 'arweave' ? 'bg-white' :
              walletType === 'ethereum' ? 'bg-blue-400' :
              walletType === 'solana' ? 'bg-purple-400' :
              'bg-green-500'
            }`} />
            <div className="text-fg-muted">
              {loadingArNS ? (
                <span className="text-link">Loading...</span>
              ) : arnsName ? (
                <span className="font-medium">{arnsName}</span>
              ) : (
                formatWalletAddress(address)
              )}
            </div>
          </PopoverButton>

          <PopoverPanel className="absolute right-0 mt-4 flex flex-col rounded-lg bg-surface text-left text-sm text-fg-muted shadow-lg border border-default min-w-[280px] z-50">
            {/* Account Info Section */}
            <div className="px-6 py-4 border-b border-default">
              <div className="text-xs text-link mb-1">Account</div>
              {arnsName && (
                <div className="font-bold text-base mb-1 text-turbo-red">{arnsName}</div>
              )}
              <div className="flex items-center justify-between">
                <div className={arnsName ? "text-sm text-link" : "font-bold text-base"}>
                  {formatWalletAddress(address, 8)}
                </div>
                <CopyButton textToCopy={address} />
              </div>
            </div>
            
            {/* Credit Balance Section - Clickable */}
            <button
              className="w-full px-6 py-4 border-b border-default hover:bg-canvas transition-colors text-left"
              onClick={() => {
                // Navigate to balance checker with current address
                navigate('/balance-checker');
                // Pre-fill the address in balance checker if possible
                window.localStorage.setItem('balance-checker-address', address);
              }}
              title="View detailed balance breakdown"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-fg-muted" />
                  <span className="text-xs text-link">Credits</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-bold text-lg text-fg-muted">
                    {loadingBalance || isRefreshing ? '...' : credits}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the parent click
                      handleRefresh();
                    }}
                    disabled={isRefreshing || loadingBalance}
                    className="p-1 rounded hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isRefreshing ? 'Refreshing...' : 'Refresh balance'}
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'text-turbo-red animate-spin' : 'text-link hover:text-fg-muted'}`} />
                  </button>
                </div>
              </div>
            </button>
            
            {/* Actions */}
            <button
              className="flex items-center gap-2 px-6 py-3 text-link hover:text-fg-muted hover:bg-canvas transition-colors"
              onClick={() => {
                console.log('Explorer click - walletType:', walletType, 'address:', address);
                let explorerUrl = '';
                
                if (walletType === 'ethereum') {
                  explorerUrl = `https://etherscan.io/address/${address}`;
                } else if (walletType === 'solana') {
                  explorerUrl = `https://explorer.solana.com/address/${address}`;
                } else {
                  // Default to Arweave
                  explorerUrl = `https://viewblock.io/arweave/address/${address}`;
                }
                
                console.log('Using explorer URL:', explorerUrl);
                window.open(explorerUrl, '_blank');
              }}
            >
              <ExternalLink className="w-4 h-4" />
              View on Explorer
            </button>
            
            <button
              className="px-6 py-3 font-semibold text-red-400 hover:bg-canvas border-t border-default transition-colors"
              onClick={async () => {
                try {
                  // Disconnect from the actual wallet extension based on wallet type
                  if (walletType === 'arweave' && window.arweaveWallet) {
                    await window.arweaveWallet.disconnect();
                    // Disconnected from Wander wallet
                  } else if (walletType === 'ethereum' && window.ethereum) {
                    // Ethereum wallet cleared from app state
                  } else if (walletType === 'solana') {
                    // Solana wallet cleared from app state
                  }
                } catch {
                  // Error disconnecting from wallet extension
                }
                
                // Always clear our app state
                clearAllPaymentState();
                clearAddress();
              }}
            >
              Disconnect
            </button>
          </PopoverPanel>
        </Popover>
      )}
      
      {/* Connect Wallet Button for non-logged-in users */}
      {!address && (
        <button
          onClick={() => setShowWalletModal(true)}
          className="flex items-center gap-2 bg-turbo-red text-white px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-turbo-red/90 transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Connect
        </button>
      )}
      
      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <WalletSelectionModal
          onClose={() => setShowWalletModal(false)}
          message={''}
        />
      )}
    </div>
  );
};

export default Header;