# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build:prod   # Production build with type checking (8GB memory)
npm run build        # Development build
npm run lint         # ESLint validation
npm run type-check   # TypeScript checking
npm run clean:all    # Full clean and reinstall
```

**Notes:**
- Uses yarn (packageManager: yarn@1.22.22) but npm works
- All scripts use `cross-env NODE_OPTIONS=--max-old-space-size` (2GB-8GB) for complex wallet integrations
- No test framework configured

## Architecture Overview

### Application Structure
Unified Turbo Gateway app consolidating:
- **turbo-landing-page**: Informational content
- **turbo-topup**: Payment flows and wallet integration
- **turbo-app**: File uploads, gifts, credit sharing, ArNS

### Key Directories
```
src/
├── components/
│   ├── panels/           # Feature panels (TopUpPanel, UploadPanel, etc.)
│   ├── panels/fiat/      # Fiat payment flow (3-panel: Details→Confirm→Success)
│   ├── panels/crypto/    # Crypto payment panels
│   ├── modals/           # BaseModal, WalletSelectionModal, ReceiptModal
│   └── account/          # Account page components
├── hooks/                # Custom React hooks (Turbo SDK wrappers, pricing, uploads)
├── pages/                # React Router page components
├── store/useStore.ts     # Zustand state management
├── providers/            # WalletProviders.tsx (Wagmi, Solana, Privy, Stripe, React Query)
├── utils/                # Helpers (addressValidation, token utilities)
├── lib/                  # API clients (turboCaptureClient.ts)
└── constants.ts          # App config, token definitions, X402_CONFIG
```

### Wallet Integration

**Three wallet ecosystems:**

| Wallet | Signer | Notes |
|--------|--------|-------|
| Arweave (Wander) | `ArconnectSigner` via `window.arweaveWallet` | Required for ArNS updates |
| Ethereum (all) | `InjectedEthereumSigner` from `@ar.io/sdk/web` | Supports MetaMask, RainbowKit, WalletConnect, Coinbase |
| Solana (Phantom/Solflare) | Custom `SolanaWalletAdapter` | Uses `window.solana` |

**Email Auth (Privy):** Creates embedded Ethereum wallet via `@privy-io/react-auth`

**Ethereum Signer Caching:** The `useEthereumTurboClient` hook caches signers globally so users only sign once per session. Call `clearEthereumTurboClientCache()` when switching wallets.

### State Management (Zustand)

**Persistent state** (localStorage via `partialize`):
- `address`, `walletType`, `arnsNamesCache`, `ownedArnsCache`
- `uploadHistory`, `deployHistory`, `uploadStatusCache`
- `configMode`, `customConfig`, `x402OnlyMode`
- JIT payment preferences (`jitPaymentEnabled`, `jitMaxTokenAmount`, `jitBufferMultiplier`)

**Ephemeral state:**
- `creditBalance`, payment flow state, UI state

**Cache expiry:** ArNS names (24h), owned names (6h), upload status (1h confirmed, 24h finalized)

### Configuration System

Three modes via `configMode` in store:
- **production**: Mainnet endpoints, production Stripe key
- **development**: Testnet/devnet endpoints, test Stripe key
- **custom**: User-defined for testing

Access via `useTurboConfig(tokenType)` hook or `getCurrentConfig()` from store.

## Token Support

**Supported tokens** (from `constants.ts`):
`arweave`, `ario`, `ethereum`, `base-eth`, `solana`, `kyve`, `pol`, `usdc`, `base-usdc`, `polygon-usdc`

**Network detection:** `getTokenTypeFromChainId()` in `utils/index.ts`

**JIT payments supported:** ARIO, SOL, Base-ETH, Base-USDC only

## Creating Turbo Clients

Different wallet types require different client instantiation:

```typescript
// Arweave wallet
import { TurboFactory, ArconnectSigner } from '@ardrive/turbo-sdk/web';
const signer = new ArconnectSigner(window.arweaveWallet);
const turbo = TurboFactory.authenticated({ signer, ...turboConfig });

// Ethereum wallet (PREFERRED: use the hook for automatic caching)
import { useEthereumTurboClient } from '../hooks/useEthereumTurboClient';
const { createEthereumTurboClient } = useEthereumTurboClient();
const turbo = await createEthereumTurboClient('base-eth'); // or 'ethereum', 'base-usdc', etc.

