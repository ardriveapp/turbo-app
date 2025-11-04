import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useAccount } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * Hook that listens for wallet account changes across all supported wallet types
 * and updates the app state accordingly to prevent using the wrong account.
 *
 * This prevents issues like:
 * - Spending User B's credits while User A is logged in
 * - Uploading files with wrong account
 * - Setting ArNS records with wrong signer
 *
 * When an account switch is detected:
 * 1. Updates the address in the store
 * 2. Clears all payment-related state (prevents using wrong account's payment flows)
 * 3. Header component automatically refetches the balance due to address change
 */
export function useWalletAccountListener() {
  const { address, walletType, setAddress, clearAddress, clearAllPaymentState } = useStore();

  // Listen for Ethereum account changes (MetaMask, Privy embedded wallet)
  const { address: ethAddress } = useAccount();

  // Update address if Ethereum account changes
  useEffect(() => {
    if (walletType === 'ethereum' && ethAddress && ethAddress !== address) {
      console.log('[Wallet Listener] Ethereum address changed:', { from: address, to: ethAddress });
      console.warn('[Wallet Listener] IMPORTANT: Wallet account has switched. Clearing payment state to prevent wrong account usage.');

      // Update to new address
      setAddress(ethAddress, 'ethereum');

      // Clear all payment state to prevent using wrong account's payment flows
      clearAllPaymentState();

      // Note: Balance will be automatically refetched by Header component's useEffect
    }
  }, [ethAddress, address, walletType, setAddress, clearAllPaymentState]);

  // Listen for Solana wallet changes
  const { publicKey: solanaPublicKey } = useWallet();

  useEffect(() => {
    if (walletType === 'solana' && solanaPublicKey) {
      const newAddress = solanaPublicKey.toString();
      if (newAddress !== address) {
        console.log('[Wallet Listener] Solana address changed:', { from: address, to: newAddress });
        console.warn('[Wallet Listener] IMPORTANT: Wallet account has switched. Clearing payment state to prevent wrong account usage.');

        // Update to new address
        setAddress(newAddress, 'solana');

        // Clear all payment state to prevent using wrong account's payment flows
        clearAllPaymentState();

        // Note: Balance will be automatically refetched by Header component's useEffect
      }
    }
  }, [solanaPublicKey, address, walletType, setAddress, clearAllPaymentState]);

  // Listen for ArConnect (Wander/ArConnect) wallet switches
  useEffect(() => {
    const handleWalletSwitch = async (event: Event) => {
      console.log('[Wallet Listener] ArConnect walletSwitch event triggered', event);

      // Only process if we're currently connected with an Arweave wallet
      if (walletType === 'arweave' && window.arweaveWallet) {
        try {
          const newAddress = await window.arweaveWallet.getActiveAddress();

          if (newAddress && newAddress !== address) {
            console.log('[Wallet Listener] ArConnect address changed:', { from: address, to: newAddress });
            console.warn('[Wallet Listener] IMPORTANT: Wallet account has switched. Clearing payment state to prevent wrong account usage.');

            // Update to new address
            setAddress(newAddress, 'arweave');

            // Clear all payment state to prevent using wrong account's payment flows
            clearAllPaymentState();

            // Note: Balance will be automatically refetched by Header component's useEffect
          }
        } catch (error) {
          console.error('[Wallet Listener] Error fetching new Arweave address:', error);
          // If we can't get the new address, clear the connection to be safe
          clearAddress();
        }
      }
    };

    // Add the event listener
    window.addEventListener('walletSwitch', handleWalletSwitch);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('walletSwitch', handleWalletSwitch);
    };
  }, [address, walletType, setAddress, clearAddress, clearAllPaymentState]);

  // Wagmi already handles Ethereum account changes through its internal listeners,
  // but we also manually listen to window.ethereum.on('accountsChanged') for additional coverage
  // This catches cases where wagmi might not detect the change (e.g., direct MetaMask interactions)
  useEffect(() => {
    if (walletType !== 'ethereum') return;

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('[Wallet Listener] MetaMask accountsChanged event:', accounts);

      if (accounts.length === 0) {
        // User disconnected their wallet
        console.log('[Wallet Listener] User disconnected MetaMask');
        clearAddress();
      } else if (accounts[0] !== address) {
        // Account switched - but wagmi useAccount should have already handled this
        // This is a backup in case wagmi missed it
        console.log('[Wallet Listener] MetaMask backup listener detected account change:', { from: address, to: accounts[0] });
        console.warn('[Wallet Listener] IMPORTANT: Wallet account has switched. Clearing payment state to prevent wrong account usage.');

        // Update to new address
        setAddress(accounts[0], 'ethereum');

        // Clear all payment state to prevent using wrong account's payment flows
        clearAllPaymentState();

        // Note: Balance will be automatically refetched by Header component's useEffect
      }
    };

    // Check if ethereum provider exists
    if (window.ethereum?.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [address, walletType, setAddress, clearAddress, clearAllPaymentState]);
}
