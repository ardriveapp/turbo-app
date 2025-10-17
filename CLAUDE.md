# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Opens at http://localhost:3000

# Build for production
npm run build:prod
# Full production build with pre-build type checking and increased memory

# Build for development
npm run build
# Standard build

# Preview production build
npm run preview

# Run linting
npm run lint

# Type checking  
npm run type-check

# Clean build artifacts
npm run clean

# Complete clean and reinstall
npm run clean:all
```

### Memory Management
All scripts use `cross-env NODE_OPTIONS=--max-old-space-size` with varying memory allocations (2GB-8GB) due to the complex multi-chain wallet integration and large dependency tree.

### Package Manager
This project uses **yarn** as the package manager (configured via packageManager field in package.json: yarn@1.22.22). All commands can be run with npm or yarn.

### Testing
This project currently has **no test framework configured**. No test scripts exist in package.json.

### Command Validation
Commands that can be run without user approval:
- `npm run type-check` - TypeScript type checking
- `npm run lint` - ESLint validation

### Development vs Production Modes
The app supports both production and development modes controlled by `VITE_NODE_ENV`:
- **Production** (`VITE_NODE_ENV=production`): Uses mainnet endpoints, production Stripe keys, production process IDs
- **Development** (default or `VITE_NODE_ENV=development`): Uses testnet/devnet endpoints, test Stripe keys, dev process IDs
- **Dynamic Configuration**: The store supports runtime configuration switching via `configMode` state (production/development/custom)
- Development mode uses testnet chain IDs for ETH/Base payments and devnet RPC URLs for all crypto operations

## Architecture Overview

### Application Structure
This is a unified Turbo Gateway application consolidating three separate applications:
- **turbo-landing-page**: Informational content and resources
- **turbo-topup**: Payment flows and wallet integration  
- **turbo-app**: File uploads, gifts, credit sharing, and ArNS functionality

### Core Architecture Patterns

#### React Router Navigation System
- **Entry Point** (`App.tsx`): React Router v6 with BrowserRouter
- **Page Structure**: Each service has dedicated page wrapping panel components
- **Client-Side Routing**: Full React Router implementation with direct URL access
- **Navigation**: Unified waffle menu (Grid3x3 icon) in header with Link components

```typescript
// Available routes
const routes = [
  '/', '/topup', '/upload', '/capture', '/deploy', '/share', '/gift', '/account',
  '/domains', '/calculator', '/services-calculator',
  '/balances', '/redeem', '/developer', '/gateway-info', '/deployments'
];
```

#### Authentication & Wallet Integration
The app supports email authentication and three wallet ecosystems:

**Email Authentication (Privy)**
- Email-only sign-in via `@privy-io/react-auth`
- Automatically creates embedded Ethereum wallet for email users
- Configuration: `loginMethods: ['email']` (wallet connections disabled)
- Embedded wallet accessed via `useWallets()` hook

**Arweave (Wander)**
- Uses `ArconnectSigner` from `@ardrive/turbo-sdk/web`
- Required for file uploads and ArNS transactions
- Direct `window.arweaveWallet` integration

**Ethereum (MetaMask)**
- Direct connection via Wagmi v2 (not through Privy)
- Supports mainnet via HTTP transport
- Uses `ethers.BrowserProvider` for signing

**Solana (Phantom/Solflare)**
- Uses `@solana/wallet-adapter` with Phantom and Solflare
- Custom `SolanaWalletAdapter` implementation
- Uses `window.solana` for direct provider access

#### State Management Architecture
Uses Zustand with selective persistence:
```typescript
// Persistent state (survives page refresh)
address, walletType, arnsNamesCache, uploadHistory, deployHistory

// Ephemeral state (cleared on refresh)
creditBalance, paymentState, UI state
```

#### Turbo SDK Integration
Environment-based configuration with proper type safety using the `useTurboConfig` hook:
```typescript
// Centralized configuration via hook
const turboConfig = useTurboConfig(tokenType); // Returns config based on current store mode

// Store manages three configuration modes:
// - 'production': Mainnet endpoints and process IDs
// - 'development': Testnet/devnet endpoints and process IDs
// - 'custom': User-defined endpoints for advanced testing

