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

- **Credit Management**: Buy, share, and gift Turbo credits
- **File Storage**: Upload files to the permaweb via Arweave
- **Site Deployment**: Deploy websites with ArNS integration
- **Domain Management**: Search, manage, and update ArNS names
- **Multi-Chain Support**: Arweave, Ethereum, and Solana wallet integration
- **Developer Resources**: Complete API documentation and tools

The application serves both end-users and developers with an intuitive interface that supports complex workflows while maintaining ease of use.

---

## Getting Started

### Accessing the Application

The Turbo App is accessible through any modern web browser at the deployment URL. No downloads or installations required.

### First-Time Setup

1. **Visit the Landing Page**: Start on the informational landing page to learn about Turbo services
2. **Connect Your Wallet**: Click "Connect Wallet" to access the multi-chain wallet selection modal
3. **Choose Your Wallet**: Select from Arweave (Wander), Ethereum (MetaMask/WalletConnect), or Solana (Phantom/Solflare)
4. **Explore Services**: Access the waffle menu (☰) to navigate between features

### System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Wallet Extension**: Appropriate wallet extension installed (optional for some features)
- **Network**: Stable internet connection
- **Device**: Desktop, tablet, or mobile device with responsive design support

---

## Core Features

### 🏠 Landing Page & Navigation

**Public Landing Page**
- Rich informational content about Turbo services
- Feature overviews with visual examples
- Getting started guides and resources
- FAQ section with common questions
- Links to documentation and support

**Navigation System**
- **Waffle Menu**: Grid3x3 icon in header providing access to all services
- **React Router**: Direct URL access to any feature (e.g., `/upload`, `/domains`)
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Sticky Header**: Always-accessible navigation bar

### 💳 Buy Credits

**Fiat Payments (Stripe Integration)**
- Complete payment flow with form validation
- Country selection with payment method restrictions
- Real-time USD to credits conversion
- Multi-step process: Details → Confirmation → Success
- Payment callback handling with automatic balance refresh

**Payment Flow**
1. **Payment Details**: Enter credit amount, select country, provide payment info
2. **Payment Confirmation**: Review transaction details before processing
3. **Payment Success**: Confirmation with transaction details and updated balance

**Crypto Payments**
- Solana and Ethereum payment address generation
- Real-time cryptocurrency to credits conversion
- QR codes for mobile wallet scanning
- Payment monitoring and confirmation

### 📤 Upload Files

**File Upload Interface**
- Drag & drop support with visual feedback
- Batch upload capability for multiple files
- Real-time progress tracking per file
- Cost calculator with GiB estimates
- FREE tier highlighting (files under 100KiB)

**Upload Process**
1. **File Selection**: Drag files or click to browse
2. **Cost Review**: Real-time pricing display with total costs
3. **Wallet Signing**: Transaction signing via connected Arweave wallet
4. **Upload Progress**: Real-time progress bars with status updates
5. **Receipt Generation**: Transaction IDs with Arweave explorer links

**Supported Features**
- Individual file upload with detailed progress
- Folder upload with recursive file processing
- Error handling with retry mechanisms
- Upload history tracking and management

### 🌐 Deploy Sites

**Site Deployment**
- Complete website deployment to Arweave
- Data export functionality for site packages
- Integration with file upload system
- Deployment progress tracking

**ArNS Integration**
- Associate deployments with owned ArNS names
- Support for base names (@) and undernames
- TTL configuration (default 600 seconds)
- ANT record updates via ArconnectSigner

**Deployment Workflow**
1. **Site Preparation**: Package and prepare site files
2. **Deployment Upload**: Upload site to Arweave network
3. **ArNS Association**: Link deployment to owned domain names
4. **Confirmation**: Receive deployment ID and access URLs

### 🤝 Share Credits

**Credit Sharing System**
- Wallet-to-wallet credit transfers
- Preset expiration options (24h, 7d, 30d, never)
- Recipient tracking and management
- Share history with transaction details

**Sharing Process**
1. **Recipient Setup**: Enter destination wallet address
2. **Amount Configuration**: Specify credit amount to share
3. **Expiration Settings**: Choose when shared credits expire
4. **Transaction Signing**: Sign transaction with Wander wallet
5. **Confirmation**: Receive sharing confirmation and tracking info

