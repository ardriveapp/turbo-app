import React, { useState, useEffect } from 'react';
import { Globe, ExternalLink, AlertCircle, Loader2, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { Listbox } from '@headlessui/react';
import { useOwnedArNSNames } from '../hooks/useOwnedArNSNames';
import { sanitizeUndername, hasInvalidCharacters } from '../utils/undernames';

interface ArNSAssociationPanelProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedName: string;
  onNameChange: (name: string) => void;
  selectedUndername?: string;
  onUndernameChange: (undername: string) => void;
  showUndername?: boolean;
  onShowUndernameChange?: (show: boolean) => void;
}

export default function ArNSAssociationPanel({
  enabled,
  onEnabledChange,
  selectedName,
  onNameChange,
  selectedUndername,
  onUndernameChange,
  showUndername: externalShowUndername,
  onShowUndernameChange
}: ArNSAssociationPanelProps) {
  const { names, loading, loadingDetails, fetchOwnedNames, fetchNameDetails } = useOwnedArNSNames();
  const [internalShowUndername, setInternalShowUndername] = useState(false);

  // Use external state if provided, otherwise use internal state
  const showUndername = externalShowUndername !== undefined ? externalShowUndername : internalShowUndername;
  const setShowUndername = (value: boolean) => {
    if (onShowUndernameChange) {
      onShowUndernameChange(value);
    } else {
      setInternalShowUndername(value);
    }
  };

  const selectedNameRecord = names.find(name => name.name === selectedName);
  const currentTarget = selectedNameRecord?.currentTarget;
  const displayName = selectedNameRecord?.displayName || selectedName;
  const fullDomainName = `${selectedUndername ? selectedUndername + '_' : ''}${displayName}`;
  const previewUrl = `https://${selectedUndername ? selectedUndername + '_' : ''}${selectedName}.ar.io`; // URL uses raw name for correct links
  
  // Check if this is an existing undername or a new one
  const isExistingUndername = selectedUndername && selectedNameRecord?.undernames?.includes(selectedUndername);
  const isNewUndername = selectedUndername && !isExistingUndername;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUndername]);

  // Clear undername when ArNS name changes
  useEffect(() => {
    if (selectedName) {
      // Reset undername selection when switching names
      onUndernameChange('');
      setShowUndername(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedName, onUndernameChange]);
  return (
    <div className="bg-gradient-to-br from-turbo-yellow/5 to-turbo-yellow/3 rounded-xl border border-turbo-yellow/20 p-6 mb-6">
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
              className="w-4 h-4 bg-surface border-2 border-default rounded focus:ring-0 checked:bg-canvas checked:border-default accent-white transition-colors"
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
                    You need to own an ArNS name first. You can purchase names from the AR.IO Network.
                  </div>
                  <button
                    onClick={() => window.open('https://ar.io/arns', '_blank')}
                    className="px-3 py-1.5 bg-turbo-yellow text-black rounded text-xs hover:bg-turbo-yellow/90 transition-colors"
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
                <Listbox 
                  value={selectedName} 
                  onChange={async (name) => {
                    onNameChange(name);
                    // Fetch ANT details on-demand when name is selected
                    if (name) {
                      await fetchNameDetails(name);
                    }
                  }}
                  disabled={loading}
                >
                  <div className="relative">
                    <Listbox.Button className="relative w-full px-3 py-2 bg-surface border border-default rounded-lg text-fg-muted focus:border-turbo-yellow focus:outline-none disabled:opacity-50 text-left cursor-pointer">
                      <span className="block truncate">
                        {selectedName ? (
                          names.find(n => n.name === selectedName)?.displayName !== selectedName
                            ? `${names.find(n => n.name === selectedName)?.displayName} (${selectedName})`
                            : selectedName
                        ) : (
                          <span className="text-link">Choose a name...</span>
                        )}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        {loadingDetails[selectedName] ? (
                          <Loader2 className="h-4 w-4 text-link animate-spin" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-link" aria-hidden="true" />
                        )}
                      </span>
                    </Listbox.Button>
                      <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-surface border border-default shadow-lg focus:outline-none">
                        <Listbox.Option
                          value=""
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                              active ? 'bg-canvas text-fg-muted' : 'text-link'
                            }`
                          }
                        >
                          <span className="block truncate">Choose a name...</span>
                        </Listbox.Option>
                        {names.map(name => (
                          <Listbox.Option
                            key={name.name}
                            value={name.name}
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                                active ? 'bg-canvas text-fg-muted' : 'text-fg-muted'
                              }`
                            }
                          >
                            {({ selected }) => (
                              <>
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                  {name.displayName !== name.name 
                                    ? `${name.displayName} (${name.name})` 
                                    : name.displayName}
                                </span>
                                {selected && (
                                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-turbo-yellow">
                                    <Check className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                )}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                  </div>
                </Listbox>
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
                    className="w-4 h-4 bg-surface border-2 border-default rounded focus:ring-0 checked:bg-canvas checked:border-default accent-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                    ? 'bg-turbo-yellow text-black border-turbo-yellow'
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
                        onChange={(e) => {
                          // Allow free typing - no sanitization on change
                          onUndernameChange(e.target.value);
                        }}
                        onBlur={(e) => {
                          // Sanitize when user leaves the field
                          const sanitized = sanitizeUndername(e.target.value);
                          if (sanitized !== e.target.value) {
                            onUndernameChange(sanitized);
                          }
                        }}
                        placeholder="my_blog, docs, app..."
                        className={`w-full px-3 py-2 bg-surface border rounded-lg text-fg-muted focus:ring-2 text-sm transition-colors ${
                          selectedUndername && hasInvalidCharacters(selectedUndername)
                            ? 'border-yellow-500 focus:ring-yellow-500'
                            : 'border-default focus:ring-turbo-yellow'
                        }`}
                      />
                      <p className="text-xs mt-1">
                        {selectedUndername ? (
                          hasInvalidCharacters(selectedUndername) ? (
                            <span className="text-yellow-500">
                              Will be sanitized to: {sanitizeUndername(selectedUndername)}_{selectedName}.ar.io
                            </span>
                          ) : (
                            <span className="text-link">
                              Will {selectedNameRecord?.undernames?.includes(selectedUndername) ? 'update existing' : 'create new'} undername: {selectedUndername}_{selectedName}.ar.io
                            </span>
                          )
                        ) : (
                          <span className="text-link">
                            Lowercase letters, numbers, hyphens, and underscores. Cannot start/end with - or _.
                          </span>
                        )}
                      </p>
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
                    {/* Only show current target for base name or when no undername is selected */}
                    {!selectedUndername && currentTarget && (
                      <div className="text-xs text-link">
                        Currently points to: {currentTarget.substring(0, 6)}...
                      </div>
                    )}
                    {/* Show status for new undernames */}
                    {isNewUndername && (
                      <div className="text-xs text-turbo-green">
                        New undername - will be created on deployment
                      </div>
                    )}
                    {/* Show status for existing undernames */}
                    {isExistingUndername && (
                      <div className="text-xs text-link">
                        Existing undername - will be updated
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