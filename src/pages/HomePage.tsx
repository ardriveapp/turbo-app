import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Zap, 
  Code2, 
  Upload, 
  CreditCard,
  Globe,
  Gift,
  BarChart3,
  Terminal
} from 'lucide-react';
import { useStore } from '@/store/useStore';

export function HomePage() {
  const { address } = useStore();
  
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-gradient">Turbo Gateway</span>
        </h1>
        <p className="text-xl text-muted max-w-2xl mx-auto">
          The fastest way to upload, download, and pay for Arweave storage. 
          Built for developers, powered by AR.IO.
        </p>
        
        {!address && (
          <div className="mt-8">
            <Link to="/top-up" className="btn-primary text-lg px-8 py-3">
              Get Started <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        )}
      </section>

      {/* Quick Stats */}
      {address && (
        <section className="grid md:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-muted mb-1">Upload Speed</div>
            <div className="text-2xl font-bold flex items-center gap-2">
              860 <span className="text-sm text-muted">tx/sec</span>
              <Zap className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-muted mb-1">Network Status</div>
            <div className="text-2xl font-bold flex items-center gap-2">
              Online
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-muted mb-1">Current Rate</div>
            <div className="text-2xl font-bold font-mono">
              $3.47 <span className="text-sm text-muted">/GiB</span>
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-muted mb-1">Total Uploads</div>
            <div className="text-2xl font-bold flex items-center gap-2">
              1.2M
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
          </div>
        </section>
      )}

      {/* Feature Cards */}
      <section className="grid md:grid-cols-3 gap-6">
        <Link to="/top-up" className="card hover:border-primary/50 transition-colors group">
          <CreditCard className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Top Up Credits</h3>
          <p className="text-muted mb-4">
            Add credits with fiat or crypto. Instant processing with multiple payment methods.
          </p>
          <div className="text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Top up now <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link to="/upload" className="card hover:border-primary/50 transition-colors group">
          <Upload className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload Files</h3>
          <p className="text-muted mb-4">
            Drag & drop uploads with instant confirmation. Files under 100KB are free.
          </p>
          <div className="text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Start uploading <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <div 
          onClick={() => setCurrentPage?.('domains')} 
          className="card hover:border-primary/50 transition-colors group cursor-pointer"
        >
          <Globe className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Search Domains</h3>
          <p className="text-muted mb-4">
            Search available ArNS domain names and check registration costs. No login required.
          </p>
          <div className="text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Search domains <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <Link to="/gift" className="card hover:border-primary/50 transition-colors group">
          <Gift className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Gift Credits</h3>
          <p className="text-muted mb-4">
            Send Turbo Credits as gifts via email. Perfect for onboarding new users.
          </p>
          <div className="text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Send gift <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link to="/share" className="card hover:border-primary/50 transition-colors group">
          <Users className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Share Credits</h3>
          <p className="text-muted mb-4">
            Transfer credits between wallets with granular permissions and limits.
          </p>
          <div className="text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Share now <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link to="/developer" className="card hover:border-primary/50 transition-colors group">
          <Code2 className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Developer Tools</h3>
          <p className="text-muted mb-4">
            SDKs, APIs, and documentation to integrate Turbo into your applications.
          </p>
          <div className="text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            View docs <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </section>

      {/* Quick Start for Developers */}
      <section className="card bg-gradient-to-r from-card to-card/50">
        <div className="flex items-start gap-4">
          <Terminal className="w-8 h-8 text-primary mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Quick Start for Developers</h3>
            <div className="code-block">
              <div className="text-muted text-xs mb-2"># Install the SDK</div>
              <div className="font-mono">npm install @ardrive/turbo-sdk</div>
            </div>
            <div className="mt-4 flex gap-4">
              <Link to="/developer" className="text-primary hover:underline">
                View documentation →
              </Link>
              <a 
                href="https://github.com/ardriveapp/turbo-sdk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub →
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Add missing import
import { Users } from 'lucide-react';