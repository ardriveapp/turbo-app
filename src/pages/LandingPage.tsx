import { useState, useEffect } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import WalletSelectionModal from '../components/modals/WalletSelectionModal';
import { useWincForOneGiB } from '../hooks/useWincForOneGiB';
import { useCreditsForFiat } from '../hooks/useCreditsForFiat';
import { useFreeUploadLimit, formatFreeLimit } from '../hooks/useFreeUploadLimit';
import {
  ArrowRight, Zap, Github, FileCode, Database, Rss,
  CreditCard, Gift, Ticket, Users, Upload, Globe2, Search, Check, Copy, ChevronDown, Info,
  Package, Cloud, Server, Wallet, Brain, Camera, Phone, BookOpen, Calculator
} from 'lucide-react';

const LandingPage = () => {
  const { address } = useStore();
  const navigate = useNavigate();
  const freeUploadLimitBytes = useFreeUploadLimit();
  const loggedIn = address !== null;
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Get pricing data (matches pricing calculator logic)
  const wincForOneGiB = useWincForOneGiB();
  const [creditsForOneUSD] = useCreditsForFiat(1, () => {});

  // Convert winc to USD: winc -> credits -> dollars
  const pricePerGiB = wincForOneGiB && creditsForOneUSD
    ? ((Number(wincForOneGiB) / 1e12) / creditsForOneUSD).toFixed(2)
    : '...';

  // Handle touch gestures for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0); // Reset touch end
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swipe left - go to next slide
      setCurrentSlide((prev) => (prev + 1) % companies.length);
    }
    if (distance < -minSwipeDistance) {
      // Swipe right - go to previous slide
      setCurrentSlide((prev) => (prev - 1 + companies.length) % companies.length);
    }
  };

  // Company data for the carousel
  const companies = [
    { name: 'Forward Research', url: 'https://fwd.ar.io/', logo: '/forward-research-logo.jpg', description: 'Arweave core development team' },
    { name: 'Drip Haus', url: 'https://drip.haus/', logo: '/drip-haus-logo.png', description: 'NFT curation and discovery platform' },
    { name: 'Manifold', url: 'https://manifold.xyz/', logo: '/manifold_logo.jpg', description: 'NFT creation and deployment tools' },
    { name: 'Meta/Instagram', url: 'https://www.theblock.co/post/182569/meta-arweave-instagram-nfts', logo: '/meta-logo.svg', description: 'Digital collectibles platform' },
    { name: 'RedStone Oracle', url: 'https://www.redstone.finance/', logo: '/RedStone_squarelogo.png', description: 'Permanent price feed storage' },
    { name: 'KYVE Network', url: 'https://www.kyve.network/', logo: '/kyve-logo.jpeg', description: 'Blockchain data archival' },
    { name: 'Metaplex', url: 'https://www.metaplex.com/', logo: '/metaplex_studios_logo.jpeg', description: 'Solana NFT metadata storage' },
    { name: 'Load Network', url: 'https://www.load.network/', logo: '/load-network-logo.svg', description: 'High performance EVM storage chain' },
    { name: 'Solana Mobile', url: 'https://solanamobile.com/', logo: '/Solana_logo.png', description: 'Mobile app storage and distribution' }
  ];

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % companies.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [companies.length]);

  // Feature color mapping based on service themes
  const getFeatureColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'top up':
      case 'share': 
      case 'gift':
      case 'check balance':
      case 'redeem':
        return {
          text: 'text-fg-muted',
          bg: 'bg-fg-muted/10', 
          border: 'border-fg-muted',
          button: 'bg-fg-muted text-black hover:bg-fg-muted/90'
        };
      case 'upload':
      case 'deploy':
      case 'capture':
        return {
          text: 'text-turbo-red',
          bg: 'bg-turbo-red/10',
          border: 'border-turbo-red',
          button: 'bg-turbo-red text-white hover:bg-turbo-red/90'
        };
      case 'domains':
        return {
          text: 'text-turbo-yellow',
          bg: 'bg-turbo-yellow/10',
          border: 'border-turbo-yellow',
          button: 'bg-turbo-yellow text-black hover:bg-turbo-yellow/90'
        };
      case 'service info':
        return {
          text: 'text-turbo-purple',
          bg: 'bg-turbo-purple/10', 
          border: 'border-turbo-purple',
          button: 'bg-turbo-purple text-black hover:bg-turbo-purple/90'
        };
      default:
        return {
          text: 'text-turbo-red',
          bg: 'bg-turbo-red/10',
          border: 'border-turbo-red',
          button: 'bg-turbo-red text-white hover:bg-turbo-red/90'
        };
    }
  };

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
      description: 'Drag and drop files for permanent storage on Arweave. Batch uploads with real-time progress tracking, x402 instant payments and instant receipts.',
      benefits: ['Drag & drop interface', 'Batch uploads', 'x402 instant payments', 'Instant receipts'],
      action: 'upload',
      loginText: 'Upload Files',
      connectText: 'Connect Wallet to Upload'
    },
    {
      name: 'Deploy',
      icon: Zap,
      title: 'Deploy Sites to the Permaweb',
      description: 'Deploy complete websites with automatic manifest creation and permanent hosting. Perfect for static sites, SPAs, and documentation.',
      benefits: ['Permanent hosting', 'Automatic manifests', 'Custom fallback pages', 'Domain name assignment'],
      action: 'deploy',
      loginText: 'Deploy Site',
      connectText: 'Connect Wallet to Deploy'
    },
    {
      name: 'Capture',
      icon: Camera,
      title: 'Capture & Archive Webpages',
      description: 'Preserve any webpage as a full-page screenshot on Arweave. Perfect for archiving content, preserving evidence, or creating permanent snapshots of the web.',
      benefits: ['Full-page screenshots', 'Permanent web archival', 'ArNS domain assignment'],
      action: 'capture',
      loginText: 'Capture Webpage',
      connectText: 'Connect Wallet to Capture'
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
      benefits: ['Shared via Gift email', 'Instant delivery', 'Any wallet you want'],
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
      name: 'Check Balance', 
      icon: Search, 
      title: 'Check Any Wallet Balance',
      description: 'Look up credit balances for any wallet address across Arweave, Ethereum, and Solana networks with storage estimates.',
      benefits: ['Multi-chain support', 'Real-time data', 'Storage estimates'],
      action: 'balances',
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
    <div className="space-y-12 px-4 sm:px-0">
      {/* Hero Section */}
      <div className="flex w-full flex-col items-center rounded-xl border border-default bg-gradient-to-b from-canvas to-surface/30 px-8 sm:px-12 py-10">
        {/* Small badge */}
        <a
          href="https://ar.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-surface/80 backdrop-blur text-fg-muted px-3 py-1.5 rounded-full text-xs font-semibold mb-4 border border-default hover:border-turbo-purple/50 transition-colors group"
        >
          <img src="/ar.io-logo-white.png" alt="AR.IO" className="h-4 w-auto" />
          <span className="group-hover:text-turbo-red transition-colors">Powered by AR.IO</span>
        </a>

        {/* Main headline with gradient */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center max-w-5xl leading-tight">
          <span className="bg-gradient-to-r from-fg-muted via-fg-muted to-turbo-red bg-clip-text text-transparent">
            The fastest way to upload, download, and index
          </span>
          <span className="text-fg-muted"> on Arweave.</span>
        </h1>

        {/* Subheadline */}
        <p className="mt-5 text-base sm:text-lg text-center max-w-3xl text-link/90 leading-relaxed">
          Turbo is a streamlined permaweb service provider with built-in fiat and crypto payments. Top up instantly and ship fast with SDKs designed for developers and AI Agents.
        </p>

        {/* CTA Section */}
        <div className="mt-7 flex flex-col sm:flex-row items-center gap-4">
          <a
            href="https://cal.com/kempsterrrr/ar-io-ecosystem-intro"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative rounded-lg bg-turbo-red px-8 py-4 font-bold text-white hover:bg-turbo-red/90 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2 text-lg"
          >
            <Phone className="w-5 h-5" />
            <span>Book a Demo</span>
          </a>

          <a
            href="https://docs.ar.io/build/upload/bundling-services"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-default px-8 py-4 font-medium flex items-center gap-2 hover:bg-surface hover:border-fg-muted transition-all group"
          >
            <BookOpen className="w-5 h-5" />
            <span>Read the Docs</span>
          </a>
        </div>

        {/* Free tier callout */}
        {freeUploadLimitBytes > 0 && (
          <div className="mt-3 text-sm text-link/70">
            <Check className="w-4 h-4 text-green-500 inline mr-1" />
            Files under {formatFreeLimit(freeUploadLimitBytes)} are completely FREE
          </div>
        )}

        {/* Terminal snippet - more integrated */}
        <div className="mt-8 w-full max-w-2xl">
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
                <span className="text-white/50 ml-1 animate-[blink_1s_infinite]">|</span>
              </div>
            </div>
          </div>

          {/* Subtle Try it Out link */}
          <div className="mt-3 text-center">
            <button
              onClick={() => {
                if (loggedIn) {
                  navigate('/upload');
                } else {
                  setShowWalletModal(true);
                }
              }}
              className="text-sm text-link hover:text-fg-muted underline decoration-link/40 hover:decoration-fg-muted inline-flex items-center gap-1.5 group transition-colors"
            >
              <span>or try uploading a file</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {showWalletModal && (
          <WalletSelectionModal
            onClose={() => setShowWalletModal(false)}
          />
        )}
      </div>

      {/* How it Works */}
      <div className="mb-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3 text-fg-muted">How does it work?</h2>
          <p className="text-lg text-link/80 max-w-3xl mx-auto">
            Turbo abstracts Arweave complexity with instant funding, streamlined uploads, and verifiable on-chain settlement — all distributed through the AR.IO Network.
          </p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-6">
          {/* Step 1: Fund */}
          <div className="bg-surface/50 border border-default rounded-xl p-6 hover:border-turbo-purple/50 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl font-bold text-fg-muted">1.</div>
              <h3 className="text-xl font-bold text-fg-muted">Fund</h3>
            </div>
            <p className="text-sm text-link">
              Buy Turbo Credits instantly with a card or crypto like ETH, SOL, ARIO, Stablecoins (via x402), and more — ready to upload in seconds.
            </p>
          </div>

          {/* Step 2: Bundle */}
          <div className="bg-surface/50 border border-default rounded-xl p-6 hover:border-turbo-purple/50 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl font-bold text-fg-muted">2.</div>
              <h3 className="text-xl font-bold text-fg-muted">Upload</h3>
            </div>
            <p className="text-sm text-link">
              Use your favorite Arweave, Ethereum, or Solana wallet to cryptographically sign and upload data.
            </p>
          </div>

          {/* Step 3: Settle */}
          <div className="bg-surface/50 border border-default rounded-xl p-6 hover:border-turbo-purple/50 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl font-bold text-fg-muted">3.</div>
              <h3 className="text-xl font-bold text-fg-muted">Settle</h3>
            </div>
            <p className="text-sm text-link">
              Your files are bundled and permanently stored on Arweave — timestamped, tamper-proof, and verifiable forever.
            </p>
          </div>

          {/* Step 4: Access */}
          <div className="bg-surface/50 border border-default rounded-xl p-6 hover:border-turbo-purple/50 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl font-bold text-fg-muted">4.</div>
              <h3 className="text-xl font-bold text-fg-muted">Access</h3>
            </div>
            <p className="text-sm text-link">
              Access your data instantly with CDN-level performance through the decentralized AR.IO Network.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://cal.com/kempsterrrr/ar-io-ecosystem-intro"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative rounded-lg bg-turbo-red px-8 py-4 font-bold text-white hover:bg-turbo-red/90 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2 text-lg"
          >
            <Phone className="w-5 h-5" />
            <span>Book a Demo</span>
          </a>

          <button
            className="rounded-lg border border-default px-8 py-4 font-medium flex items-center gap-2 hover:bg-surface hover:border-fg-muted transition-all group"
            onClick={() => {
              if (loggedIn) {
                navigate('/upload');
              } else {
                setShowWalletModal(true);
              }
            }}
          >
            <Upload className="w-5 h-5" />
            <span>Try it Out</span>
          </button>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-fg-muted mb-2">Transparent Pricing</h2>
          <p className="text-link/80">Pay-as-you-go storage with no subscriptions, now with x402</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {freeUploadLimitBytes > 0 && (
            <div className="bg-gradient-to-br from-turbo-green/10 to-turbo-green/5 rounded-lg border-2 border-turbo-green/50 p-8 text-center">
              <div className="text-4xl font-bold text-turbo-green mb-2">FREE</div>
              <div className="text-lg text-fg-muted font-medium mb-1">Files under {formatFreeLimit(freeUploadLimitBytes)}</div>
              <div className="text-sm text-link">No credit card required</div>
            </div>
          )}
          <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-lg border border-default p-8 text-center">
            <div className="text-4xl font-bold text-turbo-red mb-2">${pricePerGiB}</div>
            <div className="text-lg text-fg-muted font-medium mb-1">Per GiB</div>
            <div className="text-sm text-link mb-4">Larger files & bulk storage</div>
            <button
              onClick={() => navigate('/calculator')}
              className="inline-flex items-center gap-1 text-sm text-link hover:text-fg-muted font-medium group"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculate custom costs</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Trusted by Industry Leaders */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-fg-muted mb-2">Trusted by Web3 Leaders</h2>
          <p className="text-link/80">Powering critical infrastructure across the decentralized web</p>
        </div>
        
        {/* Carousel container */}
        <div className="carousel-wrapper relative">
          <div 
            className="overflow-hidden rounded-xl"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Desktop: 3 columns, Mobile: 1 column */}
            <div 
              className="carousel-container flex md:hidden"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {companies.map((company, index) => (
                <div key={`${company.name}-${index}`} className="w-full flex-shrink-0 px-4">
                  <a
                    href={company.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-lg border border-default p-6 text-center hover:border-turbo-red/30 transition-all group block h-full"
                  >
                    <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <img src={company.logo} alt={company.name} className="w-16 h-16 object-contain" />
                    </div>
                    <div className="text-xl font-bold text-fg-muted mb-3 group-hover:text-turbo-red transition-colors">
                      {company.name}
                    </div>
                    <div className="text-base text-link leading-relaxed">
                      {company.description}
                    </div>
                  </a>
                </div>
              ))}
            </div>

            {/* Desktop version */}
            <div 
              className="carousel-container hidden md:flex"
              style={{ transform: `translateX(-${currentSlide * (100 / 3)}%)` }}
            >
              {companies.map((company, index) => (
                <div key={`${company.name}-${index}`} className="w-1/3 flex-shrink-0 px-3">
                  <a
                    href={company.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-lg border border-default p-6 text-center hover:border-turbo-red/30 transition-all group block h-full"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <img src={company.logo} alt={company.name} className="w-12 h-12 object-contain" />
                    </div>
                    <div className="text-lg font-bold text-fg-muted mb-2 group-hover:text-turbo-red transition-colors">
                      {company.name}
                    </div>
                    <div className="text-sm text-link">
                      {company.description}
                    </div>
                  </a>
                </div>
              ))}
              
              {/* Duplicate first few items for seamless loop */}
              {companies.slice(0, 3).map((company, index) => (
                <div key={`${company.name}-duplicate-${index}`} className="w-1/3 flex-shrink-0 px-3">
                  <a
                    href={company.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-lg border border-default p-6 text-center hover:border-turbo-red/30 transition-all group block h-full"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <img src={company.logo} alt={company.name} className="w-12 h-12 object-contain" />
                    </div>
                    <div className="text-lg font-bold text-fg-muted mb-2 group-hover:text-turbo-red transition-colors">
                      {company.name}
                    </div>
                    <div className="text-sm text-link">
                      {company.description}
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
          
          {/* Dots indicator */}
          <div className="flex justify-center mt-6 gap-3">
            {companies.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`relative p-2 transition-all duration-300 ${
                  index === currentSlide % companies.length
                    ? 'scale-110'
                    : 'hover:scale-105'
                }`}
              >
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide % companies.length
                    ? 'bg-turbo-red w-6'
                    : 'bg-turbo-red/30 hover:bg-turbo-red/50'
                }`} />
              </button>
            ))}
          </div>
        </div>
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
                        ? `${getFeatureColor(feature.name).bg} border-r-2 ${getFeatureColor(feature.name).border} text-fg-muted` 
                        : 'text-link hover:bg-surface/50 hover:text-fg-muted'
                    }`}
                  >
                    <feature.icon className={`w-5 h-5 ${
                      selectedFeatureIndex === index ? getFeatureColor(feature.name).text : 'text-link'
                    }`} />
                    <span className="font-medium">{feature.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-4 sm:p-8">
              <div className="text-center py-4">
                {(() => {
                  const Icon = features[selectedFeatureIndex].icon;
                  return <Icon className={`w-16 h-16 ${getFeatureColor(features[selectedFeatureIndex].name).text} mx-auto mb-4`} />;
                })()}
                <h3 className="text-xl font-bold text-fg-muted mb-2">{features[selectedFeatureIndex].title}</h3>
                <p className="text-link mb-6 max-w-md mx-auto">
                  {features[selectedFeatureIndex].description}
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-link mb-6 flex-wrap">
                  {features[selectedFeatureIndex].benefits.map((benefit) => (
                    <span key={benefit} className="flex items-center gap-1">
                      <Check className={`w-4 h-4 ${getFeatureColor(features[selectedFeatureIndex].name).text}`} /> {benefit}
                    </span>
                  ))}
                </div>
                <button onClick={() => {
                  const feature = features[selectedFeatureIndex];
                  if (feature.action === 'redeem' || feature.action === 'balances' || feature.action === 'gateway-info') {
                    navigate(`/${feature.action}`);
                  } else if (loggedIn) {
                    navigate(`/${feature.action}`);
                  } else {
                    setShowWalletModal(true);
                  }
                }} className={`px-6 py-2 rounded-lg font-medium ${getFeatureColor(features[selectedFeatureIndex].name).button}`}>
                  {(features[selectedFeatureIndex].action === 'redeem' || features[selectedFeatureIndex].action === 'balances' || features[selectedFeatureIndex].action === 'gateway-info') 
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
                  return <Icon className={`w-16 h-16 ${getFeatureColor(features[selectedFeatureIndex].name).text} mx-auto mb-4`} />;
                })()}
                <h3 className="text-xl font-bold text-fg-muted mb-2">{features[selectedFeatureIndex].title}</h3>
                <p className="text-link mb-6">
                  {features[selectedFeatureIndex].description}
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm text-link mb-6">
                  {features[selectedFeatureIndex].benefits.map((benefit) => (
                    <span key={benefit} className="flex items-center gap-2">
                      <Check className={`w-4 h-4 ${getFeatureColor(features[selectedFeatureIndex].name).text}`} /> {benefit}
                    </span>
                  ))}
                </div>
                <button onClick={() => {
                  const feature = features[selectedFeatureIndex];
                  if (feature.action === 'redeem' || feature.action === 'balances' || feature.action === 'gateway-info') {
                    navigate(`/${feature.action}`);
                  } else if (loggedIn) {
                    navigate(`/${feature.action}`);
                  } else {
                    setShowWalletModal(true);
                  }
                }} className={`px-6 py-2 rounded-lg font-medium ${getFeatureColor(features[selectedFeatureIndex].name).button}`}>
                  {(features[selectedFeatureIndex].action === 'redeem' || features[selectedFeatureIndex].action === 'balances' || features[selectedFeatureIndex].action === 'gateway-info') 
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

      {/* CTA Section after Features */}
      <div className="mb-12 flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href="https://cal.com/kempsterrrr/ar-io-ecosystem-intro"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative rounded-lg bg-turbo-red px-8 py-4 font-bold text-white hover:bg-turbo-red/90 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2 text-lg"
        >
          <Phone className="w-5 h-5" />
          <span>Book a Demo</span>
        </a>

        <a
          href="https://docs.ar.io/build/upload/bundling-services"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-default px-8 py-4 font-medium flex items-center gap-2 hover:bg-surface hover:border-fg-muted transition-all group"
        >
          <BookOpen className="w-5 h-5" />
          <span>Read the Docs</span>
        </a>
      </div>

      {/* Turbo by the Numbers */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-fg-muted mb-2">Turbo by the Numbers</h2>
          <p className="text-link/80">Real performance metrics from production infrastructure</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-lg border border-default p-6 text-center">
            <div className="text-3xl font-bold text-turbo-red mb-1">20B+</div>
            <div className="text-sm text-link">Files uploaded to Arweave</div>
          </div>
          <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-lg border border-default p-6 text-center">
            <div className="text-3xl font-bold text-turbo-red mb-1">200+</div>
            <div className="text-sm text-link">TiB of data stored</div>
          </div>
          <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-lg border border-default p-6 text-center">
            <div className="text-3xl font-bold text-turbo-red mb-1">~860</div>
            <div className="text-sm text-link">Files per second</div>
          </div>
          <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-lg border border-default p-6 text-center">
            <div className="text-3xl font-bold text-turbo-red mb-1">99.9%</div>
            <div className="text-sm text-link">Gateway uptime</div>
          </div>
        </div>
      </div>

      {/* Build Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-fg-muted">Build</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <a href="https://docs.ar.io/build/upload/bundling-services" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">START</div>
            <h3 className="font-bold mb-2 text-fg-muted">Getting Started</h3>
            <p className="text-sm text-link">AR.IO guide that walks through uploads with Turbo.</p>
          </a>

          <a href="https://docs.ar.io/build/upload/turbo-credits" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">PAY</div>
            <h3 className="font-bold mb-2 text-fg-muted">Paying for Uploads</h3>
            <p className="text-sm text-link">Turbo Credits are the payment medium used by Turbo's upload service.</p>
          </a>

          <a href="https://docs.ar.io/build/guides/hosting-decentralized-websites" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">DEPLOY</div>
            <h3 className="font-bold mb-2 text-fg-muted">Host Decentralized Websites</h3>
            <p className="text-sm text-link">Deploy your webpage or app Arweave with ArNS.</p>
          </a>

          <a href="https://docs.ar.io/build/access" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">ACCESS</div>
            <h3 className="font-bold mb-2 text-fg-muted">Accessing Data</h3>
            <p className="text-sm text-link">Resilient and decentralized access for your apps.</p>
          </a>

          <a href="https://docs.ar.io/build/upload/advanced-uploading-with-turbo" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">ADVANCED</div>
            <h3 className="font-bold mb-2 text-fg-muted">Advanced Uploading</h3>
            <p className="text-sm text-link">Code-first examples for paying for and uploading files.</p>
          </a>

          <a href="https://docs.ar.io/build/run-a-gateway" target="_blank" rel="noopener noreferrer"
             className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
            <div className="text-xs text-link uppercase tracking-wider mb-2">OPERATE</div>
            <h3 className="font-bold mb-2 text-fg-muted">Run a Gateway</h3>
            <p className="text-sm text-link">Join the decentralized network that powers permanent data.</p>
          </a>

        </div>
      </section>

      {/* Resources Section */}
      <section>
        <h2 className="text-2xl font-bold mb-8 text-fg-muted">Resources</h2>

        {/* API Documentation */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-turbo-purple/20 rounded-lg flex items-center justify-center">
              <Cloud className="w-4 h-4 text-turbo-purple" />
            </div>
            <h3 className="text-lg font-bold text-fg-muted">API Documentation</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <a href="https://upload.ardrive.io/api-docs" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Upload className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">Upload Service API</h3>
              <p className="text-sm text-link">Pay for signed data-items and post to Arweave.</p>
            </a>

            <a href="https://payment.ardrive.io/api-docs" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Wallet className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">Payment Service API</h3>
              <p className="text-sm text-link">Top ups, fiat rates, supported currencies/countries.</p>
            </a>

            <a href="http://turbo-gateway.com/api-docs/" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Server className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">Turbo Gateway API</h3>
              <p className="text-sm text-link">General gateway endpoints served by this Turbo Gateway.</p>
            </a>
          </div>
        </div>

        {/* Learn */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-turbo-purple/20 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-turbo-purple" />
            </div>
            <h3 className="text-lg font-bold text-fg-muted">Learn</h3>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            <a href="https://docs.ar.io/learn/gateways" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Server className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">AR.IO Gateways</h3>
              <p className="text-sm text-link">Infrastructure nodes that bridge the Arweave network and applications.</p>
            </a>

            <a href="https://docs.ar.io/learn/arns" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Globe2 className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">Arweave Name System</h3>
              <p className="text-sm text-link">A decentralized domain system connecting friendly names to permanent data.</p>
            </a>

            <a href="https://docs.ar.io/learn/wayfinder" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Search className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">Wayfinder</h3>
              <p className="text-sm text-link">Decentralized access to Arweave content through any gateway in the AR.IO network.</p>
            </a>

            <a href="https://docs.ar.io/build/upload/turbo-credits#credit-sharing" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Users className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">Turbo Credit Sharing</h3>
              <p className="text-sm text-link">Approve other wallets to use your Credits with guardrails.</p>
            </a>

            <a href="https://docs.ar.io/learn/what-is-ario" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Globe2 className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">AR.IO Network</h3>
              <p className="text-sm text-link">A permanent cloud network of services built on Arweave.</p>
            </a>

            <a href="https://docs.ar.io/learn/ans-104-bundles" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Package className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">ANS-104 Bundles</h3>
              <p className="text-sm text-link">Efficient data packaging standard that bundles multiple items into single transactions.</p>
            </a>
          </div>
        </div>

        {/* Source Code */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-turbo-purple/20 rounded-lg flex items-center justify-center">
              <Github className="w-4 h-4 text-turbo-purple" />
            </div>
            <h3 className="text-lg font-bold text-fg-muted">Source Code</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a href="https://github.com/ardriveapp/turbo-sdk" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <FileCode className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">Turbo SDK</h3>
              <p className="text-sm text-link">TypeScript SDK for uploads and payments.</p>
            </a>

            <a href="https://github.com/ardriveapp/turbo-upload-service" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Upload className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">Upload Services</h3>
              <p className="text-sm text-link">Bundler that packages ANS-104 data items.</p>
            </a>

            <a href="https://github.com/ardriveapp/turbo-payment-service" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Wallet className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">Payment Service</h3>
              <p className="text-sm text-link">Balances, top-ups, fiat/crypto rails.</p>
            </a>

            <a href="https://github.com/ar-io/ar-io-node" target="_blank" rel="noopener noreferrer"
               className="bg-canvas border border-default rounded-lg p-6 hover:border-turbo-purple/50 transition-colors">
              <Server className="w-6 h-6 text-turbo-purple mb-3" />
              <h3 className="font-bold mb-2 text-fg-muted">AR.IO Node</h3>
              <p className="text-sm text-link">Core gateway/node implementation.</p>
            </a>
          </div>
        </div>
      </section>

      {/* The Expanding Turbo Ecosystem Section */}
      <section className="bg-gradient-to-r from-turbo-red/10 to-turbo-blue/10 rounded-lg border border-default p-4 sm:p-8">
        <div className="text-center">
          <div className="text-xs text-link uppercase tracking-wider mb-2">TURBO ECOSYSTEM</div>
          <h2 className="text-3xl font-bold mb-4 text-fg-muted">The Expanding Turbo Ecosystem</h2>
          <p className="text-lg mb-8 max-w-3xl mx-auto text-link">
            From storage to indexing, prioritization, and real-time data feeds. Turbo is evolving into a complete programmable platform for the Permaweb.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-canvas/50 backdrop-blur rounded-lg p-6 border border-default/50">
            <div className="flex items-center gap-3 mb-3">
              <Database className="w-6 h-6 text-fg-muted" />
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-fg-muted">Data Indexer</h3>
                <span className="bg-fg-muted/20 text-fg-muted text-xs px-2 py-1 rounded-full font-medium">
                  Coming Soon
                </span>
              </div>
            </div>
            <p className="text-sm text-link">
              Register custom on-chain indexes of Arweave data using AR.IO gateways for structured data access.
            </p>
          </div>
          
          <div className="bg-canvas/50 backdrop-blur rounded-lg p-6 border border-default/50">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-6 h-6 text-fg-muted" />
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-fg-muted">Fast Lane</h3>
                <span className="bg-turbo-green/20 text-turbo-green text-xs px-2 py-1 rounded-full font-medium">
                  Live
                </span>
              </div>
            </div>
            <p className="text-sm text-link">
              Priority access and dedicated bandwidth with{' '}
              <a
                href="https://www.coinbase.com/developer-platform/products/x402"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg-muted hover:text-turbo-red transition-colors underline"
              >
                x402
              </a>
              {' '}— now available for USDC payments on Base network.
            </p>
          </div>
          
          <div className="bg-canvas/50 backdrop-blur rounded-lg p-6 border border-default/50">
            <div className="flex items-center gap-3 mb-3">
              <Rss className="w-6 h-6 text-fg-muted" />
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-fg-muted">Data Feeds</h3>
                <span className="bg-fg-muted/20 text-fg-muted text-xs px-2 py-1 rounded-full font-medium">
                  Coming Soon
                </span>
              </div>
            </div>
            <p className="text-sm text-link">
              Subscribe to real-time notifications for new data uploaded through Turbo services.
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-link/70">
            Learn more about upcoming features in our <button onClick={() => navigate('/developer')} className="text-fg-muted hover:underline font-medium">Developer Resources</button>
          </p>
        </div>
      </section>

      {/* ArDrive Section - For Non-Developers */}
      <section className="text-center bg-gradient-to-r from-surface/50 to-surface/30 rounded-lg border border-default p-4 sm:p-8">
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

      {/* Final CTA Section */}
      <section className="bg-gradient-to-r from-turbo-red/10 to-turbo-blue/10 rounded-lg border border-default p-8 sm:p-12 text-center">
        <h2 className="text-3xl font-bold mb-4 text-fg-muted">Ready to Build on Arweave?</h2>
        <p className="text-lg text-link max-w-2xl mx-auto mb-8">
          Talk to our team about custom integrations, enterprise solutions, or technical guidance.
          We'll help you choose the right architecture for permanent data storage at scale.
        </p>
        <a
          href="https://cal.com/kempsterrrr/ar-io-ecosystem-intro"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-turbo-red px-8 py-4 font-bold text-white hover:bg-turbo-red/90 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
        >
          <Phone className="w-5 h-5" />
          <span>Book a Demo</span>
        </a>
      </section>

    </div>
  );
};

export default LandingPage;