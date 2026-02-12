# Turbo App Product Guide

*A comprehensive guide to all features and capabilities of the unified Turbo Gateway Application*

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Core Features](#core-features)
4. [Account Management](#account-management)
5. [Payment System](#payment-system)
6. [File Management](#file-management)
7. [ArNS Domain System](#arns-domain-system)
8. [Developer Tools](#developer-tools)
9. [Multi-Chain Wallet Support](#multi-chain-wallet-support)
10. [Navigation & User Experience](#navigation--user-experience)
11. [Advanced Features](#advanced-features)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Turbo Gateway Application is a unified platform that consolidates all ArDrive Turbo services into a single, powerful interface. Built for the AR.IO Network, it provides seamless access to:

- **Credit Management**: Buy, share, and gift Turbo credits with fiat and crypto
- **File Storage**: Upload files to the permaweb via Arweave with Just-in-Time payments
- **Site Deployment**: Deploy websites with ArNS integration and automatic manifests
- **Domain Management**: Search, manage, and update ArNS names with owned name tracking
- **Multi-Chain Support**: Arweave, Ethereum, Solana wallet integration plus email authentication
- **Developer Resources**: Complete API documentation, configuration tools, and code examples

The application serves both end-users and developers with an intuitive interface that supports complex workflows while maintaining ease of use.

---

## Getting Started

### Accessing the Application

The Turbo App is accessible through any modern web browser at the deployment URL. No downloads or installations required.

### First-Time Setup

1. **Visit the Landing Page**: Start on the informational landing page to learn about Turbo services
2. **Connect Your Wallet or Email**: Click "Connect Wallet" to access authentication options
3. **Choose Your Method**:
   - Email authentication (Privy) with embedded Ethereum wallet
   - Arweave wallet (Wander)
   - Ethereum wallet (MetaMask/WalletConnect)
   - Solana wallet (Phantom/Solflare)
4. **Explore Services**: Access the waffle menu (Grid3x3 icon) to navigate between features

### System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Authentication**: Email account or wallet extension
- **Network**: Stable internet connection
- **Device**: Desktop, tablet, or mobile device with responsive design support

---

## Core Features

### 🏠 Landing Page & Navigation

**Public Landing Page**
- Hero section with "How does it work?" explanation
- Turbo by the Numbers: Real performance metrics (20B+ files, 200+ TiB, ~860 files/sec, 99.9% uptime)
- Trusted by the Best: Carousel with Forward Research, Drip Haus, Manifold, Meta, RedStone, KYVE, Metaplex, Load Network, Solana Mobile
- Interactive Feature Explorer: Browse all 9 service features with dropdown/sidebar navigation
- Build Section: 6 cards organized by function
  - Getting Started
  - Paying for Uploads
  - Host Decentralized Websites
  - Accessing Data
  - Advanced Uploading
  - Run a Gateway
- Resources Section: 13 cards organized into 3 categories
  - API Documentation (3 cards): Upload Service API, Payment Service API, Turbo Gateway API
  - Learn (6 cards): AR.IO Gateways, ArNS, Wayfinder, Credit Sharing, AR.IO Network, ANS-104 Bundles
  - Source Code (4 cards): Turbo SDK, Upload Services, Payment Service, AR.IO Node
- The Expanding Turbo Ecosystem: Data Indexer, Fast Lane (with x402 link), Data Feeds
- ArDrive Section: No-code solution promotion with link to ardrive.net
- Terminal Quick Start: npm install command with copy functionality
- Free Tier Callout: Files under 100 KiB completely FREE

**Navigation System**
- **Waffle Menu**: Grid3x3 icon in header providing access to all services
- **React Router**: Direct URL access to any feature (e.g., `/upload`, `/domains`)
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Sticky Header**: Always-accessible navigation bar with wallet info and balance

### 💳 Buy Credits

**Email Authentication Support**
- Privy integration for email-only sign-in
- Automatically creates embedded Ethereum wallet for email users
- No wallet extension required for fiat payments

**Fiat Payments (Stripe Integration)**
- Complete payment flow with form validation
- Country selection (190+ countries) with payment method restrictions
- Real-time USD to credits conversion with debouncing (500ms)
- Multi-step process: Details → Confirmation → Success
- Payment callback handling with automatic balance refresh
- Minimum amounts enforced with clear error messages

**Payment Flow**
1. **Payment Details**: Enter credit amount, select country, provide email/payment info
2. **Payment Confirmation**: Review transaction summary, accept Terms of Service
3. **Payment Success**: Confirmation with balance update and next steps

**Crypto Payments**
- Direct wallet payments via MetaMask, Phantom, Solflare
- Automatic network switching for correct blockchain
- Real-time cryptocurrency to credits conversion with live rates
- Support for 11 token types:
  - **Native Tokens**: AR, ARIO, ETH, Base-ETH, SOL, KYVE, POL
  - **Stablecoins**: USDC on Ethereum, USDC on Base, USDC on Polygon
- Transaction retry mechanism for failed payments
- Network-specific processing times (instant to 30 minutes)

### 📤 Upload Files

**Just-in-Time (JIT) Payment System**
- Automatic credit top-up during upload if balance is insufficient
- Configurable per token type with defaults:
  - ARIO: 200 tokens (~$20)
  - SOL: 0.15 tokens (~$22.50)
  - Base-ETH: 0.01 tokens (~$25)
  - Base-USDC: 25 tokens (~$25)
- Buffer multiplier (1.1x default) to prevent failed uploads
- Opt-in system with persistent preferences
- Seamless user experience without manual top-up interruptions
- Support for ARIO, SOL, Base-ETH, and Base-USDC (fast-confirming networks only)
- OnDemandFunding integration with Turbo SDK

**File Upload Interface**
- Drag & drop support with visual feedback and gradient container
- Batch upload capability for multiple files
- "Add More" button to append files without clearing selection
- Real-time progress tracking per file with cancel support
- Cost calculator with GiB estimates and real-time pricing
- FREE tier highlighting (files under 100 KiB)
- Upload progress summary with single file view during upload
- Clean UI that hides file selection during active uploads

**Upload Process**
1. **File Selection**: Drag files, click to browse, or add more to existing selection
2. **JIT Payment Check**: Automatic balance check with optional auto-top-up
3. **Cost Review**: Real-time pricing display with total costs and buffer
4. **Wallet Signing**: Transaction signing via connected Arweave wallet
5. **Upload Progress**: Real-time progress with AbortController support for cancellation
6. **Receipt Generation**: Transaction IDs with Arweave explorer links

**Supported Features**
- Individual file upload with detailed progress tracking
- Folder upload with recursive file processing
- Upload cancellation with proper cleanup
- Error handling per file with retry mechanisms
- Upload history tracking in persistent storage
- ArNS assignment during upload for permanent links

**Wallet Requirements**
- Arweave, Ethereum, and Solana wallets can upload files
- All wallet types support file uploads with proper signers
- Email authentication users can upload via embedded Ethereum wallet

### 📸 Capture Webpages

**Webpage Capture System**
- Full-page screenshot capture of any public webpage
- Integration with turbo-capture-service backend
- 90-second timeout for complete page rendering
- PNG format screenshots with viewport metadata

**Capture Features**
- URL input with validation
- Progressive disclosure: ArNS and upload options appear after capture
- Optional ArNS name/undername assignment (Arweave wallets only)
- Automatic file naming: `capture-{domain}-{timestamp}.png`
- Standardized metadata tags for organization
- Unified upload history with camera icon badge

**Capture Metadata Tags**
All captures include standardized tags:
- Common: `App-Name`, `App-Feature: 'Capture'`, `App-Version`
- Capture-specific: `Original-URL`, `Title`, `Viewport-Width`, `Viewport-Height`, `Captured-At`

**Capture Workflow**
1. **URL Entry**: Enter public webpage URL to capture
2. **Screenshot Capture**: Service captures full-page screenshot (90s timeout)
3. **Preview**: Review captured image with metadata
4. **ArNS Assignment** (Optional): Associate with owned ArNS name/undername
5. **Upload Confirmation**: Confirm cost and upload to Arweave
6. **Receipt**: Receive transaction ID and Arweave link

**Configuration**
- Capture service URL configurable in Developer Resources
- Separate production/development URLs supported
- Dynamic configuration via store settings

### 🌐 Deploy Sites

**Site Deployment**
- Complete website deployment to Arweave with manifest generation
- Data export functionality for site packages
- Drag & drop folder upload support
- Deployment progress tracking with real-time updates
- Homepage and 404 error page configuration
- ArNS association during deployment

**Just-in-Time (JIT) Payment for Deployments**
- Same JIT payment system as file uploads
- Automatic credit top-up if balance insufficient
- Buffer multiplier to ensure successful deployment
- Support for ARIO, SOL, Base-ETH, and Base-USDC tokens
- Seamless deployment without manual credit management

**ArNS Integration**
- Associate deployments with owned ArNS names
- Support for base names (@) and custom undernames
- TTL configuration (default 600 seconds / 10 minutes)
- ANT record updates via ArconnectSigner
- Automatic owned names fetching with 6-hour cache
- Manual refresh option for owned names

**Deployment Workflow**
1. **Site Preparation**: Select folder, configure homepage/404 pages
2. **JIT Payment Check**: Automatic balance verification with optional auto-top-up
3. **Deployment Upload**: Upload all site files with progress tracking
4. **Manifest Creation**: Automatic manifest generation with proper paths
5. **ArNS Association**: Optional linking to owned domain names
6. **Confirmation**: Receive manifest ID and access URLs

**Deployment Management**
- Recent deployments page (`/deployments`) with full history
- Transaction IDs and Arweave explorer links
- ArNS name associations displayed
- Deployment timestamps and status tracking

### 🤝 Share Credits

**Credit Sharing System**
- Wallet-to-wallet credit transfers (delegated credits)
- Preset expiration options: 24 hours, 7 days, 30 days, never
- Recipient tracking and management with persistent history
- Share history with transaction details and timestamps
- Support for multiple recipients simultaneously

**Sharing Process**
1. **Recipient Setup**: Enter destination wallet address (Arweave, Ethereum, Solana)
2. **Amount Configuration**: Specify credit amount to share (minimum enforced)
3. **Expiration Settings**: Choose when shared credits expire
4. **Transaction Signing**: Sign transaction with Wander wallet (Arweave required)
5. **Confirmation**: Receive sharing confirmation and tracking info

**Credit Revocation**
- Revoke unused shared credits from recipients
- Real-time balance updates after revocation
- Transaction history tracking in persistent storage
- Clear UI showing revocable amounts

**Wallet Requirements**
- Only Arweave wallets (Wander) can share and revoke credits
- Ethereum and Solana wallets cannot share credits

### 🎁 Gift System

**Send Gifts**
- Send credits to anyone via email address (no wallet required)
- Optional personal messages for recipients
- Gift code generation and automatic email delivery
- Complete gift payment flow with dedicated panels
- Support for both fiat and crypto gift payments

**Gift Creation Process**
1. **Gift Details**: Enter recipient email and credit amount
2. **Personal Message**: Add optional message to recipient
3. **Payment Method**: Choose fiat (Stripe) or crypto payment
4. **Payment Processing**: Complete payment with GiftPaymentDetailsPanel, GiftPaymentConfirmationPanel
5. **Gift Delivery**: Automatic email delivery with redemption code via GiftPaymentSuccessPanel

**Redeem Gifts**
- Dedicated redemption page (`/redeem`)
- Gift code validation and processing
- Credit allocation to connected wallet or email account
- Redemption confirmation with balance update
- No wallet required to receive - can redeem later

**Wallet Requirements**
- No wallet required to send or receive gifts
- Can use email authentication for gift redemption

---

## Account Management

### 📊 Account Overview

**Account Page (`/account`)**
- Comprehensive dashboard with all account information
- Wallet connection status and details
- Credit balance with shared credits tracking
- Recent activity sections for uploads and deployments
- Quick access to all account management features

**Balance Cards Grid**
- Visual balance display for connected wallet
- Credit balance breakdown (owned + shared)
- Real-time balance updates via `refresh-balance` custom events
- Storage capacity estimates based on credit balance
- Shared credits section with delegation tracking

**Activity Overview**
- Recent uploads with transaction links and file details
- Recent deployments with ArNS associations and manifest links
- Transaction history with timestamps and status tracking
- Activity filtering and chronological display
- Direct links to Arweave explorer for all transactions

### 👤 Wallet Overview Card

**Connected Wallet Information**
- Wallet address display with CopyButton functionality
- Wallet type identification (Arweave/Ethereum/Solana/Email)
- ArNS primary name resolution and display (24-hour cache)
- Connection status with disconnect option
- Visual wallet type indicators

**Credit Sharing Section**
- Manage shared credits (only for Arweave wallets)
- View sharing history with recipient addresses
- Expiration dates for time-limited shares
- Revoke button for unused shared credits
- Track credit utilization by recipients

**Email Authentication Users**
- Display embedded Ethereum wallet address
- Balance information for Privy-managed wallet
- Limited feature access (buy credits only)
- Clear indication of authentication method

### 📈 Recent Activity Sections

**Recent Uploads Section**
- Upload history from persistent store with timestamps
- Transaction IDs with Arweave explorer links (format: https://arweave.net/{txId})
- Upload status tracking (confirmed/finalized)
- File information: name, size, content type
- ArNS name associations if assigned during upload
- Error logs for failed uploads with retry options

**Recent Deployments Section**
- Deployment history from persistent store
- Manifest IDs with access URLs
- ArNS name associations with .ar.io links
- Homepage and 404 page configuration display
- Deployment timestamps and status
- Site management with update/redeploy options

**Balance Checker Tool**
- Check credit balance for any wallet address (`/balances`)
- Multi-chain support: Arweave, Ethereum, Solana
- Display owned credits and shared credits separately
- Storage capacity estimates
- No authentication required - public tool

---

## Payment System

### 💰 Fiat Payment Integration

**Payment Details Panel**
- Form validation with real-time error messages
- Country selection from 190+ countries affecting payment methods
- Credit amount input with minimum validation (varies by country)
- Email field (required if not authenticated)
- Real-time USD to credits conversion display with debouncing
- Clear pricing breakdown and total display

**Payment Confirmation Panel**
- Transaction summary with all details:
  - Credit amount to receive
  - Total cost in USD
  - Target wallet address
  - Payment method information
- Final cost confirmation before processing
- Terms of service checkbox requirement
- Secure Stripe Elements integration for card input
- Loading states during payment processing

**Payment Success Panel**
- Transaction confirmation with receipt details
- Credit balance update notification with new balance display
- Next steps guidance:
  - Upload files
  - Deploy sites
  - Share credits
- Success animation and positive user feedback
- Automatic `refresh-balance` event trigger

**Payment Callback Handling**
- URL parameter processing: `?payment=success` or `?payment=cancelled`
- Automatic balance refresh on success
- User notifications via alerts
- Seamless integration with Stripe redirect flow

### 🎁 Gift Payment Flow

**Gift Payment Details Panel**
- Recipient information: email address (required)
- Gift amount specification with minimum enforcement
- Personal message composition (optional, up to 500 characters)
- Payment method selection: fiat or crypto
- Real-time validation and error feedback

**Gift Payment Confirmation Panel**
- Gift summary with all details:
  - Recipient email
  - Gift amount in credits
  - Personal message preview
  - Payment amount in USD or crypto
- Gift delivery timeline information (immediate email delivery)
- Final confirmation before processing
- Terms of service acknowledgment

**Gift Payment Success Panel**
- Gift creation confirmation with unique gift code
- Delivery status: email sent confirmation
- Gift code display with copy functionality
- Recipient notification confirmation
- Instructions for recipient to redeem
- Return to dashboard or send another gift options

### 🪙 Crypto Payment System

**Supported Cryptocurrencies**

*Native Blockchain Tokens*:
- **Arweave (AR)**: Native Arweave token (slow, 10-60 min)
- **ARIO**: AR.IO token on AO/Arweave (medium, 5-15 min, JIT enabled)
- **Ethereum (ETH L1)**: Ethereum mainnet (slow, 10-30 min)
- **Base-ETH**: Ethereum on Base L2 (fast, instant-3 min, JIT enabled)
- **Solana (SOL)**: Solana mainnet (fast, instant-2 min, JIT enabled)
- **KYVE**: KYVE network token (medium)
- **POL**: Polygon network (fast, 2-5 min)

*Stablecoins (pegged to $1 USD)*:
- **USDC on Ethereum**: USDC on Ethereum L1 (slow, 10-30 min)
- **USDC on Base**: USDC on Base L2 (fast, instant-3 min, JIT enabled)
- **USDC on Polygon**: USDC on Polygon (fast, 2-5 min)

**Payment Features**
- Direct wallet payments through MetaMask, Phantom, Solflare, Wander
- Automatic network detection and switching
- Network validation before transaction
- Transaction retry mechanism for failed payments
- Processing time indicators per token type

**Crypto Confirmation Panel**
- Payment address generation for selected cryptocurrency
- Dynamic gateway URL based on token type (configured in tokenMap)
- QR code display for mobile wallet scanning
- Amount conversion with real-time exchange rates
- Payment instructions: amount, address, network
- Payment monitoring with status updates
- Transaction verification with blockchain explorers

**Token Gateway Configuration**
- Configurable RPC endpoints per token type
- Production and development environment presets
- Custom configuration support in Developer Tools
- Automatic network detection and switching

---

## File Management

### 📁 Upload System

**File Upload Panel**
- Multi-file drag and drop interface with gradient visual container
- File type detection and validation
- Size limits with warnings (100 KiB free threshold prominently displayed)
- Cost calculation with GiB conversion and real-time pricing
- Support for all file types and formats

**Just-in-Time (JIT) Payment Feature**
- Automatic credit balance checking before upload
- Optional auto-top-up if balance insufficient
- JitPaymentCard component with configuration:
  - Enable/disable JIT payments
  - Set maximum token amount per network
  - Configure buffer multiplier (default 1.1 = 10% buffer)
- Token-specific defaults:
  - ARIO: 200 tokens (~$20)
  - SOL: 0.15 tokens (~$22.50)
  - Base-ETH: 0.01 tokens (~$25)
- OnDemandFunding integration with Turbo SDK
- Seamless experience with no interruption to upload flow
- Clear messaging when JIT payment is triggered

**Upload Progress Tracking**
- Single file view during upload with clean UI
- Real-time progress bars per file with percentage
- Upload speed and estimated time remaining
- Overall upload progress indication for batch uploads
- Cancel button with AbortController support for graceful cancellation
- Error handling with specific error messages per file
- Retry mechanisms for failed uploads with clear UI
- Success indicators with transaction IDs

**File Selection Enhancement**
- "Add More" button to append files without clearing existing selection
- "Clear all" button with destructive red hover color
- Individual file removal with X button (red hover)
- File list with size, type, and status display
- Uniform color scheme: white for positive actions, red for destructive

**Upload History**
- Complete upload history tracking in persistent Zustand store
- Transaction details with timestamps
- Arweave explorer links for all uploads
- File information: name, size (bytes), content type
- Upload status tracking (confirmed/finalized/failed)
- ArNS name associations if assigned
- Error logs for troubleshooting failed uploads
- Receipt data storage for verification

**Connection Warnings**
- Clear messaging when non-Arweave wallet connected
- Explanation of upload wallet requirements
- Guidance to connect Wander wallet
- Link to wallet connection modal

### 🚀 Site Deployment

**Deploy Site Panel**
- Folder upload with drag & drop support
- Site file preparation and packaging
- Homepage configuration (default: index.html)
- 404 error page configuration (optional)
- Deployment cost calculation with real-time pricing
- Progress tracking during deployment with file count
- Data export functionality for site manifests

**Just-in-Time (JIT) Payment for Deployments**
- Same JIT payment system as file uploads
- JitPaymentCard component with deployment-specific settings
- Automatic balance checking before deployment
- Optional auto-top-up with configurable limits
- Support for ARIO and Base-ETH tokens
- Buffer multiplier to prevent deployment failures
- Seamless deployment workflow without manual credit management

**Deploy Confirmation Modal**
- Compact modal design (max-w-2xl) optimized for vertical space
- Deployment summary:
  - Domain (ArNS name if selected)
  - Files count and total size
  - Estimated cost in Credits
  - Homepage and 404 page display
- JIT payment info if enabled
- Terms of Service acknowledgment (simplified text)
- Deploy button with loading state
- Close/cancel options

**ArNS Association**
- Owned ArNS names fetching from AR.IO SDK
- ArNSAssociationPanel for name selection
- Base name (@) deployment support
- Custom undername creation and selection
- Undername input with validation (no spaces or special chars except hyphen)
- ANT record updates with proper processId
- Transaction signing via ArconnectSigner
- 6-hour cache for owned names with manual refresh
- Loading states during name fetch and update

**Deployment Management**
- Deployment history in persistent Zustand store
- Recent Deployments page (`/deployments`) with full list
- Manifest IDs with Arweave explorer links
- ArNS access URLs (e.g., https://yourname.ar.io)
- Site information: file count, total size, timestamp
- Homepage and 404 page configuration display
- Deployment status tracking
- Update/redeploy options for existing sites

**Deployment Workflow**
1. **Site Preparation**: Select folder via drag & drop or file picker
2. **Configuration**: Set homepage (default index.html) and optional 404 page
3. **ArNS Selection**: Optionally associate with owned ArNS name or undername
4. **JIT Payment Check**: Automatic balance verification with auto-top-up option
5. **Cost Review**: Review deployment cost and file count
6. **Confirmation**: Accept terms and confirm deployment
7. **Upload Process**: Batch file upload with progress tracking
8. **Manifest Creation**: Automatic manifest generation with proper paths
9. **ArNS Update**: If associated, update ANT record to point to manifest (TTL: 600s)
10. **Completion**: Receive manifest ID, ArNS URL, and success confirmation

**Wallet Requirements**
- Arweave, Ethereum, and Solana wallets can deploy sites
- All wallet types support site deployment with proper signers
- ArconnectSigner required for ArNS/ANT updates (Arweave wallets only)
- Email authentication users can deploy via embedded Ethereum wallet

---

## ArNS Domain System

### 🔍 Domain Search

**ArNS Panel (Domain Search)**
- Real-time domain availability checking via AR.IO SDK
- Registration period selection: 1, 2, 5, 10 years
- Credit-based pricing calculations with dynamic rates
- Name validation: lowercase, alphanumeric, hyphens
- Search history tracking in local state
- Loading states during availability checks

**Domain Pricing**
- Dynamic pricing based on name length and demand
- Credit cost calculations from AR.IO process
- Registration period discounts for longer terms
- Affordable domain suggestions when primary choice unavailable
- Price comparison across different registration periods

**Search Features**
- Instant search with debouncing
- Name validation with clear error messages
- Availability status with visual indicators
- Pricing display per selected registration period
- Educational content about ArNS benefits

**Purchase Status**
- Search UI fully functional
- Purchase functionality planned but not yet connected
- Clear messaging about upcoming purchase capability
- Integration preparation with AR.IO process

### 🏠 Owned Names Management

**Primary Name Resolution**
- AR.IO SDK integration for primary name lookup
- 24-hour cache per wallet address
- Automatic cache refresh on expiration
- Primary name display throughout application:
  - Header wallet display
  - Account page
  - Transaction receipts
- Loading states with skeleton placeholders
- Error handling with fallback to address display

**Owned Names Panel**
- Fetch all owned ArNS names via AR.IO SDK
- Display owned names with current targets
- ANT state tracking: processId, current target, undernames
- Manual refresh with button (bypasses 6-hour cache)
- 6-hour cache with automatic updates
- Loading states during fetch operations
- Empty state messaging when no names owned

**ANT Record Updates**
- Update ArNS names to point to new manifest IDs
- Support for base names (@) and custom undernames
- Undername creation with validation
- TTL configuration (default 600 seconds / 10 minutes)
- Transaction signing via ArconnectSigner
- Update confirmation with transaction ID
- Status tracking: pending → confirmed
- Error handling with user-friendly messages

**ArNS Name Display**
- Primary name shown in header next to wallet address
- Owned names list in account page
- Name associations in upload/deployment history
- .ar.io domain links for deployed sites
- Copy functionality for names and URLs

### 🔗 Site Association

**ArNSAssociationPanel**
- Modal interface for associating deployments with ArNS names
- Dropdown selection of owned names
- Base name (@) option for root deployment
- Custom undername input with validation
- Current target display (what name currently points to)
- Update confirmation with new target manifest ID
- TTL display (600s default)
- Transaction signing and status tracking

**Association Workflow**
1. **Name Selection**: Choose from owned ArNS names dropdown
2. **Record Type**: Select base name (@) or create custom undername
3. **Undername Input**: If custom, enter undername (validated)
4. **Review**: Confirm current target → new target change
5. **Sign Transaction**: ArconnectSigner for ANT update
6. **Confirmation**: Receive transaction ID and updated .ar.io URL

**Wallet Requirements**
- Only Arweave wallets can update ArNS records
- ArconnectSigner required for ANT operations
- Ethereum and Solana wallets cannot manage ArNS

---

## Developer Tools

### 📚 Developer Resources Page

**Tab Navigation**
- Quick Start: Installation and basic examples
- API Endpoints: Complete API documentation with examples
- Guides: Curated learning resources
- Configuration: Environment and endpoint settings
- On the Horizon: Upcoming features preview

**Quick Start Tab**
- Installation instructions: `npm i @ardrive/turbo-sdk`
- Basic upload example with copy button
- Create top-up example with Stripe
- Upload folder example
- All code examples with syntax highlighting and copy functionality

**API Endpoints Tab**
- **Upload Service API** (https://upload.ardrive.io/api-docs)
  - POST /tx - Upload signed data item
  - GET /tx/:id/status - Check upload status
- **Payment Service API** (https://payment.ardrive.io/api-docs)
  - GET /price/:currency/:amount - Get fiat conversion rates
  - POST /top-up/payment-intent - Create payment session
- **Gateway Services API** (varies by gateway)
  - GET /:txId - Retrieve data by transaction ID
  - POST /tx - Submit transaction to network
  - GET /ar-io/resolver/:name - Resolve ArNS name
  - POST /graphql - GraphQL query interface

**Guides Tab** (Aligned with Homepage Build Section)
- **Getting Started**: Create your first upload integration (https://docs.ar.io/build/upload/bundling-services)
- **Paying for Uploads**: Turbo Credits as payment medium (https://docs.ar.io/build/upload/turbo-credits)
- **Host Decentralized Websites**: Deploy webpage/app to Arweave with ArNS (https://docs.ar.io/build/guides/hosting-decentralized-websites)
- **Accessing Data**: Resilient decentralized access (https://docs.ar.io/build/access)
- **Advanced Uploading**: Code-first examples (https://docs.ar.io/build/upload/advanced-uploading-with-turbo)
- **Run a Gateway**: Join decentralized network (https://docs.ar.io/build/run-a-gateway)

**Configuration Tab**
- Environment selection: Production / Development / Custom
- Endpoint configuration:
  - Payment Service URL
  - Upload Service URL
  - Gateway URL
  - Stripe Publishable Key
  - AR.IO Process ID
- Token Gateway Map (collapsible):
  - Configurable RPC URLs per token type
  - Support for: arweave, ario, ethereum, base-eth, solana, kyve, matic, pol
- Apply Changes button (triggers page reload)
- Reset to Production button
- Warning for non-production endpoints

**On the Horizon Tab**
- **Data Indexer**: Register custom on-chain indexes of Arweave data
- **Fast Lane**: Avoid rate limits with priority access and dedicated bandwidth with x402 (https://www.coinbase.com/developer-platform/products/x402)
- **Data Feeds**: Subscribe to real-time notifications for new data uploads

### 🧮 Pricing Calculators

**Storage Pricing Calculator (`/calculator`)**
- Real-time storage cost calculations using Turbo SDK
- File size input with unit selection (KiB/MiB/GiB)
- Instant winc (credits) to USD conversion
- Storage capacity estimates from credit amounts
- Reverse calculation: credits → storage capacity
- FREE tier highlighting (under 100 KiB)
- Batch calculation support for multiple files

**Services Calculator (`/services-calculator`)**
- Combined storage and ArNS pricing
- Multi-service cost estimation:
  - File storage costs
  - Website deployment costs
  - ArNS registration costs by period
  - Total service package pricing
- Budget planning with breakdown
- Interactive cost modeling
- Comparison across different service combinations

### 🔧 Gateway Information (`/gateway-info`)

**Service Endpoints Display**
- Payment service URL with copy button
- Upload service URL with copy button
- Gateway URL configuration
- Environment indicator (production/development/custom)
- AR.IO Process ID display

**Configuration Details**
- Current configuration mode
- Token map with all RPC URLs
- Stripe configuration status
- Network connectivity indicators

**Gateway Metrics** (if available)
- Service uptime statistics
- Request processing times
- Storage capacity information
- Network health indicators

---

## Multi-Chain Wallet Support

### 📧 Email Authentication (Privy)

**Email-Only Sign-In**
- Privy integration (`@privy-io/react-auth`) for email authentication
- No wallet extension required
- Configuration: `loginMethods: ['email']` (wallet connections disabled)
- Automatically creates embedded Ethereum wallet for users

**Embedded Wallet Features**
- Privy-managed embedded Ethereum wallet created on sign-in
- Access via `useWallets()` hook from Privy
- wallet.walletClientType === 'privy' for identification
- Ethereum provider accessible via `wallet.getEthereumProvider()`
- ethers.BrowserProvider wrapper for transaction signing

**User Experience**
- Seamless email-based authentication
- No wallet extension installation needed
- Automatic wallet creation and management
- Clear messaging about feature limitations
- Upgrade path to full wallet for additional features

### 🦌 Arweave Integration (Wander Wallet)

**ArconnectSigner Support**
- Full Turbo SDK integration via `ArconnectSigner`
- Native Arweave transaction signing with proper data item creation
- Direct `window.arweaveWallet` API integration
- Complete permaweb functionality access

**Wallet Features**
- File signing and upload capabilities
- ArNS name management and updates
- Credit sharing and delegation
- ANT (Atomic NFT) record updates
- Site deployment with manifest creation

**Supported Operations**
- ✅ Buy Credits (Fiat & Crypto) - Full support
- ✅ Upload Files - Full support with JIT payments
- ✅ Deploy Sites - Full support with ArNS association
- ✅ Share Credits - Full delegation capabilities
- ✅ ArNS Name Display - Primary name with 24h cache
- ✅ Update ArNS Records - Full ANT management
- ✅ Gift Credits - Send gifts via email

**Technical Implementation**
- TurboFactory.authenticated with ArconnectSigner
- Proper error handling for connection issues
- Transaction signing with user confirmation
- Receipt generation with explorer links

### 🦊 Ethereum Integration (MetaMask / WalletConnect)

**Wagmi v2 Framework**
- Direct Ethereum connection (not through Privy)
- MetaMask connector with automatic detection
- WalletConnect v2 integration for mobile
- HTTP transport for mainnet via configured RPC
- ethers.BrowserProvider for transaction signing

**Wallet Features**
- Fiat and crypto payment support (ETH, Base-ETH, POL, USDC variants)
- Embedded wallet detection for Privy users
- Automatic network detection and switching
- Multi-network support: Ethereum L1, Base L2, Polygon
- USDC stablecoin payments on all three networks
- ArNS name display (read-only)
- JIT payments for Base-ETH and Base-USDC

**Network Auto-Switching**
- Detects current MetaMask network before payment
- Automatically switches to correct network per token:
  - USDC/ETH → Ethereum Mainnet (chain ID 1)
  - USDC on Base/Base-ETH → Base Mainnet (chain ID 8453)
  - USDC on Polygon/POL → Polygon Mainnet (chain ID 137)
- Adds networks to MetaMask if not already configured
- 1-second wait after switch for provider refresh
- Clear error messages if switch fails

**Supported Token Types**
- **Ethereum L1**: ETH, USDC (slower, 10-30 min confirmations)
- **Base L2**: Base-ETH, Base-USDC (fast, instant-3 min, JIT enabled)
- **Polygon**: POL, Polygon-USDC (fast, 2-5 min)

**Technical Implementation**
- TurboFactory.authenticated with ethers signer
- Token type override for JIT: "ethereum", "base-eth", "pol", "usdc", "base-usdc", "polygon-usdc"
- Dynamic turboConfig based on token type
- Proper gateway URL mapping from tokenMap
- Network validation before transactions
- Privy embedded wallet fallback support
- USDC uses 6 decimals (not 18 like ETH)

### 👻 Solana Integration (Phantom / Solflare)

**Wallet Adapter Ecosystem**
- @solana/wallet-adapter-react integration
- Phantom wallet with WalletAdapterNetwork.Mainnet
- Solflare wallet support
- Custom SolanaWalletAdapter implementation
- Direct provider access via `window.solana`

**Wallet Features**
- Fiat and crypto payment support
- SOL token balance checking
- Transaction signing capabilities
- Payment address generation
- Real-time balance updates

**Technical Implementation**
- TurboFactory.authenticated with Solana wallet adapter
- Token type: "solana" for standard operations
- Custom adapter wrapping Phantom/Solflare
- Proper error handling for connection issues
- Payment monitoring with transaction verification
- JIT payments fully supported for SOL

## Navigation & User Experience

### 🧭 Navigation System

**Waffle Menu (Grid3x3 Icon)**

*Services Section* (Login Required):
- Buy Credits (`/topup`)
- Upload Files (`/upload`)
- Capture Page (`/capture`)
- Deploy Site (`/deploy`)
- Share Credits (`/share`)
- Send Gift (`/gift`)
- Account (`/account`)

*Tools Section* (Public Access):
- Search Domains (`/domains`)
- Developer Resources (`/developer`)
- Pricing Calculator (`/calculator`)
- Services Calculator (`/services-calculator`)
- Check Balance (`/balances`)
- Redeem Gift (`/redeem`)
- Service Info (`/gateway-info`)
- Recent Deployments (`/deployments`)

**React Router Integration**
- Full client-side routing with BrowserRouter
- Direct URL access to all features
- Deep linking support for sharing
- Payment callback handling: `?payment=success` or `?payment=cancelled`
- Catch-all route (`*`) redirects unknown paths to landing page
- No page reloads during navigation
- Browser history management

**URL Structure**
- Landing: `/`
- Services: `/topup`, `/upload`, `/deploy`, `/share`, `/gift`, `/account`
- Tools: `/domains`, `/developer`, `/calculator`, `/services-calculator`, `/balances`, `/redeem`, `/gateway-info`, `/deployments`
- Payment callbacks integrated with route parameters

### 📱 Responsive Design

**Mobile Optimization**
- Touch-friendly interface elements (44px+ touch targets)
- Optimized layouts for screens < 768px
- Gesture support: swipe, pinch-to-zoom where appropriate
- Mobile wallet integration with QR codes
- Responsive typography with fluid scaling
- Hamburger menu for mobile navigation
- Bottom-aligned action buttons for thumb reach
- Simplified forms with mobile-optimized inputs

**Tablet Experience (768px - 1024px)**
- Hybrid layout between mobile and desktop
- Grid layouts optimized for tablet orientation
- Touch and mouse input support
- Larger interactive elements than mobile
- Multi-column layouts where appropriate
- Sidebar navigation for landscape orientation

**Desktop Experience (> 1024px)**
- Full-featured interface with all capabilities
- Multi-column layouts for efficient space usage
- Hover states and tooltips
- Keyboard shortcuts (future enhancement)
- Multi-window support for advanced workflows
- Sidebar navigation always visible
- Optimized for mouse and keyboard input

**Breakpoints**
- Mobile: < 640px (sm)
- Tablet: 640px - 768px (md)
- Desktop: 768px - 1024px (lg)
- Large Desktop: > 1024px (xl)

### 🎨 Design System

**Brand Colors**
- **Turbo Red** (#FE0230) - Primary brand color for:
  - Call-to-action buttons
  - Active states and highlights
  - Error states and warnings
  - Brand logo and accents
- **Turbo Green** (#18A957) - Success states only:
  - Confirmation messages
  - Success indicators
  - Positive feedback
- **Turbo Purple** (#3142C4 variant) - Informational elements:
  - Developer resources
  - Educational content
  - Secondary highlights
- **Turbo Yellow** - Domain-related features:
  - ArNS domain cards
  - Search results

**Dark Theme (Default)**
- **Canvas**: #171717 - Main background color
- **Surface**: #1F1F1F - Elevated surfaces (cards, modals)
- **Default Border**: rgba(255,255,255,0.1) - Subtle borders
- **Primary Text** (fg-muted): #ededed - High contrast text
- **Secondary Text** (link): #A3A3AD - Lower contrast text
- **Hover States**: Opacity adjustments (80-90%)

**Component Patterns**

*Service Panel Design* (Consistent across all services):
```jsx
// Inline Header with Icon
<div className="flex items-start gap-3 mb-6">
  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
    <IconComponent className="w-5 h-5 text-primary" />
  </div>
  <div>
    <h3 className="text-2xl font-bold text-fg-muted mb-1">[Service Name]</h3>
    <p className="text-sm text-link">[Service Description]</p>
  </div>
</div>

// Gradient Container
<div className="bg-gradient-to-br from-primary/5 to-primary/3 rounded-xl border border-default p-6 mb-6">
  {/* Main service content */}
</div>
```

**Typography**
- **Font Family**: Plus Jakarta Sans (body), Besley (headings) - Applied throughout entire application
- **Responsive Scaling**: Base 16px with scale modifiers (text-xs to text-4xl)
- **Line Heights**: 1.5 for body text, 1.2 for headings
- **Font Weights**: 400 (normal), 500 (medium), 700 (bold)
- **Copy Pattern**: `<CopyButton textToCopy={value} />` for all copyable content

**Interactive States**
- **Hover**: Opacity 80-90%, transition 200ms
- **Active**: Scale 95%, pressed appearance
- **Focus**: Ring with primary color, 2px width
- **Disabled**: Opacity 50%, cursor not-allowed
- **Loading**: Spinner with primary color, scale animation

**Modal System**
- **BaseModal**: Foundation with portal rendering
- **Specialized Modals**: WalletSelectionModal, BlockingMessageModal, ReceiptModal, JitPaymentModal
- **Consistent Styling**: Dark theme, proper z-index (50), backdrop blur
- **Close Mechanisms**: ESC key, backdrop click, X button
- **Animation**: Fade in/out with scale (200ms)

---

## Advanced Features

### 🔄 State Management

**Zustand Store Architecture**

The application uses Zustand for global state management with selective persistence:

```typescript
// Persistent State (survives page refresh)
interface PersistentState {
  // Wallet
  address: string | null;
  walletType: 'arweave' | 'ethereum' | 'solana' | null;

  // ArNS Cache
  arnsNamesCache: Record<string, { name: string; logo?: string; timestamp: number }>;
  ownedArnsCache: Record<string, { names: Array<OwnedName>; timestamp: number }>;

  // History
  uploadHistory: UploadResult[];
  deployHistory: DeployResult[];
  uploadStatusCache: Record<string, UploadStatus>;

  // Developer Configuration
  configMode: 'production' | 'development' | 'custom';
  customConfig: DeveloperConfig;

  // JIT Payment Preferences
  jitPaymentEnabled: boolean;
  jitMaxTokenAmount: Record<SupportedTokenType, number>;
  jitBufferMultiplier: number;
}

// Ephemeral State (cleared on refresh)
interface EphemeralState {
  creditBalance: number;
  paymentAmount?: number;
  paymentIntent?: PaymentIntent;
  paymentInformation?: PaymentInformation;
  paymentIntentResult?: PaymentIntentResult;
  promoCode?: string;
  paymentTargetAddress: string | null;
  paymentTargetType: 'arweave' | 'ethereum' | 'solana' | null;
  cryptoTopupValue?: number;
  cryptoManualTopup: boolean;
  cryptoTopupResponse?: TurboCryptoFundResponse;
  showResumeTransactionPanel: boolean;
}
```

**State Actions**
- Wallet: `setAddress`, `clearAddress`
- Balance: `setCreditBalance` (ephemeral)
- ArNS: `setArNSName`, `setOwnedArNSNames`
- Uploads: `addUploadRecord`, `updateUploadStatus`
- Deployments: `addDeploymentRecord`
- Payments: `setPaymentAmount`, `setPaymentIntent`, etc.
- JIT: `setJitPaymentEnabled`, `setJitMaxTokenAmount`, `setJitBufferMultiplier`
- Config: `setConfigMode`, `updateCustomConfig`, `updateTokenMap`, `resetToDefaults`

**Cache Management**
- **Primary ArNS Name**: 24-hour cache per wallet address
  - Stored in `arnsNamesCache` with timestamp
  - Automatic expiration check on lookup
  - Refresh on expiration or manual trigger
- **Owned ArNS Names**: 6-hour cache per wallet address
  - Stored in `ownedArnsCache` with timestamp
  - Manual refresh button available
  - Includes ANT state (processId, target, undernames)
- **Upload Status**: Persistent cache with timestamps
  - Stores API response for each upload
  - Used for status display without re-fetching
- **Balance Information**: Event-driven refresh via `refresh-balance` custom event
- **Upload/Deploy History**: Persistent storage, never expires

### 🔔 Event System

**Custom Events**

The application uses custom events for cross-component communication:

```javascript
// Refresh Balance Event
// Trigger: After successful payment, credit share, or manual refresh
window.dispatchEvent(new CustomEvent('refresh-balance'));

// Listen for balance refresh in components
useEffect(() => {
  const handleRefresh = async () => {
    // Fetch new balance from Turbo SDK
    const balance = await turbo.getBalance();
    setCreditBalance(balance);
  };

  window.addEventListener('refresh-balance', handleRefresh);
  return () => window.removeEventListener('refresh-balance', handleRefresh);
}, []);
```

**Event Handling Patterns**
- Payment success triggers balance refresh across all components
- Upload completion triggers history update
- Deployment completion triggers history and owned names refresh
- Wallet connection triggers balance and ArNS name fetch
- ArNS update triggers owned names cache invalidation

**Event Listeners**
- Registered in useEffect hooks with cleanup
- Debounced where appropriate to prevent excessive API calls
- Error handling for failed event handlers
- Type-safe event data where possible

### 🔐 Just-in-Time (JIT) Payment System

**Overview**
JIT payments allow users to upload files or deploy sites without manually topping up credits first. The system automatically purchases the exact amount of credits needed using cryptocurrency.

**Implementation Details**

*Supported Networks*:
- **Arweave (ARIO)**: Primary JIT network for Arweave uploads
- **Ethereum (Base-ETH)**: Base L2 network for lower fees and fast confirmation
- **Ethereum (Base-USDC)**: USDC stablecoin on Base L2 for predictable pricing
- **Solana (SOL)**: Fast confirmation times on Solana network

*Configuration* (via JitPaymentCard component):
```typescript
interface JITConfig {
  enabled: boolean;                    // Global JIT enable/disable
  maxTokenAmount: {                     // Maximum tokens per transaction
    ario: 200,                          // ~$20 worth
    solana: 0.15,                       // ~$22.50 worth
    'base-eth': 0.01,                   // ~$25 worth
    'base-usdc': 25,                    // $25 exact (stablecoin)
  };
  bufferMultiplier: 1.1;                // 10% buffer to prevent failures
}
```

*Upload Flow with JIT*:
1. User selects files, system calculates required credits
2. Check current balance: `creditBalance >= requiredCredits + buffer`
3. If insufficient:
   - Display JIT modal with cost breakdown
   - Show token amount needed (ARIO, SOL or Base-ETH)
   - User confirms auto-top-up
4. Create OnDemandFunding instance:
   ```typescript
   const fundingMode = new OnDemandFunding({
     maxTokenAmount: jitMaxTokenAmount,
     topUpBufferMultiplier: 1.1,
   });
   ```
5. Upload with funding mode:
   ```typescript
   const result = await turbo.uploadFile({
     file: file,
     fundingMode, // Automatically tops up if needed
   });
   ```
6. Transaction completes, balance refreshed

*Deploy Flow with JIT*:
- Same process as upload flow
- Applied to entire folder deployment cost
- Buffer accounts for multiple file uploads
- Manifest creation included in cost calculation

**Token Type Mapping**
```typescript
const jitTokenType = walletType === 'arweave'
  ? 'ario'
  : walletType === 'ethereum'
  ? 'base-eth'
  ? 'solana'
  : walletType; // Default to wallet type
```

**User Experience**
- Opt-in system with persistent preferences
- Clear messaging about auto-top-up
- Cost breakdown before confirmation
- Buffer explained as "safety margin"
- No interruption to upload workflow
- Automatic balance refresh after top-up

**Error Handling**
- Insufficient token balance: Clear error message
- Payment transaction failure: Retry option
- Network errors: Fallback to manual top-up
- User cancellation: Return to upload interface

### 🛡️ Error Handling

**User-Friendly Error Messages**

The application provides clear, actionable error messages:

*Network Connectivity Issues*:
- "Network connection lost. Please check your internet and try again."
- Automatic retry with exponential backoff
- Offline indicator in header

*Wallet Connection Problems*:
- "Wallet extension not found. Please install Wander wallet."
- "Wallet is locked. Please unlock your wallet and try again."
- "Wrong network. Please switch to [correct network]."
- Link to wallet installation/setup guides

*Transaction Failures*:
- "Transaction rejected by user."
- "Insufficient funds to complete transaction."
- "Transaction failed: [specific error from blockchain]"
- Retry button with fresh transaction attempt

*File Upload Errors*:
- "File too large. Maximum size: [limit]"
- "Invalid file type. Supported types: [list]"
- "Upload failed for [filename]: [specific error]"
- Individual file error tracking with retry per file

*ArNS Errors*:
- "Name not found. Please check spelling and try again."
- "Name already registered by another user."
- "Update failed: Invalid ANT record."
- "Permission denied: You don't own this name."

**Error Recovery Mechanisms**
- **Automatic Retry**: Network errors with exponential backoff (3 attempts)
- **Partial Success**: Continue with successful uploads if some fail
- **State Preservation**: Save form data before error
- **Fallback Options**: Alternative paths when primary fails (e.g., manual top-up if JIT fails)
- **Clear Guidance**: Step-by-step recovery instructions
- **Support Links**: Direct links to relevant documentation

**Error Logging**
- Client-side error logging to browser console (development)
- Error details in upload/deployment history for troubleshooting
- Transaction IDs included for blockchain errors
- Timestamp and user state at time of error

### 🔧 Developer Configuration System

**Configuration Modes**
- **Production**: Default production endpoints and settings
- **Development**: Development/testnet endpoints for testing
- **Custom**: Fully configurable endpoints for advanced users

**Configurable Settings**
```typescript
interface DeveloperConfig {
  paymentServiceUrl: string;          // Default: https://payment.ardrive.io
  uploadServiceUrl: string;           // Default: https://upload.ardrive.io
  gatewayUrl: string;                 // Default: https://turbo.ardrive.io
  stripeKey: string;                  // Publishable key for Stripe
  processId: string;                  // AR.IO process ID
  tokenMap: {                         // RPC URLs per token type
    arweave: string;
    ario: string;
    ethereum: string;
    'base-eth': string;
    solana: string;
    kyve: string;
    pol: string;
    usdc: string;                     // USDC on Ethereum L1
    'base-usdc': string;              // USDC on Base L2
    'polygon-usdc': string;           // USDC on Polygon
  };
}
```

**Configuration Interface** (Developer Tools → Configuration Tab)
- Mode selector: Production / Development / Custom
- Editable fields for all endpoints (Custom mode only)
- Copy buttons for quick sharing of URLs
- Token gateway map with expandable section
- Apply Changes button (triggers page reload to reinitialize all services)
- Reset to Production button to restore defaults
- Warning indicator for non-production modes

**Preset Configurations**

*Production*:
- payment.ardrive.io, upload.ardrive.io, turbo.ardrive.io
- Mainnet RPC endpoints for all tokens
- Live Stripe publishable key
- Production AR.IO process ID

*Development*:
- payment.ardrive.dev, upload.ardrive.dev, turbo.ardrive.dev
- Testnet RPC endpoints (Eth Sepolia, Base Sepolia etc.)
- Test Stripe publishable key
- Development AR.IO process ID

**Use Cases**
- Testing with devnet/testnet endpoints
- Running against custom Turbo services
- Using alternative RPC providers
- Debugging with different AR.IO processes
- Load testing with dedicated infrastructure

---

## Troubleshooting

### Common Issues

**Wallet Connection Problems**

*Issue*: Wallet extension not detected
- **Solution**: Install Wander for Arweave, MetaMask for Ethereum, or Phantom for Solana
- **Check**: Extension is enabled in browser settings
- **Verify**: Extension icon visible in browser toolbar
- **Restart**: Refresh page after installing extension

*Issue*: Wallet is locked
- **Solution**: Unlock wallet extension and refresh page
- **Check**: Password entered correctly
- **Verify**: Wallet extension is not in "locked" state

*Issue*: Wrong network connected
- **Solution**: Switch to correct network in wallet extension
- **Check**: Arweave mainnet, Ethereum mainnet, or Solana mainnet
- **Verify**: Network indicator in wallet matches expected network

*Issue*: Email authentication not working
- **Solution**: Check email for verification link
- **Check**: Email is typed correctly
- **Verify**: Check spam folder for Privy emails
- **Retry**: Use "Resend verification" button

**Upload Failures**

*Issue*: Upload fails with "Insufficient credits"
- **Solution**: Buy more credits or enable JIT payments
- **Check**: Credit balance in header shows available credits
- **Option 1**: Go to Buy Credits page and top up manually
- **Option 2**: Enable JIT payments in upload panel for auto-top-up

*Issue*: Upload stuck at signing step
- **Solution**: Check Wander wallet extension for signature request
- **Action**: Approve transaction in wallet extension
- **Timeout**: Cancel and retry if stuck for > 30 seconds

*Issue*: Upload fails with "Network error"
- **Solution**: Check internet connection and retry
- **Check**: Other websites loading normally
- **Verify**: Arweave network status at arweave.net
- **Retry**: Use retry button in upload interface

*Issue*: JIT payment not triggering
- **Solution**: Check JIT settings in upload panel
- **Verify**: JIT payments enabled (toggle should be on)
- **Check**: Max token amount set appropriately (not 0)
- **Balance**: Ensure wallet has enough tokens for JIT payment

**Deployment Issues**

*Issue*: "Homepage file not found in folder"
- **Solution**: Ensure folder contains index.html or configured homepage file
- **Check**: File name spelling and capitalization matches exactly
- **Verify**: File is in root of uploaded folder, not subfolder

*Issue*: Deployment fails with ArNS error
- **Solution**: Verify you own the ArNS name being updated
- **Check**: Name appears in Account → Owned Names section
- **Refresh**: Click refresh button in owned names section
- **Permission**: Ensure Arweave wallet used matches name owner

*Issue*: ArNS update not reflecting
- **Solution**: Wait for network propagation (can take 5-15 minutes)
- **Check**: TTL setting is 600 seconds (10 minutes)
- **Verify**: Transaction confirmed on Arweave explorer
- **Clear**: Clear browser cache and try again

*Issue*: Deployed site shows 404
- **Solution**: Check manifest structure and homepage configuration
- **Verify**: All files uploaded successfully (check deployment history)
- **Check**: Paths in manifest match actual file locations
- **Test**: Try accessing manifest ID directly: arweave.net/{manifestId}

**Payment Issues**

*Issue*: Payment processing fails
- **Solution**: Verify payment information and billing details
- **Check**: Card not expired, sufficient funds available
- **Verify**: Country selection matches billing address
- **Retry**: Try different payment method if available

*Issue*: Payment successful but credits not added
- **Solution**: Wait 1-2 minutes for payment processing
- **Check**: Payment confirmation email from Stripe
- **Refresh**: Click refresh button in header to update balance
- **Event**: Balance should auto-refresh on payment success callback

*Issue*: Payment callback not working
- **Solution**: Ensure not blocking redirects in browser
- **Check**: URL contains `?payment=success` parameter after redirect
- **Verify**: Not using incognito/private browsing mode
- **Manual**: Manually refresh balance if callback missed

*Issue*: Crypto payment not confirmed
- **Solution**: Check blockchain explorer for transaction status
- **Verify**: Sent to correct address (use copy button)
- **Amount**: Sent exact amount displayed (including decimals)
- **Network**: Used correct network (Ethereum mainnet, Solana mainnet, etc.)
- **Wait**: Crypto confirmations can take 5-60 minutes depending on network

**ArNS Domain Issues**

*Issue*: Name shows as unavailable but appears unregistered
- **Solution**: Name may be in grace period or pending registration
- **Wait**: Try again in 24 hours
- **Alternative**: Try similar name variations
- **Check**: Verify spelling (lowercase, no spaces)

*Issue*: Can't update owned name
- **Solution**: Verify wallet ownership matches name owner
- **Check**: Wallet address in header matches owner address
- **Permission**: ArconnectSigner approved transaction in Wander
- **Network**: Connected to Arweave mainnet

*Issue*: Undername not working
- **Solution**: Verify undername format (no spaces, only hyphens)
- **Check**: Undername properly formatted: `undername_basename.ar.io`
- **Update**: Allow time for propagation (10-15 minutes)
- **DNS**: Some resolvers may cache longer than TTL

*Issue*: Primary name not displaying
- **Solution**: Cache may be stale or name not set
- **Check**: Name registered and active on AR.IO
- **Refresh**: Reconnect wallet to force name lookup
- **Cache**: Wait up to 24 hours for cache refresh or clear localStorage

**General Issues**

*Issue*: Application not loading
- **Solution**: Clear browser cache and cookies
- **Check**: JavaScript enabled in browser settings
- **Verify**: Using supported browser (Chrome, Firefox, Safari, Edge)
- **Update**: Ensure browser is latest version

*Issue*: Balance not updating
- **Solution**: Click refresh icon in header
- **Event**: Trigger manual refresh with button
- **Verify**: Connected to correct wallet
- **Network**: Check internet connection

*Issue*: UI appears broken or misaligned
- **Solution**: Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)
- **Check**: Browser zoom level is 100%
- **Clear**: Clear browser cache
- **Update**: Update browser to latest version

### Support Resources

**Documentation**
- [AR.IO Documentation](https://docs.ar.io) - Complete AR.IO ecosystem documentation
- [Turbo SDK Documentation](https://github.com/ardriveapp/turbo-sdk) - SDK reference and examples
- [Wander Wallet Guide](https://arweave.app) - Wander wallet setup and usage
- [ArNS Documentation](https://docs.ar.io/learn/arns) - ArNS name system guide
- [Privy Documentation](https://docs.privy.io) - Email authentication and embedded wallets

**Community Support**
- GitHub Issues: [turbo-gateway-app](https://github.com/ardriveapp/turbo-app/issues)
- Discord Community: [ar.io Discord](https://discord.com/invite/HGG52EtTc2)
- Twitter: [@ar_io_network](https://twitter.com/ar_io_network)

**API Documentation**
- Upload Service: https://upload.ardrive.io/api-docs
- Payment Service: https://payment.ardrive.io/api-docs
- Gateway Service: https://turbo-gateway.com/api-docs (varies by gateway)

**Contact Support**
- Email: support@ardrive.io
- Feature Requests: GitHub Issues, Discord or X
- Bug Reports: GitHub Issues

---

## Conclusion

The Turbo Gateway Application represents a comprehensive solution for interacting with the AR.IO Network and Arweave ecosystem. With its multi-chain wallet support (Arweave, Ethereum, Solana) plus email authentication, intuitive user interface, and powerful feature set including Just-in-Time payments, it serves as the primary gateway for users and developers working with permanent data storage and decentralized naming systems.

### Key Capabilities

**For End Users**
- Easy onboarding with email authentication (no wallet required for payments)
- Seamless file uploads with automatic payment handling (JIT)
- Simple site deployment with ArNS integration
- Credit management: buy, share, gift, and track usage
- Multi-chain wallet support for flexibility

**For Developers**
- Complete SDK with code examples and documentation
- Configurable environments for testing and development
- API documentation with live endpoints
- Open-source codebase for contributions and customization
- Comprehensive developer resources and guides

**For the Ecosystem**
- Promotes AR.IO Network adoption
- Demonstrates best practices for Turbo SDK integration
- Showcases multi-chain capabilities
- Educational resource for permanent storage
- Community-driven development

Whether you're uploading files, managing domains, sharing credits, deploying websites, or developing applications, the Turbo App provides the tools and infrastructure needed to succeed in the decentralized web ecosystem.

---

*Last Updated: Version 0.7.0 | October 2025*

*For the latest features, technical implementation details, and development guidelines, please refer to:*
- `CLAUDE.md` - Development and architecture guide
- `README.md` - Project overview and setup instructions
- GitHub Repository - Latest code and releases
