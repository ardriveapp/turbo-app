import { useState, useEffect } from 'react';
import { useConnect, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { usePrivy, useLogin, useWallets, useCreateWallet } from '@privy-io/react-auth';
import BaseModal from './BaseModal';
import BlockingMessageModal from './BlockingMessageModal';
import { useStore } from '../../store/useStore';
import { Mail } from 'lucide-react';

const WalletSelectionModal = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const { setAddress } = useStore();
  const [connectingWallet, setConnectingWallet] = useState<string>();
  const [intentionalSolanaConnect, setIntentionalSolanaConnect] = useState(false);
  const [waitingForPrivyWallet, setWaitingForPrivyWallet] = useState(false);

  // Privy hooks for email login
  const { authenticated } = usePrivy();
  const { wallets: privyWallets } = useWallets();
  const { createWallet } = useCreateWallet();

  const { login } = useLogin({
    onComplete: async ({ user }) => {
      // Check if user already has a wallet in linkedAccounts
      const existingWallet = user?.linkedAccounts?.find(
        account => account.type === 'wallet'
      );

      if (existingWallet) {
        setAddress(existingWallet.address, 'ethereum');
        setConnectingWallet(undefined);
        onClose();
      } else {
        // No wallet exists, need to create one
        setConnectingWallet('Creating your wallet...');

        try {
          // Create an embedded wallet for the user
          const newWallet = await createWallet();

          if (newWallet) {
            setAddress(newWallet.address, 'ethereum');
            setConnectingWallet(undefined);
            onClose();
          } else {
            // If wallet creation didn't return immediately, wait for it
            setWaitingForPrivyWallet(true);
            setConnectingWallet('Setting up your wallet...');
          }
        } catch {
          setConnectingWallet(undefined);
          setWaitingForPrivyWallet(false);
        }
      }
    },
    onError: () => {
      setConnectingWallet(undefined);
      setWaitingForPrivyWallet(false);
    }
  });

  // Watch for Privy wallet to become available after login
  useEffect(() => {
    if (waitingForPrivyWallet && privyWallets && privyWallets.length > 0) {
      // Look for any embedded wallet, not just 'privy' type
      const privyWallet = privyWallets.find(w =>
        w.walletClientType === 'privy' ||
        w.walletClientType === 'embedded' ||
        w.imported === false // Non-imported wallets are embedded
      );

      if (privyWallet) {
        setAddress(privyWallet.address, 'ethereum');
        setConnectingWallet(undefined);
        setWaitingForPrivyWallet(false);
        onClose();
      } else {
        // If we have wallets but none match our criteria, use the first one
        const firstWallet = privyWallets[0];
        if (firstWallet) {
          setAddress(firstWallet.address, 'ethereum');
          setConnectingWallet(undefined);
          setWaitingForPrivyWallet(false);
          onClose();
        }
      }
    }
  }, [privyWallets, waitingForPrivyWallet, setAddress, onClose]);

  // Check if user is already authenticated with Privy when modal opens
  useEffect(() => {
    // Only run this once when the modal first mounts and user is already authenticated
    // Add a check to prevent re-running if address is already set
    const { address: currentAddress } = useStore.getState();

    if (authenticated && privyWallets && privyWallets.length > 0 && !currentAddress) {
      const privyWallet = privyWallets.find(w => w.walletClientType === 'privy');

      if (privyWallet && privyWallet.address !== currentAddress) {
        setAddress(privyWallet.address, 'ethereum');
        onClose();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, privyWallets?.length]); // Only re-run if authentication state or wallet count changes

  // Wagmi hooks for Ethereum
  const { connectors, connect } = useConnect({
    mutation: {
      onSuccess: async (data) => {
        try {
          const rawAddress = data.accounts[0];
          // Ethereum wallet connected
          
          // We'll get the native address by creating a temporary authenticated client
          // This ensures we get the properly converted address for Turbo APIs
          setAddress(rawAddress, 'ethereum');
          onClose();
        } catch {
          // Failed to process Ethereum connection
          setConnectingWallet(undefined);
        }
      },
      onError: () => {
        // Failed to connect wallet
        setConnectingWallet(undefined);
      },
    },
  });

  const { disconnect } = useDisconnect();

  // Solana wallet hooks
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const { publicKey, connect: connectSolana, wallets, select, wallet } = useWallet();

  // Listen for Solana wallet connection - but only when intentionally connecting
  useEffect(() => {
    if (publicKey && intentionalSolanaConnect) {
      // Solana wallet connected
      const rawAddress = publicKey.toString();
      // For now, use raw address - will be converted by Turbo SDK internally
      setAddress(rawAddress, 'solana');
      onClose();
      setIntentionalSolanaConnect(false); // Reset flag
    }
    // Remove setAddress and onClose from dependencies to prevent infinite loop
    // These functions don't need to trigger re-runs of this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, intentionalSolanaConnect]); // Only connect when we intentionally triggered it

  const connectPhantom = async () => {
    try {
      // Attempting to connect Phantom wallet

      // Set the intentional connect flag
      setIntentionalSolanaConnect(true);

      // If already connected, use it immediately
      if (publicKey) {
        // Already connected to Solana wallet
        const rawAddress = publicKey.toString();
        setAddress(rawAddress, 'solana');
        onClose();
        setIntentionalSolanaConnect(false);
        return;
      }

      // Try to find and directly select Phantom
      const phantomWallet = wallets.find(wallet =>
        wallet.adapter.name === 'Phantom'
      );

      if (phantomWallet) {
        // Found Phantom wallet, selecting and connecting
        setConnectingWallet('Connecting to Phantom...');

        // Select the Phantom wallet first
        select(phantomWallet.adapter.name);

        // Wait for wallet to be selected and ready
        let attempts = 0;
        const maxAttempts = 10;
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));

          // Check if wallet is now selected and ready
          if (wallet?.adapter.name === 'Phantom') {
            // Wallet is selected, try to connect
            try {
              await connectSolana();
              break; // Success, exit loop
            } catch {
              // If still getting WalletNotSelectedError, continue waiting
              if (attempts === maxAttempts - 1) {
                // Failed to connect after multiple attempts
              }
            }
          }
          attempts++;
        }

        // Phantom connection attempt completed
      } else {
        // Phantom wallet not found, opening Solana modal
        // Fallback to modal if Phantom not found
        onClose();
        setSolanaModalVisible(true);
      }

    } catch {
      // Failed to connect Phantom wallet
      setIntentionalSolanaConnect(false); // Reset flag on error
    } finally {
      setConnectingWallet(undefined);
    }
  };

  const connectWithEmail = async () => {
    // If already authenticated, just use the existing wallet
    if (authenticated && privyWallets && privyWallets.length > 0) {
      const privyWallet = privyWallets.find(w =>
        w.walletClientType === 'privy' ||
        w.walletClientType === 'embedded' ||
        !w.imported
      );

      if (privyWallet) {
        setAddress(privyWallet.address, 'ethereum');
        // Close the modal immediately without waiting
        setTimeout(() => onClose(), 0);
        return;
      }
    }

    setConnectingWallet('Continue with email...');
    try {
      // Open Privy's built-in login modal
      login();
    } catch {
      setConnectingWallet(undefined);
    }
  };

  const connectWander = async () => {
    setConnectingWallet('Connecting to Wander...');
    try {
      if (!window.arweaveWallet) {
        window.open('https://wander.app', '_blank');
        setConnectingWallet(undefined);
        return;
      }
      
      await window.arweaveWallet.connect([
        'ACCESS_ADDRESS',
        'SIGN_TRANSACTION',
        'ACCESS_PUBLIC_KEY',
        'DISPATCH',
        'SIGNATURE', // Required for Turbo SDK file upload signing
      ]);
      
      const addr = await window.arweaveWallet.getActiveAddress();
      // For Arweave, raw address = native address
      setAddress(addr, 'arweave');
      onClose();
    } catch {
      // Failed to connect Wander wallet
    } finally {
      setConnectingWallet(undefined);
    }
  };

  const connectMetaMask = async () => {
    // Be more specific about MetaMask detection to avoid Phantom conflicts
    const metamask = connectors.find((c) => {
      // First try to find by name
      if (c.name === 'MetaMask') return true;
      // Then check if it's injected and specifically MetaMask
      if (c.id === 'injected') {
        // Check if window.ethereum is MetaMask (not Phantom)
        return (window.ethereum as any)?.isMetaMask === true;
      }
      return false;
    });
    
    if (metamask) {
      setConnectingWallet('Connecting to MetaMask...');
      try {
        // Check if the connector is already connected and disconnect first
        if (metamask.uid && connectors.some(c => c.uid === metamask.uid)) {
          // Disconnecting existing connector before reconnecting
          await disconnect();
          // Small delay to allow disconnection to complete
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await connect({ connector: metamask });
      } catch (error) {
        // Failed to connect MetaMask

        // If we get "already connected" error, try disconnecting first then reconnecting
        if (error instanceof Error && error.message?.includes('already connected')) {
          try {
            // Attempting to disconnect and reconnect
            await disconnect();
            await new Promise(resolve => setTimeout(resolve, 200));
            await connect({ connector: metamask });
          } catch {
            // Retry connection failed
          }
        }
      } finally {
        setConnectingWallet(undefined);
      }
    } else {
      // If no MetaMask connector found, try direct connection with provider detection
      setConnectingWallet('Connecting to MetaMask...');
      try {
        // Find the MetaMask provider in the providers array (handles multiple wallets)
        const metaMaskProvider = (window.ethereum as any)?.providers?.find(
          (provider: any) => provider.isMetaMask,
        );
        
        const targetProvider = metaMaskProvider ?? window.ethereum;
        
        if (!(targetProvider as any)?.isMetaMask && !metaMaskProvider) {
          // MetaMask not found
          window.open('https://metamask.io/', '_blank');
          return;
        }
        
        // Connect directly to MetaMask provider
        await targetProvider.request({ method: 'eth_requestAccounts' });
        const accounts = await targetProvider.request({ method: 'eth_accounts' });
        
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0], 'ethereum');
          onClose();
        }
      } catch {
        // MetaMask connection failed
      } finally {
        setConnectingWallet(undefined);
      }
    }
  };

  return (
    <BaseModal onClose={onClose} showCloseButton={true}>
      <div className="flex flex-col items-center justify-center text-fg-muted p-6 sm:p-8" style={{ minWidth: 'min(85vw, 480px)', maxWidth: '95vw' }}>
        <div className="mb-8 sm:mb-10 text-xl sm:text-2xl font-bold">Connect a Wallet</div>

        <div className="flex w-full flex-col gap-3 sm:gap-4">
          {/* Email login option - prominently at the top */}
          <button
            className="w-full bg-gradient-to-r from-turbo-red/20 to-turbo-red/10 border border-turbo-red/30 p-3 sm:p-4 rounded hover:from-turbo-red/30 hover:to-turbo-red/20 transition-all text-left flex items-center gap-3"
            onClick={connectWithEmail}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-turbo-red" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold mb-1 text-base text-fg-muted">Email Sign-in</div>
              <div className="text-xs sm:text-sm text-turbo-red">No wallet needed • Instant access</div>
            </div>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-surface"></div>
            <div className="text-xs text-link">or use a wallet</div>
            <div className="flex-1 h-px bg-surface"></div>
          </div>

          <button
            className="w-full bg-surface p-3 sm:p-4 rounded hover:bg-surface/80 transition-colors text-left flex items-center gap-3"
            onClick={connectWander}
          >
            <img src="/wander-logo.png" alt="Wander" className="w-7 h-7 sm:w-8 sm:h-8 object-contain flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold mb-1 text-base">Wander</div>
              <div className="text-xs sm:text-sm text-link">Arweave native wallet</div>
            </div>
          </button>

          <button
            className="w-full bg-surface p-3 sm:p-4 rounded hover:bg-surface/80 transition-colors text-left flex items-center gap-3"
            onClick={connectMetaMask}
          >
            <img src="/metamask-logo.svg" alt="MetaMask" className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold mb-1 text-base">MetaMask</div>
              <div className="text-xs sm:text-sm text-link">Ethereum wallet</div>
            </div>
          </button>

          <button
            className="w-full bg-surface p-3 sm:p-4 rounded hover:bg-surface/80 transition-colors text-left flex items-center gap-3"
            onClick={connectPhantom}
          >
            <img src="/phantom-logo.svg" alt="Phantom" className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold mb-1 text-base">Phantom / Solflare</div>
              <div className="text-xs sm:text-sm text-link">Solana wallets</div>
            </div>
          </button>
        </div>

        <div className="mt-6 sm:mt-8 text-center">
          <div className="text-xs text-link px-2">
            By connecting, you agree to our{' '}
            <a
              href="https://ardrive.io/tos-and-privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-fg-muted transition-colors"
            >
              Terms and Conditions
            </a>
          </div>
        </div>

        {connectingWallet && (
          <BlockingMessageModal
            onClose={() => setConnectingWallet(undefined)}
            message={connectingWallet}
          />
        )}
      </div>
    </BaseModal>
  );
};

export default WalletSelectionModal;