**Credit Revocation**
- Revoke unused shared credits
- Real-time balance updates
- Transaction history tracking

### 🎁 Gift System

**Send Gifts**
- Send credits to email addresses
- Optional personal messages
- Gift code generation and delivery
- Complete gift payment flow with dedicated panels

**Gift Creation Process**
1. **Gift Details**: Enter recipient email and credit amount
2. **Personal Message**: Add optional message to recipient
3. **Payment Processing**: Complete fiat or crypto payment
4. **Gift Delivery**: Automatic email delivery with redemption code

**Redeem Gifts**
- Dedicated redemption page (`/redeem`)
- Gift code validation and processing
- Credit allocation to connected wallet
- Redemption confirmation and balance update

---

## Account Management

### 📊 Account Overview

**Balance Cards Grid**
- Visual balance display across all wallet types
- Real-time balance updates via custom events
- Credit balance breakdown by wallet
- Shared credit tracking and management

**Activity Overview**
- Recent uploads with transaction links
- Recent deployments with ArNS associations
- Transaction history and status tracking
- Activity filtering and search

### 👤 Wallet Overview Card

**Connected Wallet Information**
- Wallet address display with copy functionality
- Wallet type identification (Arweave/Ethereum/Solana)
- ArNS primary name resolution and display
- Connection status and management

**Credit Sharing Section**
- Manage shared credits and recipients
- View sharing history and expiration dates
- Revoke unused shared credits
- Track credit utilization

### 📈 Recent Activity Sections

**Recent Uploads Section**
- Upload history with file details
- Transaction IDs and Arweave explorer links
- Upload status and error tracking
- File size and cost information

**Recent Deployments Section**
- Deployment history with site information
- ArNS name associations and links
- Deployment status and access URLs
- Site management and updates

---

## Payment System

### 💰 Fiat Payment Integration

**Payment Details Panel**
- Form validation with error handling
- Country selection affecting payment methods
- Credit amount input with minimum validation
- Real-time USD to credits conversion display

**Payment Confirmation Panel**
- Transaction summary with all details
- Final cost confirmation before processing
- Terms of service acknowledgment
- Secure Stripe Elements integration

**Payment Success Panel**
- Transaction confirmation with receipt details
- Credit balance update notification
- Next steps guidance and feature suggestions
- Success animation and user feedback

### 🎁 Gift Payment Flow

**Gift Payment Details Panel**
- Recipient information collection
- Gift amount specification with minimums
- Personal message composition
- Payment method selection

**Gift Payment Confirmation Panel**
- Gift summary with recipient details
- Payment amount and method confirmation
- Gift delivery timeline information
- Final confirmation before processing

**Gift Payment Success Panel**
- Gift creation confirmation
- Delivery status and timeline
- Gift code display (if applicable)
- Recipient notification confirmation

### 🪙 Crypto Payment System

**Crypto Confirmation Panel**
- Payment address generation for selected cryptocurrency
- QR code display for mobile wallet scanning
- Amount conversion with real-time rates
- Payment monitoring and status updates

**Crypto Manual Payment Panel**
- Payment instructions and address copying
- Transaction verification process
- Status tracking and confirmation
- Error handling and retry mechanisms

---

## File Management

### 📁 Upload System

**File Upload Panel**
- Multi-file drag and drop interface
- File type detection and validation
- Size limits and warnings
- Cost calculation with FREE tier highlighting

**Upload Progress Tracking**
- Individual file progress bars
- Overall upload progress indication
- Error handling with specific error messages
- Retry mechanisms for failed uploads

**Upload History**
- Complete upload history tracking
- Transaction details and explorer links
- File information and metadata
- Upload status and error logs

### 🚀 Site Deployment

**Deploy Site Panel**
- Site file preparation and packaging
- Deployment cost calculation
- Progress tracking during deployment
- Integration with ArNS association

**ArNS Association**
- Owned ArNS names fetching and display
- Base name (@) and undername support
- TTL configuration and management
- ANT record updates and confirmation

