# ar.io App

A unified web application for uploading and accessing permanent data through the ar.io Network. Built with React 18, TypeScript, Vite, and multi-chain wallet support.

## Overview

The ar.io App provides a streamlined interface for:
- **File uploads** to the permaweb with instant confirmation
- **Site deployment** with ArNS domain support
- **Credit management** (purchase, share, gift)
- **ArNS domain** search and management
- **Developer tools** and API documentation

## Quick Start

```bash
npm install       # Or: yarn install
npm run dev       # Start dev server at http://localhost:3000
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (4GB memory) |
| `npm run build:prod` | Production build with type checking (8GB memory) |
| `npm run build:staging` | Staging build with source maps |
| `npm run build` | Development build (no type check) |
| `npm run lint` | ESLint validation |
| `npm run type-check` | TypeScript checking |
| `npm run clean:all` | Full clean and reinstall |
| `npm run preview` | Preview production build |

## Tech Stack

- **React 18.3** with TypeScript 5.5, Vite 5.4
- **State**: Zustand (persistent + ephemeral), TanStack React Query v5
- **Wallets**: Arweave (Wander), Ethereum (Wagmi/RainbowKit/Privy), Solana (wallet-adapter)
- **Payments**: Stripe (fiat), native crypto, X402 protocol (Base USDC)
- **Styling**: Tailwind CSS, Besley + Plus Jakarta Sans fonts
- **Key SDKs**: `@ardrive/turbo-sdk` ^1.39.2, `@ar.io/sdk` ^3.19.0-alpha.10

## Environment Variables

Create a `.env` file:

```bash
VITE_NODE_ENV=production              # Controls mainnet vs testnet
VITE_PRIVY_APP_ID=...                 # Required for email auth
VITE_WALLETCONNECT_PROJECT_ID=...     # Optional
VITE_SOLANA_RPC=...                   # Optional, has default
```

## Routes

```
/              # Landing/Home
/topup         # Buy credits (fiat/crypto)
/upload        # File upload
/capture       # Web page capture
/deploy        # Site deployment
/deployments   # Deployment history
/share         # Share credits
/gift          # Send gift credits
/redeem        # Redeem gift code
/account       # Account overview
/domains       # ArNS domain management
/balances      # Balance checker
/calculator    # Pricing calculator
/services-calculator  # Storage + ArNS calculator
/developer     # API docs and dev tools
/gateway-info  # Gateway information
```

## Wallet Capabilities

| Feature | Arweave | Ethereum/Base | Solana |
|---------|---------|---------------|--------|
| Buy Credits (Fiat/Crypto) | ✅ | ✅ | ✅ |
| Upload/Deploy/Capture | ✅ | ✅ | ✅ |
| Share Credits | ✅ | ✅ | ✅ |
| Update ArNS Records | ✅ | ❌ | ❌ |
| X402 USDC Uploads | ❌ | ✅ (Base only) | ❌ |

## Documentation

For detailed development guidance including architecture, hooks reference, state management patterns, and critical implementation details, see **[CLAUDE.md](./CLAUDE.md)**.

For styling patterns and component guidelines, see **[STYLE_GUIDE.md](./STYLE_GUIDE.md)**.
