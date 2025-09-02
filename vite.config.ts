import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  base: './', // Relative paths for Arweave subpath compatibility
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
      // Fix for WalletConnect resolution issues
      '@walletconnect/ethereum-provider': path.resolve(
        __dirname,
        'node_modules/@walletconnect/ethereum-provider/dist/index.es.js'
      ),
    },
  },
  optimizeDeps: {
    exclude: ['@walletconnect/ethereum-provider'],
    include: [
      '@walletconnect/modal',
      '@walletconnect/sign-client',
      '@walletconnect/utils',
      'stream',
      'crypto',
    ],
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // No external exclusions like reference apps
  },
});