**Deployment Management**
- Recent deployments tracking
- Site access URLs and management
- ArNS name updates and changes
- Deployment history and versioning

---

## ArNS Domain System

### 🔍 Domain Search

**ArNS Panel (Domain Search)**
- Real-time domain availability checking
- Registration period selection (1, 2, 5, 10 years)
- Credit-based pricing calculations
- Search history and saved searches

**Domain Pricing**
- Dynamic pricing based on demand
- Credit cost calculations
- Registration period discounts
- Affordable domain suggestions

### 🏠 Owned Names Management

**Primary Name Resolution**
- AR.IO SDK integration with 24-hour cache
- Primary name display throughout application
- Automatic cache refresh and management
- Loading states and error handling

**Owned Names Panel**
- Fetch and display all owned ArNS names
- ANT state tracking and management
- Manual refresh capabilities
- 6-hour cache with automatic updates

**ANT Record Updates**
- Update ArNS names to point to new manifests
- Support for base names (@) and undernames
- TTL configuration (600-second default)
- Transaction signing via ArconnectSigner

### 🔗 Site Association

**ArNSAssociationPanel**
- Associate deployments with owned names
- Base name and undername management
- Record type selection and configuration
- Update confirmation and status tracking

---

## Developer Tools

### 📚 Developer Resources

**API Documentation**
- Complete Turbo SDK reference
- Code examples with copy functionality
- Integration guides for different use cases
- Authentication and signing examples

**Quick Start Guides**
- Installation instructions for SDK
- Basic usage examples
- Common workflow implementations
- Error handling best practices

**Code Examples**
```javascript
// Upload file example
const turbo = new TurboFactory().authenticated(signer);
const result = await turbo.uploadFile({ fileData });

// Buy credits example
const paymentService = turbo.getPaymentService();
const session = await paymentService.createCheckoutSession({
  amount: USD(10.00),
  owner: address
});
```

### 🧮 Pricing Calculators

**Storage Pricing Calculator**
- Real-time storage cost calculations
- File size to GiB conversion
- Credit requirements estimation
- Batch calculation support

**Services Calculator**
- Combined storage and ArNS pricing
- Service package calculations
- Multi-service cost estimation
- Budget planning tools

### 🔧 Gateway Information

**Service Endpoints**
- Payment service URL configuration
- Upload service endpoint details
- Gateway configuration information
- Network status and health checks

---

## Multi-Chain Wallet Support

### 🦌 Arweave Integration

**Wander Wallet Support**
- ArconnectSigner integration
- Native Arweave transaction signing
- File upload capabilities
- ArNS name management

**Supported Operations**
- ✅ Buy Credits (Fiat & Crypto)
- ✅ Upload Files
- ✅ Deploy Sites
- ✅ Share Credits
- ✅ ArNS Name Display
- ✅ Update ArNS Records

### 🦊 Ethereum Integration

**Wagmi v2 Framework**
- MetaMask connector support
- WalletConnect integration
- HTTP transport configuration
- ethers.BrowserProvider for signing

**Supported Operations**
- ✅ Buy Credits (Fiat & Crypto)
- ✅ ArNS Name Display
- ❌ Upload Files
- ❌ Deploy Sites
- ❌ Share Credits
- ❌ Update ArNS Records

### 👻 Solana Integration

**Wallet Adapter Ecosystem**
- Phantom wallet support
- Solflare wallet integration
- Custom SolanaWalletAdapter implementation
- Direct provider access via window.solana

**Supported Operations**
- ✅ Buy Credits (Fiat & Crypto)
- ❌ ArNS Name Display
- ❌ Upload Files
- ❌ Deploy Sites
- ❌ Share Credits
- ❌ Update ArNS Records

---

## Navigation & User Experience

### 🧭 Navigation System

**Waffle Menu (☰)**
- Services: Buy Credits, Upload Files, Deploy Site, Share Credits, Send Gift, Account
- Tools: Search Domains, Developer Resources, Pricing Calculator, Services Calculator, Check Balance, Redeem Gift, Service Info, Recent Deployments

**React Router Integration**
- Full client-side routing with direct URL access
- Deep linking support for all features
- Payment callback handling
- Catch-all routing with redirect to landing

### 📱 Responsive Design

