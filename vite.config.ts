import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  base: './', // Use relative paths for Arweave deployment compatibility
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Polyfill Node.js modules
      include: ['crypto', 'buffer', 'process', 'util', 'stream'],
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
    rollupOptions: {
      external: ['fs', 'path', 'os'],
    },
  },
});