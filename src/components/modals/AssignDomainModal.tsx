import { useState, useEffect } from 'react';
import { Globe, X, Loader2, AlertCircle, RefreshCw, ChevronDown, Check, ExternalLink } from 'lucide-react';
import { Listbox } from '@headlessui/react';
import BaseModal from './BaseModal';
import { useOwnedArNSNames } from '../../hooks/useOwnedArNSNames';
import { useStore } from '../../store/useStore';

interface AssignDomainModalProps {
  onClose: () => void;
  manifestId: string;
  existingArnsName?: string;
  existingUndername?: string;
  onSuccess: (arnsName: string, undername?: string, transactionId?: string) => void;
}

export default function AssignDomainModal({ 
  onClose, 
  manifestId,
  existingArnsName,
  existingUndername,
  onSuccess 
}: AssignDomainModalProps) {
  const { walletType } = useStore();
  const { names, loading, loadingDetails, fetchOwnedNames, fetchNameDetails, updateArNSRecord } = useOwnedArNSNames();
  
  const [selectedArnsName, setSelectedArnsName] = useState(existingArnsName || '');
  const [selectedUndername, setSelectedUndername] = useState(existingUndername || '');
  const [undernameMode, setUndernameMode] = useState<'none' | 'new' | 'existing'>(
    existingUndername 
      ? (names.find(n => n.name === existingArnsName)?.undernames?.includes(existingUndername) ? 'existing' : 'new')
      : 'none'
  );
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string>();

  // Auto-fetch names when modal opens
  useEffect(() => {
    if (names.length === 0 && !loading) {
      fetchOwnedNames();
    }
  }, [names.length, loading, fetchOwnedNames]);

  // Auto-update undername mode based on selection
  useEffect(() => {
    if (undernameMode === 'none') {
      setSelectedUndername('');
    }
  }, [undernameMode]);

  const selectedNameRecord = names.find(name => name.name === selectedArnsName);
  const displayName = selectedNameRecord?.displayName || selectedArnsName;
  const isExistingUndername = selectedUndername && selectedNameRecord?.undernames?.includes(selectedUndername);
  const isNewUndername = selectedUndername && !isExistingUndername;

  const handleAssignDomain = async () => {
    if (!selectedArnsName) {
      setError('Please select an ArNS name');
      return;
    }

    setIsAssigning(true);
    setError(undefined);
    
    try {
      const result = await updateArNSRecord(
        selectedArnsName,
        manifestId,
        selectedUndername || undefined
      );
      
      if (result.success) {
        onSuccess(selectedArnsName, selectedUndername || undefined, result.transactionId);
      } else {
        setError(result.error || 'Domain assignment failed');
      }
    } catch (error) {
      console.error('Domain assignment error:', error);
      setError(error instanceof Error ? error.message : 'Domain assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <BaseModal onClose={onClose} showCloseButton={false}>
      <div className="w-[90vw] sm:w-[600px] max-w-[90vw] h-[85vh] sm:h-[600px] max-h-[90vh] flex flex-col text-fg-muted mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-default/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-turbo-yellow/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-turbo-yellow" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-fg-muted">
                {existingArnsName ? "Change Domain" : "Assign Domain"}
              </h3>
              <p className="text-sm text-link">
                {existingArnsName ? "Update the domain assignment for this deployment" : "Connect your deployment to an ArNS domain"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Deployment Context */}
          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-link mb-2">Deployment to assign:</div>
            <div className="font-mono text-sm text-fg-muted break-all">
              {manifestId}
            </div>
          </div>

          {/* Streamlined ArNS Selection - No checkbox needed */}
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
                {/* ArNS Name Selection */}
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
                    value={selectedArnsName} 
                    onChange={async (name) => {
                      setSelectedArnsName(name);
                      // Clear undername when switching names
                      setSelectedUndername('');
                      setUndernameMode('none');
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
                          {selectedArnsName ? (
                            names.find(n => n.name === selectedArnsName)?.displayName !== selectedArnsName
                              ? `${names.find(n => n.name === selectedArnsName)?.displayName} (${selectedArnsName})`
                              : selectedArnsName
                          ) : (
                            <span className="text-link">Choose a name...</span>
                          )}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          {loadingDetails[selectedArnsName] ? (
                            <Loader2 className="h-4 w-4 text-link animate-spin" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-link" aria-hidden="true" />
                          )}
                        </span>
                      </Listbox.Button>
                      <Listbox.Options className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-lg bg-surface border border-default shadow-lg focus:outline-none">
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

                {/* Compact Undername Selection - Only show after ArNS name is selected */}
                {selectedArnsName && (
                  <div>
                  <label className="block text-sm font-medium text-fg-muted mb-2">
                    Undername:
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={() => setUndernameMode('none')}
                      disabled={!selectedArnsName}
                      className={`py-2 px-3 rounded-lg text-sm transition-colors border ${
                        undernameMode === 'none'
                          ? 'border-turbo-yellow bg-turbo-yellow/10 text-turbo-yellow'
                          : 'border-default text-link hover:bg-surface disabled:opacity-50'
                      }`}
                    >
                      None
                    </button>
                    <button
                      onClick={() => setUndernameMode('new')}
                      disabled={!selectedArnsName}
                      className={`py-2 px-3 rounded-lg text-sm transition-colors border ${
                        undernameMode === 'new'
                          ? 'border-turbo-yellow bg-turbo-yellow/10 text-turbo-yellow'
                          : 'border-default text-link hover:bg-surface disabled:opacity-50'
                      }`}
                    >
                      New
                    </button>
                    <button
                      onClick={() => setUndernameMode('existing')}
                      disabled={!selectedArnsName || !selectedNameRecord?.undernames?.length}
                      className={`py-2 px-3 rounded-lg text-sm transition-colors border ${
                        undernameMode === 'existing'
                          ? 'border-turbo-yellow bg-turbo-yellow/10 text-turbo-yellow'
                          : 'border-default text-link hover:bg-surface disabled:opacity-50'
                      }`}
                    >
                      Existing
                    </button>
                  </div>

                  {/* Conditional Content Based on Mode */}
                  {undernameMode === 'existing' && selectedNameRecord?.undernames && (
                    <div className="space-y-2">
                      <div className="text-xs text-link mb-2">Select existing undername:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedNameRecord.undernames.map(undername => (
                          <button
                            key={undername}
                            onClick={() => setSelectedUndername(undername)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                              selectedUndername === undername
                                ? 'bg-turbo-yellow text-black border-turbo-yellow'
                                : 'bg-surface border-default text-fg-muted hover:border-turbo-yellow/50'
                            }`}
                          >
                            {undername}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {undernameMode === 'new' && (
                    <div>
                      <input
                        type="text"
                        value={selectedUndername || ''}
                        onChange={(e) => setSelectedUndername(e.target.value)}
                        placeholder="blog, docs, app..."
                        className="w-full px-3 py-2 bg-surface border border-default rounded-lg text-fg-muted focus:ring-2 focus:ring-turbo-yellow text-sm"
                      />
                    </div>
                  )}
                  </div>
                )}

                {/* Preview */}
                {selectedArnsName && (
                  <div className="bg-surface/50 rounded-lg p-4">
                    <div className="text-sm font-medium text-fg-muted mb-2">Preview:</div>
                    <div className="flex items-center gap-2 mb-2">
                      <a 
                        href={`https://${selectedUndername ? selectedUndername + '_' : ''}${selectedArnsName}.ar.io`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-turbo-yellow hover:underline flex items-center gap-1"
                      >
                        {selectedUndername ? selectedUndername + '_' : ''}{displayName}.ar.io
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {/* Status indicators */}
                    {isNewUndername && (
                      <div className="text-xs text-turbo-green">
                        New undername - will be created
                      </div>
                    )}
                    {isExistingUndername && (
                      <div className="text-xs text-link">
                        Existing undername - will be updated
                      </div>
                    )}
                    {!selectedUndername && selectedNameRecord?.currentTarget && (
                      <div className="text-xs text-link">
                        Currently points to: {selectedNameRecord.currentTarget.substring(0, 6)}...
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="text-red-400 text-sm">{error}</div>
            </div>
          )}

          {/* Wallet Compatibility Warning */}
          {walletType === 'solana' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="text-amber-500 text-sm">
                  Solana wallets cannot update ArNS records. Please switch to an Arweave or Ethereum wallet.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Actions Footer */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 sm:p-6 border-t border-default/30">
          <button
            onClick={onClose}
            disabled={isAssigning}
            className="text-sm text-link hover:text-fg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleAssignDomain}
            disabled={!selectedArnsName || isAssigning || walletType === 'solana'}
            className="px-6 py-3 rounded-lg bg-turbo-yellow text-black font-bold hover:bg-turbo-yellow/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isAssigning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Assigning Domain...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                {existingArnsName ? "Update Domain" : "Assign Domain"}
              </>
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}