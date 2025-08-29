# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Install dependencies (using npm or yarn)
npm install

# Start development server
npm run dev
# Opens at http://localhost:3000

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Type checking  
npm run type-check
```

### Testing
No test suite is currently implemented. The application needs testing infrastructure to be added.

### Package Manager
This project uses yarn as the package manager (configured via packageManager field in package.json). All commands can be run with npm or yarn.

### Command Validation
Commands that can be run without user approval:
- `npm run type-check` - Type checking (safe to run automatically)
- `npm run type-check:*` - Any type-check variant

## Architecture Overview

### Application Flow
The app uses a page-based navigation system with wallet authentication:
1. **Entry Point** (`App.tsx`): Direct page routing based on currentPage state (no Dashboard dependency)
2. **Page Structure**: Each service has dedicated page (TopUpPage, UploadPage, etc.) wrapping panel components
3. **State Management** (`useStore.ts`): Zustand store persists wallet address/type, credits, and ArNS names to localStorage
4. **Provider Stack** (`WalletProviders.tsx`): Wraps app with blockchain, payment, and data fetching providers
5. **Navigation**: Unified waffle menu in header consolidating all services and tools

### Key Architectural Patterns

#### Multi-Chain Wallet Integration
- **Arweave (Wander)**: Direct window.arweaveWallet integration (required for uploads)
  - Uses ArconnectSigner from @ardrive/turbo-sdk/web
  - Required for file uploads and ArNS transactions
- **Ethereum**: Wagmi v2 with MetaMask and WalletConnect connectors  
  - Uses InjectedEthereumSigner from @dha-team/arbundles
  - Supports mainnet chain via http transport
- **Solana**: @solana/wallet-adapter with Phantom and Solflare
  - Uses InjectedSolanaSigner from @dha-team/arbundles
  - Configurable RPC endpoint (default: mainnet-beta)
- **ArNS Names**: Primary name resolution via AR.IO SDK with 1-hour cache

#### Page-Based Navigation Architecture
All services are accessed via dedicated pages with unified navigation:
- **Waffle Menu**: Single dropdown in header consolidating all services
- **Account Services**: Buy Credits, Upload Files, Share Credits, Send Gift, Manage Domains (login required)
- **Public Tools**: Developer Resources, Pricing Calculator, Balance Checker, Redeem Gift
- **Page Structure**: Each service has dedicated page (e.g., TopUpPage) wrapping panel component
- **Mobile Optimized**: Dropdown positioned to prevent viewport bleeding on mobile

#### Payment Integration
- Stripe hosted checkout with success/cancel URLs
- Direct API calls to payment service endpoints  
- Real-time USD to credits conversion with debouncing
- Payment success callbacks trigger balance refresh

#### Turbo SDK Integration
```typescript
import { TurboFactory } from '@ardrive/turbo-sdk/web';

// Configuration in constants.ts
const turboConfig: TurboUnauthenticatedConfiguration = {
  paymentServiceConfig: { url: defaultPaymentServiceUrl },
  uploadServiceConfig: { url: uploadServiceUrl },
  processId: arioProcessId,
};

// Usage patterns
const turbo = TurboFactory.unauthenticated(turboConfig);
const turbo = TurboFactory.authenticated({ signer, ...turboConfig });
```

### Service Architecture

#### Environment-Based Configuration
```typescript
const isProd = import.meta.env.VITE_NODE_ENV === 'production';
const serviceUrl = isProd 
  ? 'https://payment.ardrive.io' 
  : 'https://payment.ardrive.dev';
```

#### API Endpoints Pattern
All API calls follow this structure:
- Base URL from environment
- Version prefix `/v1/`
- Resource-based routing
- Query parameters for filters

### Component Patterns

#### Modal System
Base modal component with consistent styling and behavior:
- `BaseModal.tsx` provides foundation
- Specialized modals extend base functionality
- Portal rendering to body

#### Copy Button Pattern
Reusable component for one-click copying:
```typescript
<CopyButton textToCopy={value} />
```

#### Custom Hooks
- `useWincForOneGiB`: Storage pricing calculations
- `useCreditsForFiat`: USD to credits conversion
- `useDebounce`: Input debouncing (500ms default)
- `useFileUpload`: Turbo SDK upload logic with proper signers
- `useArNSName`: ArNS primary name fetching with cache

### Styling System
- Tailwind CSS with custom color tokens and consistent red/white/charcoal theme
- Dark theme: `bg-canvas` (#171717), `bg-surface` (#1F1F1F)  
- Custom color palette: fg-muted (#ededed), link (#A3A3AD), high (#CACAD6)
- **Primary Brand Color**: turbo-red (#FE0230) used consistently for all accents, buttons, and highlights
- **Secondary Colors**: green (#18A957) for success states only, blue removed from service UIs
- Rubik font family throughout (@fontsource/rubik)
- Responsive breakpoints: mobile-first approach

#### Enhanced Service Panel Design Pattern
All service panels follow this consistent template:
```jsx
// Inline Header Pattern
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

