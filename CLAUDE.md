# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run lint         # ESLint validation
npm run type-check   # TypeScript checking (strict mode)
npm run build:prod   # Production build (requires 8GB memory)
```

**Path alias:** Use `@/` for imports from `src/` (e.g., `import { useStore } from '@/store/useStore'`).

## Critical Gotchas

Before diving in, these are the most common issues:

1. **Pricing hooks return strings**: `useWincForOneGiB()` returns `string | undefined`, not number:
   ```typescript
   const wincForOneGiB = useWincForOneGiB();
   const wincNum = wincForOneGiB ? Number(wincForOneGiB) : NaN;
   if (Number.isFinite(wincNum) && wincNum > 0) { /* safe */ }
   ```

2. **Clear signer cache on wallet switch**: Call `clearEthereumTurboClientCache()` when user disconnects or switches wallets.

3. **Network switching is automatic**: `useEthereumTurboClient` automatically switches EVM wallets to the correct network before creating signers.

4. **Balance refresh after payments**: Dispatch `window.dispatchEvent(new CustomEvent('refresh-balance'))` after any payment.

5. **JSX brace escaping**: For API endpoint display: `<code>/endpoint/{"{txId}"}</code>`

6. **destinationAddress required**: All pricing API calls need `destinationAddress`. Use `address || 'pricing-lookup'` as fallback.

7. **TypeScript strict mode**: The codebase uses `strict: true`. Handle nullable types explicitly; avoid `!` assertions unless certain.

8. **Async wallet operations may fail**: Always wrap `createEthereumTurboClient()`, `fundAndUpload()`, and similar async wallet operations in try/catch blocks with user-friendly error handling.

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
- Memory allocation via `cross-env NODE_OPTIONS=--max-old-space-size` (2GB dev, 8GB prod build)
- No test framework configured
- Path alias: `@/` maps to `src/` (configured in tsconfig.json and vite.config.ts)

## Architecture Overview

### Application Structure
ar.io App - a unified application for uploading and accessing permanent data through the ar.io Network:
- **File uploads**: Drag & drop with instant confirmation
- **Site deployment**: Deploy static sites with ArNS domain support
- **Credit management**: Purchase, share, and gift credits
- **ArNS domains**: Search and manage domain names

### Key Directories
```text
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
├── utils/                # Helpers (addressValidation, token utilities, jitPayment)
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

**Network Switching:** For EVM token transfers (base-ario, base-eth, base-usdc, etc.), the hook automatically switches the wallet to the correct network BEFORE creating the signer. This is critical for Privy embedded wallets.

### State Management (Zustand)

**Persistent state** (localStorage via `partialize`):
- `address`, `walletType`, `arnsNamesCache`, `ownedArnsCache`
- `uploadHistory`, `deployHistory`, `uploadStatusCache`
- `configMode`, `customConfig`, `x402OnlyMode`
- JIT payment preferences (`jitPaymentEnabled`, `jitMaxTokenAmount`, `jitBufferMultiplier`)
- Smart Deploy (`smartDeployEnabled`, `fileHashCache`)

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
`arweave`, `ario`, `base-ario`, `ethereum`, `base-eth`, `solana`, `kyve`, `pol`, `usdc`, `base-usdc`, `polygon-usdc`

**Network detection:** `getTokenTypeFromChainId()` in `utils/index.ts`

**JIT payments supported:** `ario`, `base-ario`, `solana`, `base-eth`, `base-usdc` (see `supportsJitPayment()` in `utils/jitPayment.ts`)

**EVM token transfer types** (require network switching): `base-ario`, `base-eth`, `base-usdc`, `polygon-usdc`, `pol`, `usdc`

## Creating Turbo Clients

Different wallet types require different client instantiation:

```typescript
// Arweave wallet
import { TurboFactory, ArconnectSigner } from '@ardrive/turbo-sdk/web';
const signer = new ArconnectSigner(window.arweaveWallet);
const turbo = TurboFactory.authenticated({ signer, ...turboConfig });

// Ethereum wallet (PREFERRED: use the hook for automatic caching + network switching)
import { useEthereumTurboClient } from '../hooks/useEthereumTurboClient';
const { createEthereumTurboClient } = useEthereumTurboClient();
const turbo = await createEthereumTurboClient('base-ario'); // or 'base-eth', 'base-usdc', etc.

// Solana wallet
import { TurboFactory } from '@ardrive/turbo-sdk/web';
import { useWallet } from '@solana/wallet-adapter-react';
const { publicKey, signMessage } = useWallet();
// Create adapter that implements TurboWalletSigner interface
const solanaAdapter = {
  publicKey,
  signMessage: async (message: Uint8Array) => signMessage!(message),
};
const turbo = TurboFactory.authenticated({ signer: solanaAdapter, token: 'solana', ...turboConfig });

// Manual Ethereum client (for non-hook contexts - prefer the hook above)
import { InjectedEthereumSigner } from '@ar.io/sdk/web';
import { getConnectorClient } from 'wagmi/actions';
const connectorClient = await getConnectorClient(wagmiConfig, { connector: ethAccount.connector });
const ethersProvider = new ethers.BrowserProvider(connectorClient.transport, 'any');
const ethersSigner = await ethersProvider.getSigner();
const userAddress = await ethersSigner.getAddress();
// InjectedEthereumSigner expects a provider with getSigner() returning signMessage/getAddress
const injectedProvider = {
  getSigner: () => ({
    signMessage: async (msg: string) => ethersSigner.signMessage(msg),
    getAddress: async () => userAddress,
  }),
};
const injectedSigner = new InjectedEthereumSigner(injectedProvider as any);
await injectedSigner.setPublicKey(); // Requests signature
const turbo = TurboFactory.authenticated({ signer: injectedSigner, token: 'base-eth', ...turboConfig });
```

