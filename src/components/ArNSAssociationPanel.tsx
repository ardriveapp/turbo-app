import React, { useState, useEffect } from 'react';
import { Globe, ExternalLink, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useOwnedArNSNames } from '../hooks/useOwnedArNSNames';

interface ArNSAssociationPanelProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedName: string;
  onNameChange: (name: string) => void;
  selectedUndername?: string;
  onUndernameChange: (undername: string) => void;
}

export default function ArNSAssociationPanel({
  enabled,
  onEnabledChange,
  selectedName,
  onNameChange,
  selectedUndername,
  onUndernameChange
}: ArNSAssociationPanelProps) {
  const { names, loading, fetchOwnedNames } = useOwnedArNSNames();
  const [showUndername, setShowUndername] = useState(false);

  const selectedNameRecord = names.find(name => name.name === selectedName);
  const currentTarget = selectedNameRecord?.currentTarget;
  const displayName = selectedNameRecord?.displayName || selectedName;
  const fullDomainName = `${selectedUndername ? selectedUndername + '_' : ''}${displayName}`;
  const previewUrl = `https://${selectedUndername ? selectedUndername + '_' : ''}${selectedName}.ar.io`; // URL uses raw name for correct links
  
  // Debug logging
  console.log('ArNS Debug:', { 
    selectedName, 
    selectedNameRecord, 
    displayName, 
    fullDomainName,
    names: names.map(n => ({ name: n.name, displayName: n.displayName }))
  });

  useEffect(() => {
    if (enabled && names.length === 0 && !loading) {
      fetchOwnedNames();
    }
  }, [enabled, names.length, loading, fetchOwnedNames]);

  // Auto-enable undername if selectedUndername exists
  useEffect(() => {
    if (selectedUndername) {
      setShowUndername(true);
    }
  }, [selectedUndername]);

  // Clear undername when ArNS name changes
  useEffect(() => {
    if (selectedName) {
      // Reset undername selection when switching names
      onUndernameChange('');
      setShowUndername(false);
    }
  }, [selectedName, onUndernameChange]);

  return (
    <div className="bg-gradient-to-br from-turbo-yellow/10 to-turbo-yellow/5 rounded-xl border border-turbo-yellow/20 p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-turbo-yellow/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Globe className="w-5 h-5 text-turbo-yellow" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              id="arns-enabled"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="w-4 h-4 text-turbo-red bg-surface border-default rounded focus:ring-turbo-red"
            />
            <label htmlFor="arns-enabled" className="font-medium text-fg-muted cursor-pointer">
              Associate with ArNS name
            </label>
          </div>
          <p className="text-sm text-link">
            Give your site a friendly, decentralized domain name
          </p>
        </div>
      </div>

      {enabled && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-link">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your ArNS names...
            </div>
          ) : names.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-fg-muted mb-1">
                    No ArNS names found
                  </div>
                  <div className="text-sm text-link mb-3">
                    You need to own an ArNS name first. You can purchase names from the AR.IO network.
                  </div>
                  <button
                    onClick={() => window.open('https://ar.io/', '_blank')}
                    className="px-3 py-1.5 bg-turbo-yellow text-white rounded text-xs hover:bg-turbo-yellow/90 transition-colors"
                  >
                    Learn More About ArNS
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Name Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-fg-muted">
                    Select ArNS name:
                  </label>
                  <button
                    onClick={() => fetchOwnedNames(true)}
                    disabled={loading}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-turbo-yellow hover:text-turbo-yellow/80 transition-colors disabled:opacity-50"
                    title="Refresh ArNS names"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <select
                  value={selectedName}
                  onChange={(e) => onNameChange(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-surface border border-default rounded-lg text-fg-muted focus:ring-2 focus:ring-turbo-yellow disabled:opacity-50"
                >
                  <option value="">Choose a name...</option>
                  {names.map(name => (
                    <option key={name.name} value={name.name}>
                      {name.displayName !== name.name ? `${name.displayName} (${name.name})` : name.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Undername Option */}
              <div>
                <label className={`flex items-center gap-2 ${selectedName ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={showUndername}
                    disabled={!selectedName}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setShowUndername(checked);
                      // Clear undername when unchecking
                      if (!checked) {
                        onUndernameChange('');
                      }
                    }}
                    className="w-4 h-4 text-turbo-yellow bg-surface border-default rounded focus:ring-turbo-yellow disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-fg-muted">Use undername (subdomain)</span>
                </label>
                
                {showUndername && (
                  <div className="mt-3 space-y-3">
                    {/* Show existing undernames if any */}
                    {selectedNameRecord?.undernames && selectedNameRecord.undernames.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-fg-muted mb-2">Existing undernames:</div>
                        <div className="bg-surface/50 rounded-lg p-3 border border-default/30">
                          <div className="flex flex-wrap gap-2">
                            {selectedNameRecord.undernames.map(undername => (
                              <button
                                key={undername}
                                onClick={() => onUndernameChange(undername)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                                  selectedUndername === undername
                                    ? 'bg-turbo-yellow text-white border-turbo-yellow'
                                    : 'bg-surface border-default text-fg-muted hover:border-turbo-yellow/50 hover:text-turbo-yellow'
                                }`}
                              >
                                {undername}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-link mt-2">
                            Click to select an existing undername, or enter a new one below
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Create new undername */}
                    <div>
                      <label className="block text-sm font-medium text-fg-muted mb-2">
                        {selectedNameRecord?.undernames && selectedNameRecord.undernames.length > 0 
                          ? 'Or create new undername:' 
                          : 'Enter undername:'}
                      </label>
                      
                      {/* Info for first-time users */}
                      {(!selectedNameRecord?.undernames || selectedNameRecord.undernames.length === 0) && (
                        <div className="text-xs text-link mb-2 bg-turbo-yellow/5 rounded p-2 border border-turbo-yellow/20">
                          This will be the first undername for {selectedName}
                        </div>
                      )}
                      <input
                        type="text"
                        value={selectedUndername || ''}
                        onChange={(e) => onUndernameChange(e.target.value)}
                        placeholder="blog, docs, app..."
                        className="w-full px-3 py-2 bg-surface border border-default rounded-lg text-fg-muted focus:ring-2 focus:ring-turbo-yellow text-sm"
                      />
                      {selectedUndername && (
                        <p className="text-xs text-link mt-1">
                          Will {selectedNameRecord?.undernames?.includes(selectedUndername) ? 'update' : 'create'}: {selectedUndername}_{selectedName}.ar.io
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              {selectedName && (
                <div className="bg-surface/50 rounded-lg p-4 space-y-3">
                  <div>
                    <div className="text-sm font-medium text-fg-muted mb-2">Preview:</div>
                    <div className="flex items-center gap-2 mb-2">
                      <a 
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-turbo-yellow hover:underline flex items-center gap-1"
                      >
                        {fullDomainName}.ar.io
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {currentTarget && (
                      <div className="text-xs text-link">
                        Currently points to: {currentTarget.substring(0, 8)}...{currentTarget.substring(currentTarget.length - 6)}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}