// Configuration includes:
// - paymentServiceUrl: Payment processing endpoint
// - uploadServiceUrl: File upload endpoint
// - processId: AR.IO process ID (different per environment)
// - tokenMap: RPC URLs for each supported crypto token
// - stripeKey: Environment-specific Stripe public key
```

**Supported Crypto Tokens**:
- `arweave` (AR), `ario` (ARIO), `ethereum` (ETH L1), `base-eth` (ETH on Base L2)
- `solana` (SOL), `kyve` (KYVE), `matic` (MATIC), `pol` (POL)
- Each token has network-specific RPC URLs configured in the token map
- Processing times vary: Solana/Base (fast), Polygon (medium), Arweave/Ethereum (slow)

### Service Architecture

#### Payment Integration
- **Stripe Elements**: Hosted checkout with success/cancel callbacks
- **Fiat Payments**: Complete 3-panel flow in `src/components/panels/fiat/`
  - `PaymentDetailsPanel.tsx`: Amount selection and customer information entry
  - `PaymentConfirmationPanel.tsx`: Order review and payment processing
  - `PaymentSuccessPanel.tsx`: Confirmation with receipt display
- **Gift Fiat Flow**: Dedicated 3-panel gift flow in `src/components/panels/fiat/`
  - `GiftPaymentDetailsPanel.tsx`: Gift amount and recipient information
  - `GiftPaymentConfirmationPanel.tsx`: Gift order review
  - `GiftPaymentSuccessPanel.tsx`: Gift code generation and sharing
- **Crypto Payments**: Multi-token crypto payment flow in `src/components/panels/crypto/`
  - `CryptoConfirmationPanel.tsx`: Token selection and amount confirmation
  - `CryptoManualPaymentPanel.tsx`: Payment address display and instructions
  - Supports 8 crypto tokens with network-specific handling
- **Payment Target System**: Allows funding any wallet address without authentication
  - `paymentTargetAddress` / `paymentTargetType` separate from connected wallet
  - Enables unauthenticated credit purchases for any address
- **Real-time Conversion**: USD/crypto to credits with debouncing (500ms via `useDebounce`)
- **Balance Refresh**: Custom event system (`refresh-balance`) for cross-component updates
- **Just-in-Time (JIT) Payments**: Opt-in automatic crypto top-ups with configurable limits per token

#### File Upload System
- **Wallet Support**: Arweave, Ethereum (via Privy), and Solana wallets can upload files
  - Arweave: Uses `ArconnectSigner` from `window.arweaveWallet`
  - Ethereum: Uses `EthereumSigner` with ethers.js BrowserProvider (MetaMask or Privy embedded wallet)
  - Solana: Uses `SolanaWalletAdapter` for Phantom/Solflare wallets
- **Upload Cancellation**: Proper AbortController support for canceling in-progress uploads
- **Progress Tracking**: Real-time progress bars with single file view and error handling per file
- **Cost Calculator**: Real-time pricing display with GiB estimates via `useWincForOneGiB` hook
- **Receipt System**: Transaction IDs with Arweave explorer links and upload status caching
- **Batch Upload**: Drag & drop with visual feedback and duplicate file prevention
- **Upload History**: Persistent upload history in Zustand store with ArNS association tracking
- **Upload Tagging**: All uploads include standardized metadata tags for identification and tracking (see Upload Tagging System below)

#### Upload Tagging System
All uploads (File Upload, Deploy Site, Webpage Capture) include standardized metadata tags:

**Common Tags** (all features):
- `App-Name: 'Turbo-App'` - Application identifier (from `APP_NAME` constant in `constants.ts`)
- `App-Feature: 'File Upload' | 'Deploy Site' | 'Capture'` - Feature that created the upload
- `App-Version: '0.5.0'` - Application version (from `APP_VERSION` constant in `constants.ts`)

**Feature-Specific Tags**:

*File Upload*:
- `Content-Type` - MIME type of uploaded file
- `File-Name` - Original filename

*Deploy Site*:
- `Content-Type` - MIME type (or `application/x.arweave-manifest+json` for manifests)
- `File-Path` - Relative path within site structure
- `Type: 'manifest'` - Added to manifest uploads only

*Webpage Capture*:
- `Content-Type: 'image/png'` - Screenshot is always PNG format
- `File-Name` - Generated filename: `capture-{domain}-{timestamp}.png`
- `Original-URL` - URL of captured webpage (final URL after redirects)
- `Title` - Page title from captured webpage
- `Viewport-Width` - Screenshot viewport width in pixels
- `Viewport-Height` - Screenshot viewport height in pixels
- `Captured-At` - ISO timestamp of capture

**Tag Implementation**:
- Common tags defined as constants in `src/constants.ts` (`APP_NAME`, `APP_VERSION`)
- Common tags added first, then feature-specific tags
- Tags used for filtering uploads by feature (e.g., `App-Feature === 'Capture'` shows only webpage captures)
- Tags exported in CSV downloads for data analysis

#### Webpage Capture System
- **Integration**: Uses turbo-capture-service backend for full-page screenshot capture
- **Dynamic Configuration**: Capture service URL configurable in Developer Resources (separate production/development URLs)
- **Capture Flow**: URL input → Webpage capture (90s timeout) → Upload confirmation → Arweave upload
- **Metadata Tags**: Captures include standardized tags plus capture-specific metadata:
  - **Common Tags** (all features): `App-Name: 'Turbo-App'`, `App-Feature: 'Capture'`, `App-Version: '0.5.0'`
  - **Capture-Specific Tags**: `Original-URL`, `Title`, `Viewport-Width`, `Viewport-Height`, `Captured-At`
- **File Naming**: `capture-{domain}-{timestamp}.png` with domain truncation at 50 characters
- **ArNS Assignment**: Optional ArNS name/undername assignment matching Deploy Site UX
  - Uses `ArNSAssociationPanel` for dropdown selection
  - Calls AR.IO SDK `ant.setRecord()` for on-chain updates
  - Only Arweave wallets can assign ArNS names (requires signing)
- **Progressive Disclosure**: ArNS panel and upload button only appear after valid URL entry
- **Unified History**: Captures appear in same history as regular uploads with camera icon badge
- **Screenshot Service**: Configurable via `captureServiceUrl` in store configuration
- **Cost Confirmation**: Pre-upload modal with JIT payment support matching upload flow

#### Site Deployment
- **Deploy Site Panel**: Complete site deployment with data export functionality
- **ArNS Association**: Associate deployments with owned ArNS names
- **Recent Deployments**: Track and manage deployed sites
- **TTL Configuration**: Default 600 seconds (10 minutes) for all ArNS records

#### ArNS Integration
- **Primary Name Resolution**: AR.IO SDK with 24-hour cache
- **Name Display**: Throughout UI with loading states
- **Search Functionality**: Name availability checking
- **Domain Management**: Purchase UI ready (not connected)
- **Owned Names Management**: Fetch, cache (6 hours), and update ArNS names owned by connected wallet
- **ANT Updates**: Update ArNS names to point to new manifests (base name and undernames)
- **Site Association**: ArNSAssociationPanel for associating deployments with owned names
- **TTL Settings**: Unified 600-second TTL for all ArNS records (configurable in future)

### Navigation Structure

#### Waffle Menu Services
**Services** (login required):
- Buy Credits (`topup`)
- Upload Files (`upload`)
- Capture Page (`capture`)
- Deploy Site (`deploy`)
- Share Credits (`share`)
- Send Gift (`gift`)
- Account (`account`)

**Tools**:
- Search Domains (`domains`)
- Developer Resources (`developer`)
- Pricing Calculator (`calculator`)
- Services Calculator (`services-calculator`)
- Check Balance (`balances`)
- Redeem Gift (`redeem`)
- Service Info (`gateway-info`)
- Recent Deployments (`deployments`)

#### URL Parameter Support
- `?payment=success` - Payment success callback (handled by PaymentCallbackHandler)
- `?payment=cancelled` - Payment cancellation callback
- Direct URL routing: `/redeem`, `/balances`, `/calculator`, etc.
- Catch-all route: Any unknown path redirects to landing page

### Component Patterns

#### Service Panel Design Pattern
All service panels follow consistent styling:
```jsx
// Inline Header with Icon
<div className="flex items-start gap-3 mb-6">
  <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
    <IconComponent className="w-5 h-5 text-turbo-red" />
  </div>
  <div>
    <h3 className="text-2xl font-bold text-fg-muted mb-1">[Service Name]</h3>
    <p className="text-sm text-link">[Service Description]</p>
  </div>
