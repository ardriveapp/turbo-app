import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Elements } from '@stripe/react-stripe-js';
import { STRIPE_PROMISE } from '../services/paymentService';
import '@solana/wallet-adapter-react-ui/styles.css';

// Configure Wagmi for Ethereum wallets
const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
  connectors: [
    injected(),
    walletConnect({ 
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    }),
  ],
});

// Configure Solana wallets - explicitly exclude MetaMask to prevent conflicts
const solanaWallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
].filter(wallet => !wallet.name.toLowerCase().includes('metamask'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
    },
  },
});

interface WalletProvidersProps {
  children: ReactNode;
}

export function WalletProviders({ children }: WalletProvidersProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectionProvider endpoint={import.meta.env.VITE_SOLANA_RPC || 'https://rpc.ankr.com/solana'}>
          <WalletProvider wallets={solanaWallets} autoConnect={false}>
            <WalletModalProvider>
              <Elements stripe={STRIPE_PROMISE}>
                {children}
              </Elements>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}