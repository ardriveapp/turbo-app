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
    'import.meta.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
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
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // No external exclusions like reference apps
  },
});