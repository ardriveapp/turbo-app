import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import fs from 'fs';

// Read package.json for version
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
);

export default defineConfig({
  base: './', // Relative paths for Arweave subpath compatibility
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version),
    // Use date only (not full timestamp) to avoid cache-busting on every build
    'import.meta.env.BUILD_TIME': JSON.stringify(new Date().toISOString().split('T')[0]),
  },
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Essential polyfills for multi-chain unified app (based on actual errors seen)
      include: ['buffer', 'crypto', 'stream', 'os', 'util', 'process', 'fs'],
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      '@privy-io/react-auth',
      '@walletconnect/ethereum-provider',
      '@walletconnect/modal',
      '@walletconnect/sign-client',
      '@walletconnect/utils',
      '@walletconnect/environment',
      '@walletconnect/jsonrpc-utils',
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    // Source maps disabled by default for smaller builds (~50MB savings)
    // Enable with: VITE_SOURCEMAPS=true (used by build:staging)
    sourcemap: process.env.VITE_SOURCEMAPS === 'true',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        // Manual chunk splitting for stable vendor bundles
        // Vendor code rarely changes, so these chunks stay cached between deploys
        manualChunks: {
          // React core - very stable
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Ethereum wallet SDKs
          'vendor-ethereum': [
            '@privy-io/react-auth',
            'wagmi',
            '@wagmi/core',
            '@wagmi/connectors',
            'viem',
            '@rainbow-me/rainbowkit',
          ],
          // Solana wallet SDKs
          'vendor-solana': [
            '@solana/wallet-adapter-base',
            '@solana/wallet-adapter-react',
            '@solana/wallet-adapter-react-ui',
            '@solana/wallet-adapter-wallets',
            '@solana/web3.js',
          ],
          // Arweave/Turbo SDKs
          'vendor-arweave': [
            '@ardrive/turbo-sdk',
            '@ar.io/sdk',
          ],
          // UI libraries
          'vendor-ui': [
            'lucide-react',
            '@tanstack/react-query',
            'zustand',
            '@stripe/react-stripe-js',
          ],
        },
      },
    },
  },
});