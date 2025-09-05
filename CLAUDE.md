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
This project uses **yarn** as the package manager (configured via packageManager field in package.json). All commands can be run with npm or yarn.

### Testing
This project currently has **no test framework configured**. No test scripts exist in package.json.

### Command Validation
Commands that can be run without user approval:
- `npm run type-check` - Type checking (safe to run automatically)
- `npm run type-check:*` - Any type-check variant

### Required Commands for Development
Always run these commands after making code changes:
- `npm run type-check` - TypeScript type checking
- `npm run lint` - ESLint validation

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
  '/', '/topup', '/upload', '/deploy', '/share', '/gift', 
  '/domains', '/calculator', '/services-calculator', 
  '/balances', '/redeem', '/developer', '/gateway-info'
];
```

#### Multi-Chain Wallet Integration
The app supports three wallet ecosystems with different capabilities:

**Arweave (Wander)**
- Uses `ArconnectSigner` from `@ardrive/turbo-sdk/web`
- Required for file uploads and ArNS transactions
- Direct `window.arweaveWallet` integration

**Ethereum**
- Uses Wagmi v2 with MetaMask and WalletConnect connectors
- Supports mainnet via HTTP transport
- Uses `ethers.BrowserProvider` for signing

**Solana**
- Uses `@solana/wallet-adapter` with Phantom and Solflare
- Custom `SolanaWalletAdapter` implementation
- Uses `window.solana` for direct provider access

#### State Management Architecture
Uses Zustand with selective persistence:
```typescript
// Persistent state (survives page refresh)
address, walletType, arnsNamesCache, uploadHistory

// Ephemeral state (cleared on refresh)
creditBalance, paymentState, UI state
```

#### Turbo SDK Integration
Environment-based configuration with proper type safety:
```typescript
const turboConfig: TurboUnauthenticatedConfiguration = {
  paymentServiceConfig: { url: defaultPaymentServiceUrl },
  uploadServiceConfig: { url: uploadServiceUrl },
  processId: arioProcessId, // Different for prod/dev
};
```

### Service Architecture

#### Payment Integration
- **Stripe Elements**: Hosted checkout with success/cancel callbacks
- **Gift Payment Flow**: Multi-step payment process with confirmation panels
- **Fiat Payments**: Complete fiat payment panels (PaymentDetailsPanel, PaymentConfirmationPanel, PaymentSuccessPanel)
- **Gift Fiat Flow**: Dedicated gift payment panels (GiftPaymentDetailsPanel, GiftPaymentConfirmationPanel, GiftPaymentSuccessPanel)
- **Crypto Payments**: UI ready with crypto-to-credits conversion, backend integration pending
- **Real-time Conversion**: USD/crypto to credits with debouncing (500ms)
- **Balance Refresh**: Custom events trigger balance updates

#### File Upload System
- **Multi-wallet Support**: Only Arweave wallets can upload files
- **Progress Tracking**: Real-time progress bars with error handling
- **Cost Calculator**: Real-time pricing display with GiB estimates
- **Receipt System**: Transaction IDs with Arweave explorer links
- **Batch Upload**: Drag & drop with visual feedback

#### ArNS Integration
- **Primary Name Resolution**: AR.IO SDK with 1-hour cache
- **Name Display**: Throughout UI with loading states
- **Search Functionality**: Name availability checking
- **Domain Management**: Purchase UI ready (not connected)

### Navigation Structure

#### Waffle Menu Services
**Services** (login required):
- Buy Credits (`topup`)
- Upload Files (`upload`) 
- Deploy Site (`deploy`) - temporarily disabled
- Share Credits (`share`)
- Send Gift (`gift`)

**Tools**:
- Search Domains (`domains`)
- Developer Resources (`developer`)
- Pricing Calculator (`calculator`)
- Services Calculator (`services-calculator`) - combined storage + ArNS pricing
- Check Balance (`balances`)
- Redeem Gift (`redeem`)
- Service Info (`gateway-info`)

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
- `useCreditsForCrypto`: Crypto to credits conversion calculations (newly implemented)
- `useFileUpload`: Multi-chain upload logic with proper signers
- `useFolderUpload`: Folder upload with drag & drop support
- `useArNSName`: Primary name fetching with cache management
- `useArNSPricing`: ArNS domain pricing calculations and affordable options
- `useCountries`: Country data for payment forms (newly implemented)
- `useDebounce`: Input debouncing (500ms default)
- `useTurboConfig`: Centralized Turbo SDK configuration with environment-based settings
- `useAddressState`: Address state management
- `useGatewayInfo`: Gateway information fetching
- `useTurboWallets`: Turbo wallet management
- `useUploadStatus`: Upload status tracking

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

# Wallet integrations  
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
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
- `@ardrive/turbo-sdk`: Turbo services integration
- `@ar.io/sdk`: ArNS name resolution and domain management
- `wagmi`: Ethereum wallet integration and Web3 functionality
- `@solana/wallet-adapter-*`: Solana wallet ecosystem
- `zustand`: Global state management with persistence

### UI & Data
- `@tanstack/react-query`: Server state management and caching
- `@stripe/react-stripe-js`: Payment processing
- `@headlessui/react`: Unstyled UI components (dropdowns, modals)
- `react-router-dom`: Client-side routing and navigation
- `lucide-react`: Icon system
- `tailwindcss`: Styling framework

## Current Status

### ✅ Completed Features
- Multi-chain wallet authentication (Arweave, Ethereum, Solana)
- Buy Credits with Stripe checkout including full fiat payment flow
- Complete fiat payment panels with form validation and country selection
- Gift fiat payment flow with dedicated panels (details, confirmation, success)
- File upload with progress tracking (Arweave wallets only)
- Credit sharing between wallets (Wander wallet required for signing)
- Gift credit system (send/redeem)
- ArNS name display with caching
- Balance checking for any wallet
- Developer resources with API documentation
- Pricing calculator with storage estimates
- Services calculator with combined storage + ArNS pricing
- Gateway information display

### ⚠️ Known Limitations
- **Crypto Payments**: UI ready with conversion calculations, backend integration pending
- **Share Credits**: Requires Wander wallet for transaction signing
- **ArNS Purchase**: Search UI ready, purchase not connected
- **Upload Restrictions**: Limited to Arweave wallets only
- **Deploy Site**: Feature temporarily disabled

### 🔄 Wallet Capability Matrix
| Feature | Arweave | Ethereum | Solana |
|---------|---------|----------|--------|
| Buy Credits | ✅ | ✅ | ✅ |
| Upload Files | ✅ | ❌ | ❌ |
| Share Credits | ✅ | ❌ | ❌ |
| ArNS Names | ✅ | ✅ | ❌ |

## Development Best Practices

### File Upload Development
- Only Arweave wallets (`window.arweaveWallet`) can upload files
- Use `useFileUpload` hook for proper multi-chain signer creation
- Progress tracking includes both signing and upload phases
- Error handling includes per-file error states


### State Management
- Persistent state: wallet info, ArNS cache, upload history
- Ephemeral state: balances, payment flows, UI state
- Custom events for cross-component communication (`refresh-balance`)
- 1-hour cache for ArNS name resolution

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
- Proper interfaces for API responses (many use `any` currently)
- PageType union for routing
- Consistent error handling with user-friendly messages