</div>

// Gradient Container
<div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-default p-6 mb-6">
  {/* Main service content */}
</div>
```

#### Modal System
- **BaseModal**: Foundation component with portal rendering
- **Specialized Modals**: WalletSelectionModal, BlockingMessageModal, ReceiptModal
- **Consistent Styling**: Dark theme with proper z-index layering

#### Custom Hooks
- `useWincForOneGiB`: Storage pricing calculations
- `useCreditsForFiat`: USD to credits conversion with debouncing
- `useCreditsForCrypto`: Crypto to credits conversion calculations
- `useCryptoForFiat`: Fiat to crypto conversion for payment amounts
- `useFileUpload`: Multi-chain upload logic with proper signers
- `useFolderUpload`: Folder upload with drag & drop support
- `useTurboCapture`: Webpage capture state management and screenshot file creation
- `usePrimaryArNSName`: Primary name fetching with cache management
- `useOwnedArNSNames`: Fetch and manage owned ArNS names with ANT state tracking
- `useArNSPricing`: ArNS domain pricing calculations and affordable options
- `useCountries`: Country data for payment forms
- `useDebounce`: Input debouncing (500ms default)
- `useTurboConfig`: Centralized Turbo SDK configuration with environment-based settings
- `useAddressState`: Address state management
- `useGatewayInfo`: Gateway information fetching
- `useTurboWallets`: Turbo wallet management
- `useUploadStatus`: Upload status tracking
- `usePrivyWallet`: Privy wallet detection and logout management

### Styling System

#### Tailwind Configuration
**Dark Theme** (default):
- `bg-canvas`: #171717 (main background)
- `bg-surface`: #1F1F1F (elevated surfaces)
- `text-fg-muted`: #ededed (primary text)
- `text-link`: #A3A3AD (secondary text)

**Brand Colors**:
- `turbo-red`: #FE0230 (primary brand color for all accents)
- `turbo-green`: #18A957 (success states only)
- `turbo-blue`: #3142C4 (informational, limited use)

**Typography**:
- **Font**: Rubik (@fontsource/rubik) throughout
- **Responsive**: Mobile-first breakpoints
- **Copy Pattern**: `<CopyButton textToCopy={value} />` for all copyable content

#### Input Validation Pattern
Credit amount inputs use controlled pattern:
```typescript
const [creditAmountInput, setCreditAmountInput] = useState('1');
const [creditAmount, setCreditAmount] = useState(10);

