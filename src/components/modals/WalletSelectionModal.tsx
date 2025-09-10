import { useState, useEffect } from 'react';
import { useConnect, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import BaseModal from './BaseModal';
import BlockingMessageModal from './BlockingMessageModal';
import { useStore } from '../../store/useStore';

const WalletSelectionModal = ({
  onClose,
  message,
}: {
  onClose: () => void;
  message: string;
}) => {
  const { setAddress } = useStore();
  const [connectingWallet, setConnectingWallet] = useState<string>();
  const [intentionalSolanaConnect, setIntentionalSolanaConnect] = useState(false);

  // Wagmi hooks for Ethereum
  const { connectors, connect } = useConnect({
    mutation: {
      onSuccess: async (data) => {
        try {
          const rawAddress = data.accounts[0];
          // Ethereum wallet connected
          
          // We'll get the native address by creating a temporary authenticated client
          // This ensures we get the properly converted address for Turbo APIs
          console.log('Setting Ethereum address:', rawAddress);
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
  const { publicKey, connect: connectSolana, wallets, select } = useWallet();

  // Listen for Solana wallet connection - but only when intentionally connecting
  useEffect(() => {
    if (publicKey && intentionalSolanaConnect) {
      // Solana wallet connected
      const rawAddress = publicKey.toString();
      // For now, use raw address - will be converted by Turbo SDK internally
      console.log('Setting Solana address:', rawAddress);
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
        console.log('Setting Solana address:', rawAddress);
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
        
        // Small delay for selection to take effect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Then connect
        await connectSolana();
        
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
      console.log('Setting Arweave address:', addr);
      setAddress(addr, 'arweave');
      onClose();
    } catch {
      // Failed to connect Wander wallet
    } finally {
      setConnectingWallet(undefined);
    }
  };

  const connectMetaMask = async () => {
    const metamask = connectors.find((c) => c.id === 'injected' || c.name === 'MetaMask');
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
            // Retry failed
          }
        }
      } finally {
        setConnectingWallet(undefined);
      }
    } else {
      window.open('https://metamask.io/', '_blank');
    }
  };

  return (
    <BaseModal onClose={onClose} showCloseButton={true}>
      <div className="flex w-full max-w-sm sm:max-w-md flex-col items-center justify-center text-fg-muted p-4 sm:p-8">
        <div className="mb-8 sm:mb-10 text-xl sm:text-2xl font-bold">Connect a Wallet</div>

        <div className="flex w-full flex-col gap-3 sm:gap-4">
          <button
            className="w-full bg-surface p-3 sm:p-4 rounded hover:bg-surface/80 transition-colors text-left flex items-center gap-3"
            onClick={connectWander}
          >
            <img src="/wander-logo.png" alt="Wander" className="w-7 h-7 sm:w-8 sm:h-8 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold mb-1 text-sm sm:text-base">Wander</div>
              <div className="text-xs text-link">Arweave native wallet</div>
            </div>
          </button>

          <button
            className="w-full bg-surface p-3 sm:p-4 rounded hover:bg-surface/80 transition-colors text-left flex items-center gap-3"
            onClick={connectMetaMask}
          >
            <img src="/metamask-logo.svg" alt="MetaMask" className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold mb-1 text-sm sm:text-base">MetaMask</div>
              <div className="text-xs text-link">Ethereum wallet</div>
            </div>
          </button>

          <button
            className="w-full bg-surface p-3 sm:p-4 rounded hover:bg-surface/80 transition-colors text-left flex items-center gap-3"
            onClick={connectPhantom}
          >
            <img src="/phantom-logo.svg" alt="Phantom" className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold mb-1 text-sm sm:text-base">Phantom / Solflare</div>
              <div className="text-xs text-link">Solana wallets</div>
            </div>
          </button>
        </div>

        <div className="mt-6 sm:mt-8 text-center">
          <div className="text-sm text-link mb-3 px-2">
            {message || 'Connect your wallet to access all features'}
          </div>
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