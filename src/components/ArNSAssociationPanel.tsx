import React, { useState, useEffect, useMemo } from 'react';
import { Globe, ExternalLink, AlertCircle, Loader2, RefreshCw, ChevronDown, Check, ChevronRight } from 'lucide-react';
import { Combobox } from '@headlessui/react';
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
  customTTL?: number;
  onCustomTTLChange?: (ttl: number | undefined) => void;
}

export default function ArNSAssociationPanel({
  enabled,
  onEnabledChange,
  selectedName,
  onNameChange,
  selectedUndername,
  onUndernameChange,
  showUndername: externalShowUndername,
  onShowUndernameChange,
  customTTL: _customTTL, // eslint-disable-line @typescript-eslint/no-unused-vars
  onCustomTTLChange
}: ArNSAssociationPanelProps) {
  const { names, loading, loadingDetails, fetchOwnedNames, fetchNameDetails } = useOwnedArNSNames();
  const [internalShowUndername, setInternalShowUndername] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ttlMode, setTTLMode] = useState<'existing' | 'custom'>('existing');
  const [customTTLInput, setCustomTTLInput] = useState<string>('600');
  const [nameQuery, setNameQuery] = useState('');

  // Filter names based on search query
  const filteredNames = useMemo(() => {
    if (!nameQuery) return names;
    const query = nameQuery.toLowerCase();
    return names.filter(name =>
      name.name.toLowerCase().includes(query) ||
      name.displayName.toLowerCase().includes(query)
    );
  }, [names, nameQuery]);

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

  // Get current TTL (either for undername or base name)
  const currentTTL = selectedUndername && selectedNameRecord?.undernameTTLs?.[selectedUndername]
    ? selectedNameRecord.undernameTTLs[selectedUndername]
    : selectedNameRecord?.ttl || 600;

  // Format TTL for display
  const formatTTL = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

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

  // Handle TTL mode changes
  useEffect(() => {
    if (onCustomTTLChange) {
      if (ttlMode === 'existing') {
        onCustomTTLChange(undefined); // Use existing TTL
      } else {
        const ttlValue = parseInt(customTTLInput);
        if (!isNaN(ttlValue) && ttlValue > 0) {
          onCustomTTLChange(ttlValue);
        }
      }
    }
  }, [ttlMode, customTTLInput, onCustomTTLChange]);

  // Update customTTLInput when current TTL changes (e.g., when switching names/undernames)
  useEffect(() => {
    if (currentTTL) {
      setCustomTTLInput(currentTTL.toString());
    }
  }, [currentTTL]);
  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/30 p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              id="arns-enabled"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="w-4 h-4 bg-card border-2 border-border/20 rounded focus:ring-0 checked:bg-card checked:border-border/20 accent-white transition-colors"
            />
            <label htmlFor="arns-enabled" className="font-medium text-foreground cursor-pointer">
              Add domain name
            </label>
          </div>
          <p className="text-sm text-foreground/80">
            Give your site a friendly, smart domain name
          </p>
        </div>
      </div>

      {enabled && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your ArNS names...
            </div>
          ) : names.length === 0 ? (
            <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground mb-1">
                    No ArNS names found
                  </div>
                  <div className="text-sm text-foreground/80 mb-3">
                    You need to own an ArNS name first. You can purchase names from the AR.IO Network.
                  </div>
                  <button
                    onClick={() => window.open('https://ar.io/arns', '_blank')}
                    className="px-3 py-1.5 bg-primary text-white rounded-full text-xs hover:bg-primary/90 transition-colors"
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
                  <label className="text-sm font-medium text-foreground">
                    Select name:
                  </label>
                  <button
                    onClick={() => fetchOwnedNames(true)}
                    disabled={loading}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-foreground hover:text-foreground/80 transition-colors disabled:opacity-50"
                    title="Refresh ArNS names"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <Combobox
                  value={selectedName}
                  onChange={async (name: string) => {
                    onNameChange(name);
                    setNameQuery('');
                    // Fetch ANT details on-demand when name is selected
                    if (name) {
                      await fetchNameDetails(name);
                    }
                  }}
                  disabled={loading}
                >
                  <div className="relative">
                    <div className="relative w-full">
                      <Combobox.Input
                        className="w-full px-3 py-2 bg-card border border-border/20 rounded-2xl text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 pr-10"
                        displayValue={(name: string) => {
                          if (!name) return '';
                          const found = names.find(n => n.name === name);
                          return found?.displayName !== found?.name
                            ? `${found?.displayName} (${name})`
                            : name;
                        }}
                        onChange={(e) => setNameQuery(e.target.value)}
                        placeholder="Type to search or click to browse..."
                      />
                      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        {loadingDetails[selectedName] ? (
                          <Loader2 className="h-4 w-4 text-foreground/80 animate-spin" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-foreground/80" aria-hidden="true" />
                        )}
                      </Combobox.Button>
                    </div>
                    <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-2xl bg-card border border-border/20 shadow-lg focus:outline-none">
                      {filteredNames.length === 0 && nameQuery !== '' ? (
                        <div className="relative cursor-default select-none py-3 px-4 text-foreground/80">
                          No names found matching "{nameQuery}"
                        </div>
                      ) : (
                        <>
                          {!nameQuery && (
                            <Combobox.Option
                              value=""
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                                  active ? 'bg-card text-foreground' : 'text-foreground/80'
                                }`
                              }
                            >
                              <span className="block truncate">Choose a name...</span>
                            </Combobox.Option>
                          )}
                          {filteredNames.map(name => (
                            <Combobox.Option
                              key={name.name}
                              value={name.name}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                                  active ? 'bg-card text-foreground' : 'text-foreground'
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
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary">
                                      <Check className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                  )}
                                </>
                              )}
                            </Combobox.Option>
                          ))}
                        </>
                      )}
                    </Combobox.Options>
                  </div>
                </Combobox>
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
                    className="w-4 h-4 bg-card border-2 border-border/20 rounded focus:ring-0 checked:bg-card checked:border-border/20 accent-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  />
                  <span className="text-sm text-foreground">Use undername (subdomain)</span>
                </label>

                {showUndername && (
                  <div className="mt-3 space-y-3">
                    {/* Show existing undernames if any */}
                    {selectedNameRecord?.undernames && selectedNameRecord.undernames.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-foreground mb-2">Existing undernames:</div>
                        <div className="bg-card rounded-2xl p-3 border border-primary/20">
                          <div className="flex flex-wrap gap-2">
                            {selectedNameRecord.undernames.map(undername => (
                              <button
                                key={undername}
                                onClick={() => onUndernameChange(undername)}
                                className={`px-3 py-1.5 rounded-2xl text-sm transition-colors border ${
                                  selectedUndername === undername
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-card border-border/20 text-foreground hover:border-primary/50 hover:text-foreground'
                                }`}
                              >
                                {undername}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-foreground/80 mt-2">
                            Click to select an existing undername, or enter a new one below
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Create new undername */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {selectedNameRecord?.undernames && selectedNameRecord.undernames.length > 0
                          ? 'Or create new undername:'
                          : 'Enter undername:'}
                      </label>

                      {/* Info for first-time users */}
                      {(!selectedNameRecord?.undernames || selectedNameRecord.undernames.length === 0) && (
                        <div className="text-xs text-foreground/80 mb-2 bg-primary/10 rounded p-2 border border-primary/30">
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
                        className={`w-full px-3 py-2 bg-card border rounded-2xl text-foreground focus:ring-2 text-sm transition-colors ${
                          selectedUndername && hasInvalidCharacters(selectedUndername)
                            ? 'border-warning focus:ring-warning'
                            : 'border-border/20 focus:ring-primary'
                        }`}
                      />
                      <p className="text-xs mt-1">
                        {selectedUndername ? (
                          hasInvalidCharacters(selectedUndername) ? (
                            <span className="text-warning">
                              Will be sanitized to: {sanitizeUndername(selectedUndername)}_{selectedName}.ar.io
                            </span>
                          ) : (
                            <span className="text-foreground/80">
                              Will {selectedNameRecord?.undernames?.includes(selectedUndername) ? 'update existing' : 'create new'} undername: {selectedUndername}_{selectedName}.ar.io
                            </span>
                          )
                        ) : (
                          <span className="text-foreground/80">
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
                <div className="bg-card rounded-2xl p-4 space-y-3 border border-primary/20">
                  <div>
                    <div className="text-sm font-medium text-foreground mb-2">Preview:</div>
                    <div className="flex items-center gap-2 mb-2">
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-foreground hover:underline flex items-center gap-1"
                      >
                        {fullDomainName}.ar.io
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {/* Only show current target for base name or when no undername is selected */}
                    {!selectedUndername && currentTarget && (
                      <div className="text-xs text-foreground/80">
                        Currently points to: {currentTarget.substring(0, 6)}...
                      </div>
                    )}
                    {/* Show status for new undernames */}
                    {isNewUndername && (
                      <div className="text-xs text-success">
                        New undername - will be created on deployment
                      </div>
                    )}
                    {/* Show status for existing undernames */}
                    {isExistingUndername && (
                      <div className="text-xs text-foreground/80">
                        Existing undername - will be updated
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Advanced Settings */}
              {selectedName && (
                <div className="border-t border-primary/20 pt-4">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors w-full"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                    Advanced Settings
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 space-y-4 bg-card rounded-2xl p-4 border border-primary/20">
                      <div>
                        <div className="text-sm font-medium text-foreground mb-3">
                          TTL (Time to Live)
                        </div>

                        {/* TTL Mode Selection */}
                        <div className="space-y-3">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="ttl-mode"
                              checked={ttlMode === 'existing'}
                              onChange={() => setTTLMode('existing')}
                              className="mt-0.5 w-4 h-4 bg-card border-2 border-border/20 rounded-full checked:bg-card checked:border-primary transition-colors"
                            />
                            <div className="flex-1">
                              <div className="text-sm text-foreground group-hover:text-foreground/80 transition-colors">
                                Keep existing TTL
                              </div>
                              <div className="text-xs text-foreground/80 mt-0.5">
                                Preserve current setting ({formatTTL(currentTTL)} / {currentTTL} seconds)
                              </div>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="ttl-mode"
                              checked={ttlMode === 'custom'}
                              onChange={() => setTTLMode('custom')}
                              className="mt-0.5 w-4 h-4 bg-card border-2 border-border/20 rounded-full checked:bg-card checked:border-primary transition-colors"
                            />
                            <div className="flex-1">
                              <div className="text-sm text-foreground group-hover:text-foreground/80 transition-colors">
                                Set custom TTL
                              </div>
                              {ttlMode === 'custom' && (
                                <div className="mt-3 space-y-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      min="60"
                                      max="86400"
                                      value={customTTLInput}
                                      onChange={(e) => setCustomTTLInput(e.target.value)}
                                      className="flex-1 px-3 py-2 bg-card border border-border/20 rounded-2xl text-foreground text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                      placeholder="600"
                                    />
                                    <span className="px-3 py-2 bg-card/50 border border-border/20 rounded-2xl text-foreground/80 text-sm flex items-center">
                                      seconds
                                    </span>
                                  </div>

                                  {/* Quick Select Buttons */}
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setCustomTTLInput('300')}
                                      className="px-3 py-1.5 bg-card border border-border/20 rounded text-xs text-foreground/80 hover:border-primary hover:text-foreground transition-colors"
                                    >
                                      5 min
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCustomTTLInput('600')}
                                      className="px-3 py-1.5 bg-card border border-border/20 rounded text-xs text-foreground/80 hover:border-primary hover:text-foreground transition-colors"
                                    >
                                      10 min
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCustomTTLInput('900')}
                                      className="px-3 py-1.5 bg-card border border-border/20 rounded text-xs text-foreground/80 hover:border-primary hover:text-foreground transition-colors"
                                    >
                                      15 min
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCustomTTLInput('3600')}
                                      className="px-3 py-1.5 bg-card border border-border/20 rounded text-xs text-foreground/80 hover:border-primary hover:text-foreground transition-colors"
                                    >
                                      1 hour
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>

                        {/* Help Text */}
                        <div className="mt-3 text-xs text-foreground/80 bg-primary/10 rounded p-3 border border-primary/30">
                          <div className="font-medium text-foreground mb-1">What is TTL?</div>
                          TTL controls how long AR.IO gateways cache your content before checking for updates. Lower values (5-10 min) are better for frequently updated content, while higher values (1 hour+) work well for static sites and reduce network requests.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