// Text state for display, numeric state for logic
onChange={(e) => setCreditAmountInput(e.target.value)}
onBlur={() => {
  // Validation and cleanup on blur
  const amount = Number(creditAmountInput);
  if (amount >= minAmount) setCreditAmount(amount);
}}
```

## Environment Configuration

### Required Variables
```bash
# Node environment
VITE_NODE_ENV=production

# Authentication
VITE_PRIVY_APP_ID=your_privy_app_id  # Required for email authentication

# Wallet integrations
VITE_WALLETCONNECT_PROJECT_ID=your_project_id  # Optional
VITE_SOLANA_RPC=https://api.mainnet-beta.solana.com

# Service endpoints (have defaults)
VITE_PAYMENT_SERVICE_URL=https://payment.ardrive.io
VITE_UPLOAD_SERVICE_URL=https://upload.ardrive.io
```

### Vite Configuration
- **Port 3000**: Dev server with `host: true` for network access
- **Node Polyfills**: Buffer, global, process for crypto operations
- **Path Aliases**: `@` resolves to `./src`
- **WalletConnect Fixes**: Specific resolution workarounds
- **External Modules**: fs, path, os, crypto excluded from bundle

## Key Dependencies

### Core Integration
- `@ardrive/turbo-sdk`: v1.32.1-alpha.2 - Turbo services integration
- `@ar.io/sdk`: v3.19.0-alpha.10 - ArNS name resolution and domain management
- `@privy-io/react-auth`: Email authentication with embedded wallets
- `wagmi`: v2.12.5 - Ethereum wallet integration and Web3 functionality
- `@solana/wallet-adapter-*`: Solana wallet ecosystem
- `zustand`: v4.5.5 - Global state management with persistence

### UI & Data
- `@tanstack/react-query`: Server state management and caching
- `@stripe/react-stripe-js`: Payment processing
- `@headlessui/react`: Unstyled UI components (dropdowns, modals)
- `react-router-dom`: Client-side routing and navigation
- `lucide-react`: Icon system
- `tailwindcss`: Styling framework

## Current Status

### ✅ Completed Features (v0.5.0)
- Multi-chain wallet authentication (Arweave, Ethereum, Solana)
- Email authentication via Privy with embedded wallets
- Buy Credits with Stripe checkout including full fiat payment flow
- Complete fiat payment panels with form validation and country selection
- Gift fiat payment flow with dedicated panels (details, confirmation, success)
- Crypto payments for Solana and Ethereum
- File upload with progress tracking (Arweave, Ethereum, and Solana wallets)
- **Webpage Capture system with turbo-capture-service integration**
- **Full-page screenshot capture with 90-second timeout**
- **Standardized upload tagging across all features (File Upload, Deploy Site, Capture)**
- **Common metadata tags (App-Name, App-Feature, App-Version) plus feature-specific tags**
- **Capture tags include viewport dimensions (Viewport-Width, Viewport-Height)**
- **Dynamic capture service URL configuration**
- **ArNS assignment for captured pages matching Deploy Site UX**
- **Progressive disclosure (ArNS/button show after valid URL entry)**
- **Camera icon badge for captures in unified upload history**
- Site deployment with data export functionality and ArNS association
- **Proper upload cancellation with AbortController support**
- **Improved upload progress display with single file view**
- **Fixed duplicate file re-upload issues**
- Credit sharing between wallets (Wander wallet required for signing)
- Credit revocation system
- Gift credit system (send/redeem)
- ArNS name display with caching
- ArNS owned names management with ANT state tracking and updates
- Balance checking for any wallet with credits shared in tracking
- Account management page
- Developer resources with API documentation
- Pricing calculator with storage estimates
- Services calculator with combined storage + ArNS pricing
- Gateway information display
- Recent deployments tracking
- Improved mobile views and responsive design
- Sticky top header navigation
- Optimized TTL settings for ArNS records (600s default)

### ⚠️ Known Limitations
- **Crypto Payments**: Solana and Ethereum crypto payments implemented but need improved UX and additional testing
- **Share Credits**: Requires Arweave (Wander) wallet for transaction signing
- **ArNS Purchase**: Search UI ready, purchase not connected
- **ArNS Updates**: Requires Arweave wallet for ANT operations and signing

### 🔄 Wallet Capability Matrix
| Feature | Arweave | Ethereum | Solana |
|---------|---------|----------|--------|
| Buy Credits (Fiat) | ✅ | ✅ | ✅ |
| Buy Credits (Crypto) | ✅ | ✅ | ✅ |
| Upload Files | ✅ | ✅ | ✅ |
| Capture Pages | ✅ | ✅ | ✅ |
| Deploy Sites | ✅ | ✅ | ✅ |
| Share Credits | ✅ | ✅ | ✅ |
| ArNS Names | ✅ | ✅ | ❌ |
| Update ArNS Records | ✅ | ❌ | ❌ |

## Development Best Practices

### File Upload Development
- **Multi-Wallet Support**: Arweave, Ethereum, and Solana wallets can all upload files
- **Standardized Tags**: All uploads include common tags (`App-Name`, `App-Feature`, `App-Version`) plus feature-specific tags
  - File uploads: `App-Feature: 'File Upload'`, plus `Content-Type` and `File-Name`
  - Deploy site: `App-Feature: 'Deploy Site'`, plus `Content-Type`, `File-Path`, and `Type: 'manifest'` for manifests
  - Import constants: `import { APP_NAME, APP_VERSION } from '../constants';`
- **Signer Creation**: Use `useFileUpload` hook for proper multi-chain signer creation:
  - Arweave: `ArconnectSigner` via `window.arweaveWallet`
  - Ethereum: `EthereumSigner` via ethers.js with MetaMask or Privy embedded wallet
  - Solana: Custom `SolanaWalletAdapter` for Phantom/Solflare
- **Progress Tracking**: Includes both signing and upload phases with real-time updates
- **Cancellation**: Properly implement AbortController for each upload to allow user cancellation
- **Error Handling**: Per-file error states with user-friendly messages
- **Duplicate Prevention**: Check `uploadHistory` to prevent re-uploading the same file

### Webpage Capture Development
- **API Client**: `turboCaptureClient.ts` provides interface to turbo-capture-service
  - `captureScreenshot()`: Captures full-page screenshot with 90-second timeout
  - `createCaptureFile()`: Converts base64 screenshot to File object with proper naming
  - `getCaptureServiceUrl()`: Dynamically reads capture service URL from store configuration
- **React Hook**: Use `useTurboCapture` for capture state management
  - Returns: `capture()`, `reset()`, `isCapturing`, `error`, `result`, `captureFile`
  - Handles screenshot capture and File object creation automatically
- **Capture Tags**: All captures include standardized tags for identification and tracking:
  ```typescript
  // Common tags (required for all features)
  { name: 'App-Name', value: APP_NAME },  // 'Turbo-App'
  { name: 'App-Feature', value: 'Capture' },
  { name: 'App-Version', value: APP_VERSION },  // '0.5.0'

  // Capture-specific tags
  { name: 'Original-URL', value: captureResult.finalUrl },
  { name: 'Title', value: captureResult.title },
  { name: 'Viewport-Width', value: captureResult.viewport.width.toString() },
  { name: 'Viewport-Height', value: captureResult.viewport.height.toString() },
  { name: 'Captured-At', value: captureResult.capturedAt }
  ```
  - Import constants: `import { APP_NAME, APP_VERSION } from '../../constants';`
  - CaptureResult includes `viewport: { width: number; height: number }`
- **ArNS Integration**: For ArNS assignment on captures:
  1. First call `updateArNSRecord()` from `useOwnedArNSNames` hook (on-chain update via AR.IO SDK)
  2. Then call `updateUploadWithArNS()` from store (local state update)
  3. Only Arweave wallets can update ArNS records (requires ANT signing)
- **History Display**: Check for `App-Feature: 'Capture'` tag to display camera icon badge
  ```typescript
  const isCapture = result.receipt?.tags?.find((tag: any) => tag.name === 'App-Feature')?.value === 'Capture';
  ```
- **Configuration**: Capture service URL is configurable in Developer Resources
  - Production: `https://vilenarios.com/local/capture`
  - Development: Same as production (single service)
  - Store manages URL via `captureServiceUrl` in `DeveloperConfig`

