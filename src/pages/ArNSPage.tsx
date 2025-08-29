import { useState } from 'react';
import { Globe, Search, Shield, Clock } from 'lucide-react';

export function ArNSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [duration, setDuration] = useState(1); // years
  
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

      {/* Registration Form */}
      {searchQuery && (
        <div className="card mb-8">
          <h3 className="text-lg font-semibold mb-4">Register "{searchQuery}"</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Registration Period
              </label>
              <select 
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="input"
              >
                <option value={1}>1 Year</option>
                <option value={2}>2 Years</option>
                <option value={5}>5 Years</option>
                <option value={10}>10 Years</option>
              </select>
            </div>

            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="flex justify-between mb-2">
                <span className="text-muted">Base Price</span>
                <span className="font-mono">10 Credits/year</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted">Duration</span>
                <span className="font-mono">{duration} year{duration > 1 && 's'}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono">{10 * duration} Credits</span>
              </div>
            </div>

            <button className="btn-primary w-full">
              Register Name
            </button>
          </div>
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