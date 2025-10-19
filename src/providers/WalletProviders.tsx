import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Elements } from '@stripe/react-stripe-js';
import { STRIPE_PROMISE } from '../services/paymentService';
import { PrivyProvider } from '@privy-io/react-auth';
import '@solana/wallet-adapter-react-ui/styles.css';

// Configure Wagmi for Ethereum wallets
const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
  connectors: [
    injected(), // MetaMask and other injected wallets
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
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || 'cmfbrom1o000njr0bdhjvtaza'}
      config={{
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'all-users', // Create wallet for all users who log in
          },
          // Disable wallet UIs to prevent signature prompts during file uploads
          showWalletUIs: false,
        },
        loginMethods: ['email'], // Email-only, no wallet connections through Privy
        appearance: {
          theme: 'dark',
          accentColor: '#FE0230', // Turbo red
          showWalletLoginFirst: false,
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ConnectionProvider endpoint={import.meta.env.VITE_SOLANA_RPC || 'https://hardworking-restless-sea.solana-mainnet.quiknode.pro/44d938fae3eb6735ec30d8979551827ff70227f5/'}>
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
    </PrivyProvider>
  );
}