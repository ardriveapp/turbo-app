import { useState } from 'react';
import { Globe, Search, Shield } from 'lucide-react';

export function ArNSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">ArNS Names</h1>
        <p className="text-muted text-lg">
          Register permanent names for your Arweave applications
        </p>
      </div>

      {/* Search */}
      <div className="card mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
              className="input pl-10"
              placeholder="Search for a name..."
            />
          </div>
          <button className="btn-primary">
            Check Availability
          </button>
        </div>
      </div>

      {/* Available Domain Link */}
      {searchQuery && (
        <div className="card mb-8 text-center">
          <h3 className="text-lg font-semibold mb-4">"{searchQuery}" availability</h3>
          <p className="text-muted mb-4">
            Check availability and register this name on the ArNS registry
          </p>
          <a
            href={`https://arns.ar.io/#/register/${searchQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            Register on ArNS App
            <Globe className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
          <h4 className="font-semibold mb-1">Permanent Ownership</h4>
          <p className="text-sm text-muted">
            Your name is permanently stored on Arweave
          </p>
        </div>
        
        <div className="card text-center">
          <Globe className="w-8 h-8 text-primary mx-auto mb-3" />
          <h4 className="font-semibold mb-1">Global Resolution</h4>
          <p className="text-sm text-muted">
            Accessible through any AR.IO gateway
          </p>
        </div>
        
        <div className="card text-center">
          <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
          <h4 className="font-semibold mb-1">Instant Updates</h4>
          <p className="text-sm text-muted">
            Changes propagate immediately across the network
          </p>
        </div>
      </div>
    </div>
  );
}

// Add missing import
import { Zap } from 'lucide-react';