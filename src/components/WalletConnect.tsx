import { useState } from 'react';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function WalletConnect() {
  const { address, setAddress, clearAddress } = useStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const connectWallet = async () => {
    try {
      // Check for Wander
      if (window.arweaveWallet) {
        await window.arweaveWallet.connect([
          'ACCESS_ADDRESS',
          'SIGN_TRANSACTION',
          'ACCESS_PUBLIC_KEY',
        ]);
        const addr = await window.arweaveWallet.getActiveAddress();
        setAddress(addr, 'arweave');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnectWallet = () => {
    clearAddress();
    setIsDropdownOpen(false);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!address) {
    return (
      <button
        onClick={connectWallet}
        className="btn-primary flex items-center gap-2"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="btn-outline flex items-center gap-2"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        {formatAddress(address)}
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 card p-2">
          <button
            onClick={disconnectWallet}
            className="w-full text-left px-3 py-2 rounded hover:bg-muted/10 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}