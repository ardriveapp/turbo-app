import { useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import WalletSelectionModal from '../components/modals/WalletSelectionModal';
import { 
  ArrowRight, Zap, Shield, Globe, Code2, Github, Book, FileCode, Database, 
  CreditCard, Gift, Ticket, Users, Upload, Globe2, Terminal, Search, BarChart3, Check, Copy, ChevronDown, Info
} from 'lucide-react';

interface LandingPageProps {
  setCurrentPage?: (page: any) => void;
  loggedIn?: boolean;
}

const LandingPage = ({ setCurrentPage, loggedIn = false }: LandingPageProps = {}) => {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(0);

  // Feature data for consistent rendering
  const features = [
    { 
      name: 'Top Up', 
      icon: CreditCard, 
      title: 'Buy Credits with Fiat & Crypto',
      description: 'Add credits to your account using credit cards or multiple cryptocurrencies. Instant processing with competitive rates.',
      benefits: ['Credit cards accepted', 'Multiple cryptocurrencies', 'Instant credits'],
      action: 'topup',
      loginText: 'Buy Credits',
      connectText: 'Connect Wallet to Top Up'
    },
    { 
      name: 'Upload', 
      icon: Upload, 
      title: 'Upload Files & Folders',
      description: 'Drag and drop files for permanent storage on Arweave. Batch uploads with real-time progress tracking and instant receipts.',
      benefits: ['Drag & drop interface', 'Batch uploads', 'Instant receipts'],
      action: 'upload',
      loginText: 'Upload Files',
      connectText: 'Connect Wallet to Upload'
    },
    { 
      name: 'Share', 
      icon: Users, 
      title: 'Share Credits Between Wallets',
      description: 'Delegate credits to other wallets for collaborative uploads and payments. Set time-based expiration and revoke anytime.',
      benefits: ['Wallet-to-wallet sharing', 'Time-based expiration', 'Revoke anytime'],
      action: 'share',
      loginText: 'Share Credits',
      connectText: 'Connect Wallet to Share'
    },
    { 
      name: 'Gift', 
      icon: Gift, 
      title: 'Send Credits as Gifts',
      description: 'Send Turbo credits to anyone via email with optional personal messages. Recipients can redeem with any wallet.',
      benefits: ['Email delivery', 'Custom messages', 'Any amount'],
      action: 'gift',
      loginText: 'Send Gift',
      connectText: 'Connect Wallet to Send Gifts'
    },
    { 
      name: 'Redeem', 
      icon: Ticket, 
      title: 'Redeem Gift Codes',
      description: 'Enter gift codes received via email to add credits to your wallet. Simple redemption process with instant credit delivery.',
      benefits: ['Email gift codes', 'Instant delivery', 'Any wallet'],
      action: 'redeem',
      loginText: 'Redeem Gift Code',
      connectText: 'Redeem Gift Code'
    },
    { 
      name: 'Domains', 
      icon: Globe2, 
      title: 'Search Available Domain Names',
      description: 'Search for available ArNS domain names and check registration costs. No login required to browse available names.',
      benefits: ['Search any name', 'Check availability', 'View pricing'],
      action: 'domains',
      loginText: 'Search Domains',
      connectText: 'Search Available Domains'
    },
    { 
      name: 'Balance Checker', 
      icon: Search, 
      title: 'Check Any Wallet Balance',
      description: 'Look up credit balances for any wallet address across Arweave, Ethereum, and Solana networks with storage estimates.',
      benefits: ['Multi-chain support', 'Real-time data', 'Storage estimates'],
      action: 'balance-checker',
      loginText: 'Check Balance',
      connectText: 'Check Balance'
    },
    { 
      name: 'Service Info', 
      icon: Info, 
      title: 'Gateway Service Information',
      description: 'View real-time gateway metrics, service configuration, and network status. Compare fees and technical details.',
      benefits: ['Live metrics', 'Fee transparency', 'Network status'],
      action: 'gateway-info',
      loginText: 'View Service Info',
      connectText: 'View Service Info'
    }
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="flex w-full flex-col items-center rounded-xl border border-default bg-gradient-to-b from-canvas to-surface/30 px-8 sm:px-12 py-12">
        {/* Small badge */}
        <a 
          href="https://ar.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-surface/80 backdrop-blur text-fg-muted px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border border-default hover:border-turbo-red/50 transition-colors group"
        >
          <img src="/ar.io-logo-white.png" alt="AR.IO" className="h-4 w-auto" />
          <span className="group-hover:text-turbo-red transition-colors">Powered by AR.IO</span>
        </a>
        
        {/* Main headline with gradient */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center max-w-5xl leading-tight">
          <span className="bg-gradient-to-r from-fg-muted via-fg-muted to-turbo-red bg-clip-text text-transparent">
            The fastest way to upload, download, and index
          </span>
          <span className="text-fg-muted block mt-2">on Arweave.</span>
        </h1>
        
        {/* Subheadline */}
        <p className="mt-6 text-lg sm:text-xl text-center max-w-3xl text-link/90 leading-relaxed">
          Turbo is a streamlined permaweb service provider with built-in fiat and crypto payments. Top up instantly and ship fast with SDKs designed for developers.
        </p>
        
        {/* CTA Section */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            className="group relative rounded-lg bg-turbo-red px-8 py-4 font-bold text-white hover:bg-turbo-red/90 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2 text-lg"
            onClick={() => {
              if (loggedIn) {
                setCurrentPage?.('upload');
              } else {
                setShowWalletModal(true);
              }
            }}
          >
            <Zap className="w-5 h-5" />
            <span>{loggedIn ? 'Upload Files' : 'Try Turbo'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <a 
            href="https://docs.ardrive.io/docs/turbo/what-is-turbo.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link hover:text-fg-muted font-medium flex items-center gap-1 group"
          >
            What is Turbo?
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
        
        {/* Free tier callout */}
        <div className="mt-4 text-sm text-link/70">
          <Check className="w-4 h-4 text-green-500 inline mr-1" />
          Files under 100 KiB are completely FREE
        </div>
        
        {/* Terminal snippet - more integrated */}
        <div className="mt-12 w-full max-w-2xl">
          <div className="text-xs text-link/60 uppercase tracking-wider mb-2 text-center">Quick Start</div>
          <div className="bg-black border border-white/20 rounded-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between bg-black px-3 py-2 border-b border-white/20">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="flex-1 text-center">
                <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider">bash</span>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('npm i @ardrive/turbo-sdk');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-white/10 transition-all text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white/50" />
                    <span className="text-white/50">Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="px-4 py-3.5 font-mono text-sm">
              <div className="flex items-center">
                <span className="text-white/70 select-none">$</span>
                <span className="text-white ml-2">npm i @ardrive/turbo-sdk</span>
                <span className="text-white/50 ml-1 animate-pulse">_</span>
              </div>
            </div>
          </div>
        </div>

        {showWalletModal && (
          <WalletSelectionModal
            onClose={() => setShowWalletModal(false)}
            message={''}
          />
        )}
      </div>

      {/* What You Can Do - Feature Showcase */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-2 text-fg-muted text-center">What You Can Do with Turbo</h2>
        <p className="text-center text-link mb-8">Connect your wallet to access these powerful features</p>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-surface border border-default rounded-lg p-5 hover:border-turbo-red/50 transition-colors text-center">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
              <CreditCard className="w-5 h-5 text-turbo-red" />
            </div>
            <h3 className="font-bold mb-1 text-fg-muted">Top Up Credits</h3>
            <p className="text-xs text-link">Add credits with credit card or crypto payments</p>
          </div>
          
          <div className="bg-surface border border-default rounded-lg p-5 hover:border-turbo-red/50 transition-colors text-center">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
              <Gift className="w-5 h-5 text-turbo-red" />
            </div>
            <h3 className="font-bold mb-1 text-fg-muted">Gift Credits</h3>
            <p className="text-xs text-link">Send credits to anyone via email</p>
          </div>
          
          <div className="bg-surface border border-default rounded-lg p-5 hover:border-turbo-red/50 transition-colors text-center">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
              <Ticket className="w-5 h-5 text-turbo-red" />
            </div>
            <h3 className="font-bold mb-1 text-fg-muted">Redeem Codes</h3>
            <p className="text-xs text-link">Claim gift codes sent to you</p>
          </div>
          
          <div className="bg-surface border border-default rounded-lg p-5 hover:border-turbo-red/50 transition-colors text-center">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
              <Users className="w-5 h-5 text-turbo-red" />
            </div>
            <h3 className="font-bold mb-1 text-fg-muted">Share Credits</h3>
            <p className="text-xs text-link">Authorize other wallets to use your credits</p>
          </div>
          
          <div className="bg-surface border border-default rounded-lg p-5 hover:border-turbo-red/50 transition-colors text-center">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
              <Upload className="w-5 h-5 text-turbo-red" />
            </div>
            <h3 className="font-bold mb-1 text-fg-muted">Upload Files</h3>
            <p className="text-xs text-link">Store data permanently on Arweave</p>
          </div>
          
          <div className="bg-surface border border-default rounded-lg p-5 hover:border-turbo-red/50 transition-colors text-center">
            <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
              <Globe2 className="w-5 h-5 text-turbo-red" />
            </div>
            <h3 className="font-bold mb-1 text-fg-muted">ArNS Names</h3>
            <p className="text-xs text-link">Register permanent domain names</p>
          </div>
        </div>
        
        {!loggedIn && (
          <div className="text-center mt-8">
            <button
              className="rounded-lg bg-turbo-red px-8 py-3 font-bold text-white hover:bg-turbo-red/90 transition-colors text-lg"
              onClick={() => setShowWalletModal(true)}
            >
              Connect Wallet to Get Started →
            </button>
          </div>
        )}
      </div>

      {/* Interactive Feature Explorer */}
      <div className="mb-12">
        <div className="rounded-lg border border-default bg-canvas">
          <div className="border-b border-default bg-surface/30 px-4 sm:px-6 py-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-link" />
            <p className="text-xs sm:text-sm text-link">
              <span className="font-medium">Feature Explorer</span> 
              <span className="hidden sm:inline"> - Explore what you can do with Turbo</span>
            </p>
          </div>
          
          {/* Desktop: Vertical Sidebar Layout */}
          <div className="hidden md:flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-default bg-surface/20">
              <div className="py-2">
                {features.map((feature, index) => (
                  <button
                    key={feature.name}
                    onClick={() => setSelectedFeatureIndex(index)}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                      selectedFeatureIndex === index 
                        ? 'bg-turbo-red/10 border-r-2 border-turbo-red text-fg-muted' 
                        : 'text-link hover:bg-surface/50 hover:text-fg-muted'
                    }`}
                  >
                    <feature.icon className={`w-5 h-5 ${
                      selectedFeatureIndex === index ? 'text-turbo-red' : 'text-link'
                    }`} />
                    <span className="font-medium">{feature.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-8">
              <div className="text-center py-4">
                {(() => {
                  const Icon = features[selectedFeatureIndex].icon;
                  return <Icon className="w-16 h-16 text-turbo-red mx-auto mb-4" />;
                })()}
                <h3 className="text-xl font-bold text-fg-muted mb-2">{features[selectedFeatureIndex].title}</h3>
                <p className="text-link mb-6 max-w-md mx-auto">
                  {features[selectedFeatureIndex].description}
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-link mb-6 flex-wrap">
                  {features[selectedFeatureIndex].benefits.map((benefit) => (
                    <span key={benefit} className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-turbo-red" /> {benefit}
                    </span>
                  ))}
                </div>
                <button onClick={() => {
                  const feature = features[selectedFeatureIndex];
                  if (feature.action === 'redeem' || feature.action === 'balance-checker' || feature.action === 'gateway-info') {
                    setCurrentPage?.(feature.action);
                  } else if (loggedIn) {
                    setCurrentPage?.(feature.action);
                  } else {
                    setShowWalletModal(true);
                  }
                }} className="bg-turbo-red text-white px-6 py-2 rounded-lg font-medium hover:bg-turbo-red/90">
                  {(features[selectedFeatureIndex].action === 'redeem' || features[selectedFeatureIndex].action === 'balance-checker' || features[selectedFeatureIndex].action === 'gateway-info') 
                    ? features[selectedFeatureIndex].loginText
                    : loggedIn 
                      ? features[selectedFeatureIndex].loginText 
                      : features[selectedFeatureIndex].connectText
                  }
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile: Dropdown Layout */}
          <div className="md:hidden">
            <div className="p-4">
              <Listbox value={features[selectedFeatureIndex]} onChange={(feature) => {
                const index = features.findIndex(f => f.name === feature.name);
                setSelectedFeatureIndex(index);
              }}>
                <div className="relative mb-4">
                  <Listbox.Button className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-default rounded-lg text-left">
                    <span className="flex items-center gap-3">
                      {(() => {
                        const Icon = features[selectedFeatureIndex].icon;
                        return <Icon className="w-5 h-5 text-turbo-red" />;
                      })()}
                      <span className="font-medium text-fg-muted">{features[selectedFeatureIndex].name}</span>
                    </span>
                    <ChevronDown className="w-4 h-4 text-link" />
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute z-50 mt-1 w-full bg-surface border border-default rounded-lg shadow-lg py-1">
                      {features.map((feature) => (
                        <Listbox.Option
                          key={feature.name}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2 px-4 ${
                              active ? 'bg-canvas text-fg-muted' : 'text-link'
                            }`
                          }
                          value={feature}
                        >
                          <span className="flex items-center gap-3">
                            <feature.icon className="w-4 h-4" />
                            {feature.name}
                          </span>
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
              
              {/* Mobile Content */}
              <div className="text-center py-4">
                {(() => {
                  const Icon = features[selectedFeatureIndex].icon;
                  return <Icon className="w-16 h-16 text-turbo-red mx-auto mb-4" />;
                })()}
                <h3 className="text-xl font-bold text-fg-muted mb-2">{features[selectedFeatureIndex].title}</h3>
                <p className="text-link mb-6">
                  {features[selectedFeatureIndex].description}
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm text-link mb-6">
                  {features[selectedFeatureIndex].benefits.map((benefit) => (
                    <span key={benefit} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-turbo-red" /> {benefit}
                    </span>
                  ))}
                </div>
                <button onClick={() => {
                  const feature = features[selectedFeatureIndex];
                  if (feature.action === 'redeem' || feature.action === 'balance-checker' || feature.action === 'gateway-info') {
                    setCurrentPage?.(feature.action);
                  } else if (loggedIn) {
                    setCurrentPage?.(feature.action);
                  } else {
                    setShowWalletModal(true);
                  }
                }} className="bg-turbo-red text-white px-6 py-2 rounded-lg font-medium hover:bg-turbo-red/90">
                  {(features[selectedFeatureIndex].action === 'redeem' || features[selectedFeatureIndex].action === 'balance-checker' || features[selectedFeatureIndex].action === 'gateway-info') 
                    ? features[selectedFeatureIndex].loginText
                    : loggedIn 
                      ? features[selectedFeatureIndex].loginText 
                      : features[selectedFeatureIndex].connectText
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-canvas border border-default rounded-lg p-6">
          <Zap className="w-8 h-8 text-turbo-red mb-3" />
          <h3 className="font-bold mb-2 text-fg-muted">860 tx/sec</h3>
          <p className="text-sm text-link">Ultra-high throughput for production workloads</p>
        </div>
        <div className="bg-canvas border border-default rounded-lg p-6">
          <Shield className="w-8 h-8 text-turbo-red mb-3" />
          <h3 className="font-bold mb-2 text-fg-muted">Cryptographic Receipts</h3>
          <p className="text-sm text-link">Verifiable upload proofs for every transaction</p>
        </div>
        <div className="bg-canvas border border-default rounded-lg p-6">
          <Globe className="w-8 h-8 text-turbo-red mb-3" />
          <h3 className="font-bold mb-2 text-fg-muted">Global CDN</h3>
          <p className="text-sm text-link">Fast access via distributed AR.IO gateways</p>
        </div>
        <div className="bg-canvas border border-default rounded-lg p-6">
          <Database className="w-8 h-8 text-turbo-red mb-3" />
          <h3 className="font-bold mb-2 text-fg-muted">GraphQL Indexing</h3>
          <p className="text-sm text-link">Query your data with powerful filters</p>
        </div>
      </div>

      {/* Build Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-fg-muted">Build</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <a href="https://docs.ardrive.io/docs/turbo/turbo-sdk/" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">SDK</div>
            <h3 className="font-bold mb-2 text-fg-muted">Turbo SDK (Node & Web)</h3>
            <p className="text-sm text-link">Install, quick start, events, CLI, and architecture.</p>
          </a>
          
          <a href="https://docs.ardrive.io/docs/turbo/turbo-sdk/frameworks/html.html" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">GUIDE</div>
            <h3 className="font-bold mb-2 text-fg-muted">Use Turbo SDK in plain HTML</h3>
            <p className="text-sm text-link">Drop-in CDN import — no bundlers needed.</p>
          </a>
          
          <a href="https://docs.ar.io/guides/uploading-to-arweave" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">UPLOAD</div>
            <h3 className="font-bold mb-2 text-fg-muted">Uploading to Arweave with Turbo</h3>
            <p className="text-sm text-link">AR.IO guide that walks through uploads with Turbo.</p>
          </a>
          
          <a href="https://cookbook.ar.io/guides/posting-transactions/turbo.html" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">EXAMPLES</div>
            <h3 className="font-bold mb-2 text-fg-muted">Posting transactions via Turbo</h3>
            <p className="text-sm text-link">Code-first cookbook examples for data and files.</p>
          </a>
          
          <a href="https://docs.ardrive.io/docs/turbo/migrating.html" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">MIGRATION</div>
            <h3 className="font-bold mb-2 text-fg-muted">Migrating from Irys</h3>
            <p className="text-sm text-link">Point your Irys SDK/CLI at Turbo with minimal changes.</p>
          </a>
          
          <a href="https://docs.ar.io/guides/permaweb-deploy" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">DEPLOY</div>
            <h3 className="font-bold mb-2 text-fg-muted">Deploy to Permaweb with GitHub</h3>
            <p className="text-sm text-link">Auto-deploy sites to Arweave with GitHub Actions and ArNS.</p>
          </a>
        </div>
      </section>

      {/* APIs Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-fg-muted">APIs</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <a href="https://upload.ardrive.io/api-docs" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <FileCode className="w-6 h-6 text-turbo-red mb-3" />
            <h3 className="font-bold mb-2 text-fg-muted">Upload Service API</h3>
            <p className="text-sm text-link">Pay for signed data-items and post to Arweave.</p>
          </a>
          
          <a href="https://payment.ardrive.io/api-docs" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <FileCode className="w-6 h-6 text-turbo-red mb-3" />
            <h3 className="font-bold mb-2 text-fg-muted">Payment Service API</h3>
            <p className="text-sm text-link">Top ups, fiat rates, supported currencies/countries.</p>
          </a>
          
          <a href="http://turbo-gateway.com/api-docs/" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <FileCode className="w-6 h-6 text-turbo-red mb-3" />
            <h3 className="font-bold mb-2 text-fg-muted">Turbo Gateway API</h3>
            <p className="text-sm text-link">General gateway endpoints served by this Turbo Gateway.</p>
          </a>
        </div>
      </section>

      {/* Resources Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-fg-muted">Resources</h2>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Documentation */}
          <a href="https://docs.ar.io/gateways/" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <Book className="w-6 h-6 text-turbo-red mb-3" />
            <h3 className="font-bold mb-2 text-fg-muted">AR.IO Gateway Docs</h3>
            <p className="text-sm text-link">Architecture, network, and implementation details.</p>
          </a>
          
          <a href="https://docs.ardrive.io/docs/turbo/credit-sharing.html" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <Book className="w-6 h-6 text-turbo-red mb-3" />
            <h3 className="font-bold mb-2 text-fg-muted">Turbo Credit Sharing</h3>
            <p className="text-sm text-link">Approve other wallets to use your Credits with guardrails.</p>
          </a>
          
          <a href="https://docs.ar.io/introduction" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <Book className="w-6 h-6 text-turbo-red mb-3" />
            <h3 className="font-bold mb-2 text-fg-muted">AR.IO Network</h3>
            <p className="text-sm text-link">A permanent cloud network of services built on Arweave.</p>
          </a>
          
          {/* Source Code */}
          <a href="https://github.com/ardriveapp/turbo-sdk" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <Github className="w-6 h-6 text-turbo-red mb-3" />
            <h3 className="font-bold mb-2 text-fg-muted">Turbo SDK</h3>
            <p className="text-sm text-link">TypeScript SDK for uploads and payments.</p>
          </a>
          
          <a href="https://github.com/ardriveapp/turbo-upload-service" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <Github className="w-6 h-6 text-turbo-red mb-3" />
            <h3 className="font-bold mb-2 text-fg-muted">Upload Service</h3>
            <p className="text-sm text-link">Bundler that packages ANS-104 data items.</p>
          </a>
          
          <a href="https://github.com/ardriveapp/turbo-payment-service" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <Github className="w-6 h-6 text-turbo-red mb-3" />
            <h3 className="font-bold mb-2 text-fg-muted">Payment Service</h3>
            <p className="text-sm text-link">Balances, top-ups, fiat/crypto rails.</p>
          </a>
          
          <a href="https://github.com/ar-io/ar-io-node" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-red/50 transition-colors">
            <Github className="w-6 h-6 text-turbo-red mb-3" />
            <h3 className="font-bold mb-2 text-fg-muted">AR.IO Node</h3>
            <p className="text-sm text-link">Core gateway/node implementation.</p>
          </a>
        </div>
      </section>

      {/* Beyond Uploads Section */}
      <section className="bg-gradient-to-r from-turbo-red/10 to-turbo-blue/10 rounded-lg border border-default p-8">
        <div className="text-center">
          <div className="text-xs text-link uppercase tracking-wider mb-2">TURBO GATEWAY</div>
          <h2 className="text-3xl font-bold mb-4 text-fg-muted">Beyond uploads</h2>
          <p className="text-lg mb-8 max-w-3xl mx-auto text-link">
            Turbo isn't just for storage payments. It's a programmable edge that can price, prioritize, 
            and power data access across the Permaweb.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-canvas/50 backdrop-blur rounded-lg p-6">
            <h3 className="font-bold mb-2 text-fg-muted">Prioritized retrieval</h3>
            <p className="text-sm text-link">
              Opt-in paid QoS for lower-latency reads when speed matters.
            </p>
          </div>
          
          <div className="bg-canvas/50 backdrop-blur rounded-lg p-6">
            <h3 className="font-bold mb-2 text-fg-muted">Bigger, faster GraphQL</h3>
            <p className="text-sm text-link">
              Higher limits and tuned performance for heavy queries.
            </p>
          </div>
          
          <div className="bg-canvas/50 backdrop-blur rounded-lg p-6">
            <h3 className="font-bold mb-2 text-fg-muted">Custom indexing</h3>
            <p className="text-sm text-link">
              Gateway-level indexes and tailored APIs for your app.
            </p>
          </div>
        </div>
      </section>

      {/* ArDrive Section - For Non-Developers */}
      <section className="text-center bg-gradient-to-r from-surface/50 to-surface/30 rounded-lg border border-default p-8">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-fg-muted mb-3">Looking for a no-code solution?</h3>
          <p className="text-link mb-6">
            ArDrive is the user-friendly app powered by Turbo. Upload, share, and publish to the permaweb with a simple drag-and-drop interface. Manage ArNS names, create permanent websites, and organize your files—all without writing code.
          </p>
          <a 
            href="https://ardrive.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-canvas hover:bg-surface border border-default rounded-lg px-6 py-3 group transition-all hover:border-turbo-red/50"
          >
            <img src="/ardrive-logo.png" alt="ArDrive" className="w-8 h-8" />
            <div className="text-left">
              <div className="font-bold text-fg-muted group-hover:text-turbo-red transition-colors">Try ArDrive</div>
              <div className="text-xs text-link">The easy way to use Turbo</div>
            </div>
            <ArrowRight className="w-5 h-5 text-link group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;