## Upload Tagging System

All uploads include standardized metadata tags:

**Deployment tool tags (always included):**
- `Deployed-By`: 'ar.io App' (from `APP_NAME` constant) - identifies the deployment tool
- `Deployed-By-Version`: Dynamic from package.json - version of the deployment tool
- `App-Feature`: 'File Upload' | 'Deploy Site' | 'Capture'

**User app tags (optional, for site deployments):**
- `App-Name`: User-provided app/site name
- `App-Version`: User-provided app version

**Feature-specific:** `Content-Type`, `File-Name`, `File-Path`, `Original-URL`, `Title`, viewport dimensions

## Upload Workflow

The app supports three upload modes with different payment strategies:

**1. Pre-funded Credits (Traditional)**
- User buys credits via fiat or crypto first
- Upload deducts from credit balance
- Works with all wallet types

**2. JIT (Just-In-Time) Payments**
- No pre-purchase required; crypto sent at upload time
- Uses `fundAndUpload()` from Turbo SDK
- Supported tokens: `ario`, `base-ario`, `solana`, `base-eth`, `base-usdc`
- Configurable via store: `jitPaymentEnabled`, `jitMaxTokenAmount`, `jitBufferMultiplier`

**3. X402 Protocol (Base USDC)**
- Pay-per-upload via HTTP 402 payment flow
- Only works with Ethereum wallets on Base network
- Used when `x402OnlyMode` is enabled or connecting to x402-only bundlers

**Upload Flow Decision Tree:**
```
1. Check if file is free (under bundler's free limit)
   → Yes: Upload without payment
   → No: Continue to payment check

2. Check wallet type and mode
   → x402OnlyMode + Ethereum wallet: Use X402
   → JIT enabled + supported token: Use fundAndUpload
   → Has sufficient credits: Use standard upload
   → None: Prompt user to buy credits
```

## X402 Protocol (x402-only mode)

Enables uploads without pre-purchased credits via Base network USDC. Used when connecting to ar.io bundlers that only support x402.

**Key files:**
- `useX402Upload.ts`: Protocol upload hook
- `useX402Pricing.ts`: USDC cost calculation
- `useEthereumTurboClient.ts`: Creates authenticated Turbo client for Ethereum wallets

**Config** (`X402_CONFIG` in constants.ts):
- Production: Base Mainnet (chainId 8453)
- Development: Base Sepolia (chainId 84532)

**x402OnlyMode:** When enabled (via Developer Resources panel), only `base-usdc` payments are available and only Ethereum wallets can make billable uploads/deploys.

## Network Configurations

Network-specific settings in `constants.ts`:

| Config | Production ChainId | Development ChainId | Token Contract |
|--------|-------------------|---------------------|----------------|
| `X402_CONFIG` | 8453 (Base) | 84532 (Base Sepolia) | USDC on Base |
| `BASE_ARIO_CONFIG` | 8453 (Base) | 84532 (Base Sepolia) | ARIO bridged to Base |
| `ETHEREUM_CONFIG` | 1 (Mainnet) | 11155111 (Sepolia) | USDC on Ethereum |
| `POLYGON_CONFIG` | 137 (Polygon) | 80002 (Amoy) | USDC on Polygon |

## Wallet Capability Matrix

| Feature | Arweave | Ethereum/Base/Polygon | Solana |
|---------|---------|----------------------|--------|
| Buy Credits (Fiat) | ✅ | ✅ | ✅ |
| Buy Credits (Crypto) | ✅ AR/ARIO | ✅ ETH/Base-ETH/Base-ARIO/POL/USDC | ✅ SOL |
| Upload/Deploy/Capture | ✅ | ✅ | ✅ |
| Share Credits | ✅ | ✅ | ✅ |
| Update ArNS Records | ✅ | ❌ | ❌ |
| JIT Payments | ✅ ARIO | ✅ Base-ARIO, Base-ETH, Base-USDC | ✅ SOL |
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

