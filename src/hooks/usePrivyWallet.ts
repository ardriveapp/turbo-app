import { useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useStore } from '../store/useStore';

export function usePrivyWallet() {
  const { user, authenticated, ready, logout } = usePrivy();
  const { wallets } = useWallets();
  const { setAddress, clearAddress, walletType } = useStore();

  // Find the Privy embedded wallet
  const privyWallet = wallets.find(
    (wallet) => wallet.walletClientType === 'privy'
  );

  // Update store when Privy wallet is connected
  useEffect(() => {
    if (authenticated && privyWallet && walletType !== 'ethereum') {
      // Set the address in the store when Privy wallet is available
      setAddress(privyWallet.address, 'ethereum');
    }
  }, [authenticated, privyWallet, setAddress, walletType]);

  // Handle logout
  const handlePrivyLogout = async () => {
    await logout();
    clearAddress();
  };

  return {
    isPrivyUser: authenticated && !!privyWallet,
    privyWallet,
    privyLogout: handlePrivyLogout,
    privyReady: ready,
    user,
  };
}