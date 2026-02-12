import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { mainnet, base, polygon, polygonAmoy } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Elements } from '@stripe/react-stripe-js';
import { STRIPE_PROMISE } from '../services/paymentService';
import { PrivyProvider } from '@privy-io/react-auth';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import '@solana/wallet-adapter-react-ui/styles.css';

// WalletConnect Project ID - get one from https://cloud.walletconnect.com/
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '9f180997f87a0c8e1ddd5bcd92ae5363';

// Configure Wagmi with RainbowKit - supports MetaMask, WalletConnect, Coinbase, and many more
// RainbowKit's getDefaultConfig handles session persistence automatically via wagmi's reconnect
const wagmiConfig = getDefaultConfig({
  appName: 'ar.io',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [mainnet, base, polygon, polygonAmoy],
  ssr: false,
});

// Custom RainbowKit theme to match ar.io's dark theme
const arioRainbowTheme = darkTheme({
  accentColor: '#FE0230', // primary
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
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
          accentColor: '#FE0230', // primary
          showWalletLoginFirst: false,
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={arioRainbowTheme}>
            <ConnectionProvider endpoint={import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com'}>
              <WalletProvider wallets={solanaWallets} autoConnect={false}>
                <WalletModalProvider>
                  <Elements stripe={STRIPE_PROMISE}>
                    {children}
                  </Elements>
                </WalletModalProvider>
              </WalletProvider>
            </ConnectionProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}