// Info Cards (if applicable)
<div className="grid md:grid-cols-3 gap-4">
  <div className="bg-surface rounded-lg p-4 border border-default">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-turbo-red" />
      </div>
      <div>
        <h4 className="font-bold text-fg-muted mb-1 text-sm">[Feature Title]</h4>
        <p className="text-xs text-link">[Feature Description]</p>
      </div>
    </div>
  </div>
</div>
```

### State Persistence
Zustand with selective persistence:
```typescript
persist(
  (set) => ({ /* state */ }),
  {
    name: 'turbo-gateway-store',
    partialize: (state) => ({ 
      address: state.address, 
      walletType: state.walletType,
      arnsNamesCache: state.arnsNamesCache
    }),
  }
)
```

## Important Configuration Files

### TypeScript Configuration
- Strict mode enabled
- Path alias: `@/*` → `./src/*`
- Target: ES2022
- JSX: react-jsx

### Vite Configuration
- Port 3000 for dev server with host: true for network access
- Node polyfills for crypto operations (Buffer, global, process)
- WalletConnect resolution fixes and optimizeDeps configuration
- Source maps enabled in production
- Path alias: `@` resolves to `./src`
- External modules: fs, path, os, crypto for Node.js compatibility
- React plugin with optimized dev experience

### Environment Variables
Required for production:
```bash
VITE_NODE_ENV=production
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_SOLANA_RPC=https://api.mainnet-beta.solana.com
```

Service endpoints (optional - have defaults):
```bash
VITE_PAYMENT_SERVICE_URL=https://payment.ardrive.io
VITE_UPLOAD_SERVICE_URL=https://upload.ardrive.io
```

## Current Features & Status

### ✅ Completed Features
- **Buy Credits (TopUpPage)**: Stripe checkout with enhanced UI, credit calculations, info cards
- **Upload Files (UploadPage)**: Progress tracking, transaction IDs, technical feature cards
- **Share Credits (ShareCreditsPage)**: Credit delegation with enhanced forms and validation
- **Send Gift (GiftPage)**: Email-based credit gifting with professional form styling
- **Redeem Gift (RedeemPage)**: Enhanced gift code redemption with icons and validation
- **Manage Domains (DomainsPage)**: ArNS name search with enhanced styling (purchase not connected)
- **Developer Resources**: Tabbed interface (Quick Start, API Endpoints, Guides) with copy buttons
- **Balance Checker**: Multi-chain wallet balance lookup with technical info cards
- **Pricing Calculator**: Enhanced storage cost calculator with CTAs
- **Service Information**: Real-time gateway metrics, service information and technical configuration
- **ArNS Names**: Primary name display throughout UI with caching

### Current Navigation Structure
- **Waffle Menu**: Single unified dropdown replacing previous separate dropdowns
  - **Account Services** (login required): Buy Credits, Upload Files, Share Credits, Send Gift, Manage Domains
  - **Public Tools**: Developer Resources, Pricing Calculator, Balance Checker, Redeem Gift
- **Profile Dropdown**: Balance display with refresh, ArNS name, wallet address, disconnect
- **Page Structure**: All services are standalone pages (TopUpPage, UploadPage, ShareCreditsPage, etc.)
- **URL Parameters**: Support for deep linking to specific pages (`?page=redeem`)
- **Mobile Responsive**: Dropdown positioning optimized to prevent viewport overflow

### Input Validation Patterns
Credit amount inputs use controlled text inputs with:
- Text state + numeric state separation
- onBlur validation and cleanup
- Min/max enforcement
- Clear error messaging
- Proper decimal handling

Example:
```typescript
const [creditAmountInput, setCreditAmountInput] = useState('1');
const [creditAmount, setCreditAmount] = useState(10);

onChange={(e) => {
  const inputValue = e.target.value;
  setCreditAmountInput(inputValue);
  const amount = Number(inputValue);
  if (!isNaN(amount) && amount >= 0) {
    setCreditAmount(amount);
  }
}}

onBlur={() => {
  // Validate and clean up
  if (creditAmount < min) {
    setCreditAmount(min);
    setCreditAmountInput(String(min));
  }
}}
```

## Known Issues & TODOs

### Functionality
- Crypto payments UI ready but not connected to backend
- Share Credits requires Wander wallet (no Ethereum/Solana signer support)
- ArNS domain purchase not yet connected
- Upload limited to Arweave wallets only
- Wallet-specific signer limitations in useFileUpload.ts

### Critical Dependencies
Key packages that drive core functionality:
- `@ardrive/turbo-sdk`: Core Turbo services integration
- `@ar.io/sdk`: ArNS name resolution and domain management  
- `wagmi`: Ethereum wallet integration and Web3 functionality
- `@solana/wallet-adapter-*`: Solana wallet ecosystem
- `zustand`: Global state management with persistence
- `@tanstack/react-query`: Server state management and caching
- `@stripe/react-stripe-js`: Payment processing
- `@headlessui/react`: Unstyled UI components (dropdowns, modals)

### TypeScript
- Several `any` types need proper interfaces, especially in payment-related state
- API response types need to be defined

### Error Handling
- Console.error calls need user-facing error messages
- Network errors need better recovery flows
- Form validation messages need consistency

### Performance
- Large file uploads (>10GB) need chunking implementation
- Images could benefit from lazy loading

### Testing
- No test infrastructure exists
- Critical flows need unit tests
- Component testing setup needed

## Common Tasks

### Adding a New Service Page
1. Create page in `src/pages/` (e.g., `NewServicePage.tsx`) using standard template:
   ```jsx
   import NewServicePanel from '../components/panels/NewServicePanel';
   
   export default function NewServicePage() {
     return (
       <div>
         <div className="rounded-lg border border-default bg-canvas">
           <div className="p-8">
             <NewServicePanel />
           </div>
         </div>
       </div>
     );
   }
   ```
2. Create panel component in `src/components/panels/` following design pattern
3. Add route to `App.tsx` in renderPage() function
4. Add service to Header.tsx accountServices or utilityServices array
5. Update TypeScript types in App.tsx and Header.tsx

### Adding Wallet Support
1. Update `WalletProviders.tsx` with new provider
2. Add connection logic in `WalletSelectionModal.tsx`
3. Update store with new wallet type
4. Handle signer creation in `useFileUpload.ts` if needed

### Modifying Payment Flow
1. Payment service calls in `paymentService.ts`
2. Stripe checkout in `TopUpPanel.tsx`
3. Success callbacks handled in `App.tsx`
4. Balance refresh via custom event

### Updating Navigation
1. Service arrays in `Header.tsx` (accountServices for logged-in, utilityServices for public)
2. Page routing in `App.tsx` renderPage() function  
3. Profile dropdown in `Header.tsx`
4. TypeScript types for PageType and HeaderProps
5. URL parameter handling in `App.tsx` useEffect hook

## Development Best Practices

### File Upload Development
When working with file uploads, remember:
- Only Arweave wallets can upload files (window.arweaveWallet required)
- Ethereum/Solana wallets can only fund credits, not upload
- Upload progress tracking is handled in useFileUpload hook
- Error handling includes per-file error states
- Transaction IDs link to Arweave explorer

### State Management Guidelines
- Use Zustand store for wallet connection and persistent data
- Payment state is ephemeral and cleared after transactions
- ArNS names are cached for 1 hour to reduce API calls
- Balance refresh via custom events (refresh-balance)

### Wallet Integration Notes
- Each wallet type requires different signer configuration
- Test all wallet types when making changes to upload/payment flows  
- WalletConnect requires VITE_WALLETCONNECT_PROJECT_ID
- Solana RPC endpoint configurable via VITE_SOLANA_RPC

### Component Consistency
- All service panels follow the inline header pattern with gradient containers
- Consistent red/white/charcoal color theme throughout
- Enhanced form styling with focus states using `focus:border-turbo-red`
- Copy buttons for all address/ID displays  
- Modal system based on BaseModal component
- Info cards pattern for technical features and explanations

### API Endpoint Display
When showing API endpoints in JSX, escape curly braces for path parameters:
```jsx
// Correct - displays {txId} in browser
<code>/endpoint/{"{txId}"}</code>

// Incorrect - causes JavaScript errors  
<code>/endpoint/{txId}</code>
```