### ar.io Brand Colors (Light Mode)

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Primary | #5427C8 | `--color-primary` | CTAs, links, accents |
| Lavender | #DFD6F7 | `--color-lavender` | Gradients, backgrounds, footer |
| Black | #23232D | `--color-foreground` | Primary text, dark elements |
| White | #FFFFFF | `--color-background` | Page background |
| Card Surface | #F0F0F0 | `--color-card` | Card backgrounds |

### Typography

- **Headings**: Besley (font-heading), weight 800 (extra bold)
- **Body text**: Plus Jakarta Sans (font-body)
- Both fonts loaded via `@fontsource-variable`

### Key Files

- `src/styles/globals.css` - CSS custom properties
- `tailwind.config.js` - Tailwind color tokens and font families
- `STYLE_GUIDE.md` - Comprehensive component patterns

## Common Patterns

### Service Panel Header
```jsx
<div className="flex items-start gap-3 mb-6">
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card">
    <Icon className="h-5 w-5 text-foreground" />
  </div>
  <div>
    <h3 className="font-heading text-2xl font-extrabold text-foreground mb-1">[Name]</h3>
    <p className="text-sm text-foreground/80">[Description]</p>
  </div>
</div>
```

### Card Component
```jsx
<div className="rounded-2xl border border-border/20 bg-card p-6 shadow-sm">
  {/* Card content */}
</div>
```

### Primary Button
```jsx
<button className="inline-flex items-center gap-2 bg-foreground text-white px-5 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity">
  Button Text
</button>
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

## Key Dependencies

- `@ardrive/turbo-sdk`: Turbo services, multi-chain signing, USDC support
- `@ar.io/sdk`: ArNS resolution, InjectedEthereumSigner
- `@privy-io/react-auth`: Email auth with embedded wallets
- `wagmi` + `ethers`: Ethereum wallets
- `@solana/wallet-adapter-*`: Solana wallets
- `arbundles`: Data item creation for X402
- `x402-fetch`: X402 payment protocol
- `zustand`: State management
- `@tanstack/react-query`: Server state
- `@stripe/react-stripe-js`: Fiat payments

## Routes

```typescript
'/', '/topup', '/upload', '/capture', '/deploy', '/deployments', '/share', '/gift',
'/account', '/domains', '/calculator', '/services-calculator', '/balances', '/redeem',
'/developer', '/gateway-info'
```

URL params: `?payment=success`, `?payment=cancelled` (handled by PaymentCallbackHandler in App.tsx)

## Custom Events

- `refresh-balance`: Dispatched after payments to trigger balance updates across components
- `walletSwitch`: ArConnect event for Arweave wallet changes

## Important Hooks

**Core Hooks:**
- `useTurboConfig(tokenType?)` - Get Turbo SDK config for current mode
- `useEthereumTurboClient()` - Create authenticated Turbo client for ETH wallets (with caching + network switching)
- `useTurboWallets()` - Unified wallet detection across Arweave/Ethereum/Solana
- `useWalletAccountListener()` - Listens for wallet changes, clears caches on switch

**Upload Hooks:**
- `useFileUpload()` - Multi-chain file upload logic
- `useFolderUpload()` - Folder upload with manifest generation
- `useX402Upload()` - X402 protocol uploads
- `useFreeUploadLimit()` - Fetch bundler's free upload limit

**Pricing Hooks:**
- `useWincForOneGiB()` - Storage pricing (returns `string | undefined`!)
- `useCreditsForFiat(usdAmount, address)` - USD → credits conversion
- `useCreditsForCrypto(tokenType, amount, address)` - Crypto → credits conversion
- `useX402Pricing(bytes)` - Calculate USDC cost for X402
- `useTokenBalance(tokenType)` - User's token balance for crypto payments
- `useCryptoPrice(tokenType)` - Current USD price for a token

**ArNS Hooks:**
- `usePrimaryArNSName(address)` - Fetch primary ArNS name
- `useOwnedArNSNames(address)` - Fetch all owned ArNS names

## Important Utilities

**JIT Payment Utils** (`utils/jitPayment.ts`):
- `supportsJitPayment(tokenType)` - Check if token supports JIT payments
- `calculateRequiredTokenAmount()` - Calculate crypto needed for credits
- `formatTokenAmount()` / `fromSmallestUnit()` - Token amount formatting

**Other:**
- `clearEthereumTurboClientCache()` (`hooks/useEthereumTurboClient.ts`) - Clear cached signers/clients
- `isFileFree()` / `formatFreeLimit()` (`hooks/useFreeUploadLimit.ts`) - Free upload limit checks
