import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ExternalLink, Coins, Calculator, RefreshCw, Wallet, CreditCard, Upload, Share2, Gift, Globe, Code, Search, Ticket, Grid3x3, Info, Zap, User, Lock } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TurboFactory, ArconnectSigner } from '@ardrive/turbo-sdk/web';
import CopyButton from './CopyButton';
import { useStore } from '../store/useStore';
import { formatWalletAddress } from '../utils';
import TurboLogo from './TurboLogo';
import WalletSelectionModal from './modals/WalletSelectionModal';
import { usePrimaryArNSName } from '../hooks/usePrimaryArNSName';
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
  { name: 'Check Balance', page: 'balances' as const, icon: Search },
  { name: 'Redeem Gift', page: 'redeem' as const, icon: Ticket },
  { name: 'Service Info', page: 'gateway-info' as const, icon: Info },
];

// Service theme color mapping
const getServiceActiveColor = (page: string): string => {
  switch (page) {
    // Credit services -> Black/White theme
    case 'topup':
    case 'share':
    case 'gift':
    case 'balances':
    case 'redeem':
    case 'calculator':
      return 'text-fg-muted';
    
    // Upload/Deployment services -> Red theme
    case 'upload':
    case 'deploy':
      return 'text-turbo-red';
    
    // ArNS services -> Yellow theme
    case 'domains':
      return 'text-turbo-yellow';
    
    // Developer/Info services -> Purple theme
    case 'developer':
    case 'gateway-info':
      return 'text-turbo-purple';
    
    // Default fallback
    default:
      return 'text-turbo-red';
  }
};

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { address, walletType, clearAddress, clearAllPaymentState, setCreditBalance, configMode } = useStore();
  const turboConfig = useTurboConfig();
  // Only check ArNS for Arweave/Ethereum wallets - Solana can't own ArNS names
  const { arnsName, profile, loading: loadingArNS } = usePrimaryArNSName(walletType !== 'solana' ? address : null);
  
  const [credits, setCredits] = useState<string>('0');
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletModalMessage, setWalletModalMessage] = useState('');
  
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
    <div className="flex items-center py-2 sm:py-3">
      <Link to="/" className="cursor-pointer ml-2 sm:ml-0">
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
          
          <PopoverPanel className="absolute right-1 sm:right-0 mt-2 w-56 sm:w-64 overflow-auto rounded-lg bg-canvas border border-default shadow-lg z-50 py-1">
            {({ close }) => (
              <>
                {/* Services - Always show, but require login */}
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-link uppercase tracking-wider">Services</span>
                  {!address && (
                    <span className="text-xs text-link/60 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Login Required
                    </span>
                  )}
                </div>
                {accountServices.map((service) => {
                  const isActive = location.pathname === `/${service.page}`;
                  
                  // If not logged in, handle click differently
                  if (!address) {
                    return (
                      <button
                        key={service.page}
                        onClick={() => {
                          close();
                          setWalletModalMessage(`Connect your wallet to ${service.name.toLowerCase()}`);
                          setShowWalletModal(true);
                        }}
                        className="w-full flex items-center gap-3 py-2 px-4 text-sm text-link/60 hover:bg-canvas hover:text-fg-muted transition-colors group"
                      >
                        <service.icon className="w-4 h-4 text-link/60 group-hover:text-link" />
                        <span className="flex-1 text-left">{service.name}</span>
                        <Lock className="w-3 h-3 text-link/40" />
                      </button>
                    );
                  }
                  
                  // Normal link for logged-in users
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
                        isActive ? getServiceActiveColor(service.page) : 'text-link'
                      }`} />
                      {service.name}
                    </Link>
                  );
                })}
                <div className="border-t border-default my-1" />
                
                {/* Public Tools */}
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
                        isActive ? getServiceActiveColor(service.page) : 'text-link'
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
          <PopoverButton className="flex items-center gap-2 rounded border border-default px-2 py-1.5 font-semibold hover:bg-canvas hover:border-fg-muted/50 transition-colors">
            {/* Profile Image or Wallet Type Indicator */}
            {profile.logo ? (
              <div className="size-8 rounded-full overflow-hidden bg-canvas border border-default/50 flex items-center justify-center">
                <img 
                  src={profile.logo} 
                  alt={`${profile.name} logo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Hide the image and show the fallback
                    const target = e.target as HTMLImageElement;
                    const container = target.parentElement;
                    if (container) {
                      target.style.display = 'none';
                      const fallback = container.querySelector('.fallback-indicator') as HTMLElement;
                      if (fallback) {
                        fallback.style.display = 'block';
                      }
                    }
                  }}
                />
                <div className={`fallback-indicator hidden size-2 rounded-full ${
                  walletType === 'arweave' ? 'bg-white' :
                  walletType === 'ethereum' ? 'bg-blue-400' :
                  walletType === 'solana' ? 'bg-purple-400' :
                  'bg-green-500'
                }`} />
              </div>
            ) : (
              <div className={`size-2 rounded-full ${
                walletType === 'arweave' ? 'bg-white' :
                walletType === 'ethereum' ? 'bg-blue-400' :
                walletType === 'solana' ? 'bg-purple-400' :
                'bg-green-500'
              }`} />
            )}
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

          <PopoverPanel className="absolute right-1 sm:right-0 mt-4 flex flex-col rounded-lg bg-canvas text-left text-sm text-fg-muted shadow-lg border border-default min-w-[280px] z-50">
            {({ close }) => (
              <>
            {/* Account Info Section */}
            <div className="px-6 py-4 border-b border-default">
              <div className="text-xs text-link mb-2">
                {walletType === 'arweave' && 'Arweave Account'}
                {walletType === 'ethereum' && 'Ethereum Account'}
                {walletType === 'solana' && 'Solana Account'}
              </div>
              <div className="flex items-center justify-between">
                <div className="font-bold text-base">
                  {formatWalletAddress(address, 6)}
                </div>
                <CopyButton textToCopy={address} />
              </div>
            </div>
            
            {/* Credit Balance Section - Display Only */}
            <div className="px-6 py-4 border-b border-default">
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
                    className="p-1 rounded hover:bg-canvas transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isRefreshing ? 'Refreshing...' : 'Refresh balance'}
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'text-turbo-red animate-spin' : 'text-link hover:text-fg-muted'}`} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <button
              className="flex items-center gap-2 px-6 py-3 text-link hover:text-fg-muted hover:bg-canvas transition-colors"
              onClick={() => {
                navigate('/account');
                close(); // Close the popover when navigating
              }}
            >
              <User className="w-4 h-4" />
              My Account
            </button>
            
            <button
              className="flex items-center gap-2 px-6 py-3 text-link hover:text-fg-muted hover:bg-canvas transition-colors"
              onClick={() => {
                let explorerUrl = '';
                
                if (walletType === 'ethereum') {
                  explorerUrl = `https://etherscan.io/address/${address}`;
                } else if (walletType === 'solana') {
                  explorerUrl = `https://explorer.solana.com/address/${address}`;
                } else {
                  // Default to Arweave
                  explorerUrl = `https://viewblock.io/arweave/address/${address}`;
                }
                
                window.open(explorerUrl, '_blank');
              }}
            >
              <ExternalLink className="w-4 h-4" />
              View on Explorer
            </button>
            
            <button
              className="px-6 py-3 font-semibold text-red-400 hover:bg-canvas hover:text-red-300 border-t border-default transition-colors"
              onClick={async () => {
                try {
                  // Disconnect from the actual wallet extension based on wallet type
                  if (walletType === 'arweave' && window.arweaveWallet) {
                    await window.arweaveWallet.disconnect();
                    console.log('Disconnected from Wander wallet');
                  } else if (walletType === 'ethereum') {
                    // For Ethereum wallets, we should clear the connection
                    // Note: MetaMask doesn't have a direct disconnect method
                    // The connection is managed by wagmi
                    console.log('Clearing Ethereum wallet connection');
                  } else if (walletType === 'solana' && window.solana) {
                    // Properly disconnect Solana wallet to prevent conflicts
                    try {
                      if (window.solana.isConnected) {
                        await window.solana.disconnect();
                        console.log('Disconnected from Solana wallet');
                      }
                    } catch (solanaError) {
                      console.log('Solana wallet disconnect failed:', solanaError);
                    }
                  }
                } catch (disconnectError) {
                  console.log('Error disconnecting from wallet extension:', disconnectError);
                }
                
                // Always clear our app state
                clearAllPaymentState();
                clearAddress();
              }}
            >
              Disconnect
            </button>
              </>
            )}
          </PopoverPanel>
        </Popover>
      )}
      
      {/* Connect Wallet Button for non-logged-in users */}
      {!address && (
        <button
          onClick={() => {
            setWalletModalMessage('');
            setShowWalletModal(true);
          }}
          className="flex items-center gap-2 bg-fg-muted text-black px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-fg-muted/90 transition-colors mr-2 sm:mr-0"
        >
          <Wallet className="w-4 h-4" />
          Connect
        </button>
      )}
      
      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <WalletSelectionModal
          onClose={() => {
            setShowWalletModal(false);
            setWalletModalMessage('');
          }}
          message={walletModalMessage}
        />
      )}
    </div>
  );
};

export default Header;