### Privy Wallet Support
When creating Turbo clients, check for Privy embedded wallets first:
```typescript
const { wallets } = useWallets(); // Get Privy wallets
const privyWallet = wallets.find(w => w.walletClientType === 'privy');

if (privyWallet) {
  const provider = await privyWallet.getEthereumProvider();
  const ethersProvider = new ethers.BrowserProvider(provider);
  const ethersSigner = await ethersProvider.getSigner();
  // Use ethersSigner for Turbo client
}
```

### ArNS Development
- Use `useOwnedArNSNames` hook for fetching and managing owned ArNS names
- Only Arweave wallets can update ArNS records (requires ANT signing)
- ArNSAssociationPanel provides UI for name selection and undername management
- Updates require processId from owned names and ArconnectSigner for ANT operations
- Cache owned names with automatic refresh and manual refresh options
- Support both base name (@) and undername record updates
- **TTL Configuration**: 600 seconds (10 minutes) default for all ArNS records
  - Provides good balance between caching and update frequency
  - Future enhancement: Allow users to configure TTL per deployment

### State Management
The Zustand store (`src/store/useStore.ts`) uses selective persistence:

**Persistent State** (survives refresh via localStorage):
- `address`, `walletType`: Connected wallet information
- `arnsNamesCache`: Primary ArNS name lookup cache (24-hour expiry)
- `ownedArnsCache`: Owned ArNS names with ANT state (6-hour expiry)
- `uploadHistory`: Complete upload history with receipts and ArNS associations
- `deployHistory`: Deployment history with manifest and ArNS update tracking
- `uploadStatusCache`: Upload status cache (1-hour for confirmed, 24-hour for finalized)
- `configMode`, `customConfig`: Developer configuration settings
- `jitPaymentEnabled`, `jitMaxTokenAmount`, `jitBufferMultiplier`: JIT payment preferences