**Mobile Optimization**
- Touch-friendly interface elements
- Optimized layouts for small screens
- Gesture support for file uploads
- Mobile wallet integration

**Desktop Experience**
- Full-featured interface with all capabilities
- Keyboard shortcuts and accessibility
- Multi-window support
- Advanced workflow management

### 🎨 Design System

**Brand Colors**
- Turbo Red (#FE0230) - Primary brand color
- Turbo Green (#18A957) - Success states
- Turbo Blue (#3142C4) - Informational elements

**Dark Theme**
- Canvas: #171717 (main background)
- Surface: #1F1F1F (elevated surfaces)
- Primary Text: #ededed
- Secondary Text: #A3A3AD

**Typography**
- Rubik font family throughout
- Responsive typography scaling
- Copy button pattern for all copyable content

---

## Advanced Features

### 🔄 State Management

**Zustand Store Architecture**
```typescript
// Persistent State (survives page refresh)
interface PersistentState {
  address: string | null;
  walletType: 'arweave' | 'ethereum' | solana' | null;
  arnsNamesCache: CachedArNSNames;
  uploadHistory: UploadRecord[];
  deployHistory: DeploymentRecord[];
}

// Ephemeral State (cleared on refresh)
interface EphemeralState {
  creditBalance: number;
  paymentState: PaymentFlowState;
  uiState: UIState;
}
```

**Cache Management**
- Primary ArNS name: 24-hour cache
- Owned ArNS names: 6-hour cache
- Balance information: Event-driven refresh
- Upload/deployment history: Persistent storage

### 🔔 Event System

**Custom Events**
- `refresh-balance`: Trigger balance updates across components
- Payment success/failure callbacks
- Upload progress notifications
- Deployment status updates

**Event Handling**
```javascript
// Listen for balance refresh
window.addEventListener('refresh-balance', handleBalanceRefresh);

// Trigger balance refresh
window.dispatchEvent(new CustomEvent('refresh-balance'));
```

### 🛡️ Error Handling

**User-Friendly Error Messages**
- Network connectivity issues
- Wallet connection problems
- Transaction failures
- File upload errors

**Error Recovery**
- Automatic retry mechanisms
- Fallback options for failed operations
- Clear guidance for user actions
- Error reporting and logging

---

## Troubleshooting

### Common Issues

**Wallet Connection Problems**
1. Ensure wallet extension is installed and enabled
2. Check that wallet is unlocked and accessible
3. Verify network settings and connectivity
4. Try refreshing the page and reconnecting

**Upload Failures**
1. Verify Arweave wallet is connected (required for uploads)
2. Check file size limits and format restrictions
3. Ensure sufficient credits for upload costs
4. Retry with smaller batches if bulk upload fails

**Payment Issues**
1. Verify payment method and billing information
2. Check minimum credit purchase amounts
3. Ensure stable internet connection during payment
4. Contact support if payment processing fails

**ArNS Domain Issues**
1. Verify domain name availability and format
2. Check ArNS name ownership and permissions
3. Ensure Arweave wallet connection for updates
4. Wait for network propagation after updates

### Support Resources

**Documentation**
- [ArDrive Documentation](https://docs.ardrive.io)
- [Turbo SDK Documentation](https://github.com/ardriveapp/turbo-sdk)
- [AR.IO Network Documentation](https://ar.io/docs)

**Community Support**
- GitHub Issues and Discussions
- Discord Community Channels
- Developer Forums and Resources

**Contact Support**
- Email: support@ardrive.io
- Issue Reporting: GitHub repository issues
- Feature Requests: Community discussions

---

## Conclusion

The Turbo Gateway Application represents a comprehensive solution for interacting with the AR.IO Network and Arweave ecosystem. With its multi-chain wallet support, intuitive user interface, and powerful feature set, it serves as the primary gateway for users and developers working with permanent data storage and decentralized naming systems.

Whether you're uploading files, managing domains, sharing credits, or developing applications, the Turbo App provides the tools and infrastructure needed to succeed in the decentralized web ecosystem.

---

*Last Updated: Version 0.3.1 - For the latest features and updates, please refer to the application's CLAUDE.md file and release notes.*