// Manual Ethereum client (for non-hook contexts)
import { InjectedEthereumSigner } from '@ar.io/sdk/web';
import { getConnectorClient } from 'wagmi/actions';
const connectorClient = await getConnectorClient(wagmiConfig, { connector: ethAccount.connector });
const ethersProvider = new ethers.BrowserProvider(connectorClient.transport, 'any');
const ethersSigner = await ethersProvider.getSigner();
const injectedSigner = new InjectedEthereumSigner(provider);
await injectedSigner.setPublicKey(); // Requests signature
const turbo = TurboFactory.authenticated({ signer: injectedSigner, token: 'base-eth', ...turboConfig });
```

## Upload Tagging System

All uploads include standardized metadata tags:

**Common tags:**
- `App-Name`: 'Turbo-App' (from `APP_NAME` constant)
- `App-Feature`: 'File Upload' | 'Deploy Site' | 'Capture'
- `App-Version`: Dynamic from package.json

**Feature-specific:** `Content-Type`, `File-Name`, `File-Path`, `Original-URL`, `Title`, viewport dimensions

## X402 Protocol (Instant USDC Uploads)

Enables uploads without pre-purchased credits via Base network USDC.

**Key files:**
- `useX402Upload.ts`: Protocol upload hook
- `useX402Pricing.ts`: USDC cost calculation
- `useEthereumTurboClient.ts`: Creates authenticated Turbo client for Ethereum wallets

**Config** (`X402_CONFIG` in constants.ts):
- Production: Base Mainnet (chainId 8453)
- Development: Base Sepolia (chainId 84532)

## Wallet Capability Matrix

| Feature | Arweave | Ethereum/Base/Polygon | Solana |
|---------|---------|----------------------|--------|
| Buy Credits (Fiat) | ✅ | ✅ | ✅ |
| Buy Credits (Crypto) | ✅ AR/ARIO | ✅ ETH/Base-ETH/POL/USDC | ✅ SOL |
| Upload/Deploy/Capture | ✅ | ✅ | ✅ |
| Share Credits | ✅ | ✅ | ✅ |
| Update ArNS Records | ✅ | ❌ | ❌ |
| JIT Payments | ✅ ARIO | ✅ Base-ETH, Base-USDC | ✅ |
| X402 USDC Uploads | ❌ | ✅ (Base only) | ❌ |

## Environment Variables

```bash
VITE_NODE_ENV=production        # Controls mainnet vs testnet
VITE_PRIVY_APP_ID=...           # Required for email auth
VITE_WALLETCONNECT_PROJECT_ID=...  # Optional
VITE_SOLANA_RPC=...             # Optional, has default
```

Service URLs managed by store's configuration system, overridable via Developer Resources panel.

## Styling

**Dark theme (default):**
- `bg-canvas`: #171717, `bg-surface`: #1F1F1F
- `text-fg-muted`: #ededed, `text-link`: #A3A3AD

**Brand colors:**
- `turbo-red`: #FE0230 (primary), `turbo-green`: #18A957 (success)

**Font:** Rubik via @fontsource/rubik

## Common Patterns

### Service Panel Header
```jsx
<div className="flex items-start gap-3 mb-6">
  <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
    <Icon className="w-5 h-5 text-turbo-red" />
  </div>
  <div>
    <h3 className="text-2xl font-bold text-fg-muted mb-1">[Name]</h3>
    <p className="text-sm text-link">[Description]</p>
  </div>
</div>
```

### Privy Wallet Detection
```typescript
const { wallets } = useWallets();
const privyWallet = wallets.find(w => w.walletClientType === 'privy');
if (privyWallet) {
  const provider = await privyWallet.getEthereumProvider();
  // Use provider for Turbo client
}
```

### API Endpoint Display (escape braces in JSX)
```jsx
<code>/endpoint/{"{txId}"}</code>  // Correct
```

### Dispatching Balance Refresh
```typescript
window.dispatchEvent(new CustomEvent('refresh-balance'));
```

### Clearing Wallet Caches on Disconnect
```typescript
import { clearEthereumTurboClientCache } from '../hooks/useEthereumTurboClient';

// Call when user disconnects or switches wallet
clearEthereumTurboClientCache();
```

## Key Dependencies

- `@ardrive/turbo-sdk`: Turbo services, multi-chain signing, USDC support
- `@ar.io/sdk`: ArNS resolution
- `@privy-io/react-auth`: Email auth
- `wagmi` + `ethers`: Ethereum wallets
- `@solana/wallet-adapter-*`: Solana wallets
- `arbundles`: Data item creation for X402
- `x402-fetch`: X402 payment protocol
- `zustand`: State management
- `@tanstack/react-query`: Server state
- `@stripe/react-stripe-js`: Payments

## Routes

```typescript
'/', '/topup', '/upload', '/capture', '/deploy', '/share', '/gift', '/account',
'/domains', '/calculator', '/services-calculator', '/balances', '/redeem',
'/developer', '/gateway-info', '/deployments'
```

URL params: `?payment=success`, `?payment=cancelled` (handled by PaymentCallbackHandler in App.tsx)

## Custom Events

- `refresh-balance`: Dispatched after payments to trigger balance updates across components

## Important Hooks

| Hook | Purpose |
|------|---------|
| `useTurboConfig(tokenType?)` | Get Turbo SDK config for current mode |
| `useCreditsForFiat(usdAmount, address)` | USD → credits conversion |
| `useCreditsForCrypto(tokenType, amount, address)` | Crypto → credits conversion |
| `useWincForOneGiB()` | Storage pricing |
| `useFileUpload()` | Multi-chain file upload logic |
| `useFolderUpload()` | Folder upload with manifest generation |
| `useX402Upload()` | X402 protocol uploads |
| `useX402Pricing(bytes)` | Calculate USDC cost for X402 |
| `useEthereumTurboClient()` | Create authenticated Turbo client for ETH wallets (with caching) |
| `useTurboWallets()` | Unified wallet detection across Arweave/Ethereum/Solana |
| `usePrimaryArNSName(address)` | Fetch primary ArNS name |
| `useOwnedArNSNames(address)` | Fetch all owned ArNS names |
| `usePaymentFlow()` | Shared fiat/gift payment logic |
| `useTokenBalance(tokenType)` | Get user's token balance for crypto payments |
| `useCryptoPrice(tokenType)` | Get current USD price for a token |