**Ephemeral State** (cleared on refresh):
- `creditBalance`: Current credit balance
- `paymentAmount`, `paymentIntent`, `paymentInformation`: Active payment flow state
- `cryptoTopupValue`, `cryptoManualTopup`, `cryptoTopupResponse`: Crypto payment state
- `showResumeTransactionPanel`: UI state for pending transactions
- `paymentTargetAddress`, `paymentTargetType`: Target wallet for current payment

**Custom Events**:
- `refresh-balance`: Dispatched after successful payments to trigger balance updates across components

**Cache Expiry Logic**:
- Primary ArNS names: 24 hours (`getArNSName` helper checks timestamp)
- Owned ArNS names: 6 hours (`getOwnedArNSNames` helper checks timestamp)
- Upload status: 1 hour (confirmed), 24 hours (finalized)

### React Router Patterns
- Use `useNavigate()` hook for programmatic navigation
- Use `<Link to="/path">` components for navigation links
- Payment callbacks handled by `PaymentCallbackHandler` component
- All routes defined in `App.tsx` with clean separation
- Catch-all route (`*`) redirects unknown paths to landing page

### API Endpoint Display
When showing API endpoints in JSX, escape curly braces:
```jsx
// Correct - displays {txId} in browser
<code>/endpoint/{"{txId}"}</code>

// Incorrect - causes JavaScript errors
<code>/endpoint/{txId}</code>
```

### Component Creation
- Follow service panel design pattern for consistency
- Use Turbo red (#FE0230) for all primary accents
- Implement proper loading states and error handling
- Include copy buttons for all addresses/IDs
- Test with all supported wallet types

### TypeScript Patterns
- Use strict types for wallet types: `'arweave' | 'ethereum' | 'solana' | null`
- Crypto token types: Use `SupportedTokenType` from constants (8 supported tokens)
- Configuration mode: `ConfigMode = 'production' | 'development' | 'custom'`
- Proper interfaces for API responses (some use `any` - improvement opportunity)
- Consistent error handling with user-friendly messages

### Developer Configuration System
The app includes a powerful runtime configuration system for testing:

**Configuration Modes** (`src/store/useStore.ts`):
- **Production**: Mainnet endpoints, production Stripe key, production process ID
- **Development**: Testnet/devnet endpoints, test Stripe key, dev process ID
- **Custom**: User-defined configuration for advanced testing

**Accessing Configuration**:
```typescript
const { getCurrentConfig, setConfigMode, updateTokenMap } = useStore();
const config = getCurrentConfig(); // Returns DeveloperConfig based on current mode
const turboConfig = useTurboConfig(tokenType); // Hook that uses current config
```

**Token Map**: Each crypto token has a dedicated RPC URL that can be customized:
- Production uses mainnet RPCs (Ethereum, Solana, Base, Polygon, etc.)
- Development uses testnet/devnet RPCs (Holesky, Devnet, Sepolia, Amoy, etc.)
- Custom mode allows overriding individual token RPC URLs

**Window Exposure**: The store is exposed as `window.__TURBO_STORE__` for runtime debugging and configuration changes