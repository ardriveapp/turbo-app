import { useState } from 'react';
import { useGatewayInfo } from '../../hooks/useGatewayInfo';
import {
  Server,
  Globe,
  TrendingUp,
  Coins,
  Upload,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Wallet,
  Settings,
  Wrench,
  Edit3,
  Info,
  ChevronDown,
  Users
} from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import CopyButton from '../CopyButton';
import { formatWalletAddress } from '../../utils';
import { useStore } from '../../store/useStore';

export default function GatewayInfoPanel() {
  const { uploadServiceInfo, gatewayInfo, arIOGatewayInfo, pricingInfo, arweaveNodeInfo, peersInfo, loading, error, refreshing, refresh } = useGatewayInfo();
  const {
    configMode,
    setConfigMode,
    updateCustomConfig,
    updateTokenMap,
    getCurrentConfig,
    resetToDefaults,
    x402OnlyMode,
    setX402OnlyMode
  } = useStore();

  const currentConfig = getCurrentConfig();
  const [configExpanded, setConfigExpanded] = useState(false);

  const handleModeChange = (mode: 'production' | 'development' | 'custom') => {
    setConfigMode(mode);
    // Reset x402-only mode when switching to production
    if (mode === 'production') {
      setX402OnlyMode(false);
    }
  };

  const applyConfiguration = () => {
    // Force a page reload to ensure all components reinitialize with new config
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-foreground/80">Loading service information...</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold font-heading text-foreground mb-1">Settings</h3>
          <p className="text-sm text-foreground/80">
            Configure settings and view live service status
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-border/20 text-foreground/80 hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={refreshing ? 'Refreshing...' : 'Refresh service data'}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-2xl p-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Endpoint Configuration Section */}
      <div className="bg-card rounded-2xl border border-border/20 mb-4 sm:mb-6">
        <button
          onClick={() => setConfigExpanded(!configExpanded)}
          className="w-full flex items-center justify-between p-4 sm:p-6 text-left"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-primary" />
            <div>
              <h4 className="text-lg font-bold font-heading text-foreground">Endpoint Configuration</h4>
              <p className="text-sm text-foreground/80">
                {configMode === 'production' ? 'Production' : configMode === 'development' ? 'Development' : 'Custom'} environment
                {x402OnlyMode && ' • X402-Only mode enabled'}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-foreground/80 transition-transform ${configExpanded ? 'rotate-180' : ''}`} />
        </button>

        {configExpanded && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-border/20 pt-4">
            {/* Mode Selection */}
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="inline-flex bg-background rounded-2xl p-1 border border-border/20">
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    configMode === 'production'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground/80 hover:text-foreground'
                  }`}
                  onClick={() => handleModeChange('production')}
                >
                  <Globe className="w-4 h-4 inline mr-2" />
                  Production
                </button>
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    configMode === 'development'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground/80 hover:text-foreground'
                  }`}
                  onClick={() => handleModeChange('development')}
                >
                  <Wrench className="w-4 h-4 inline mr-2" />
                  Development
                </button>
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    configMode === 'custom'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground/80 hover:text-foreground'
                  }`}
                  onClick={() => handleModeChange('custom')}
                >
                  <Edit3 className="w-4 h-4 inline mr-2" />
                  Custom
                </button>
              </div>
            </div>

            {/* Service URLs */}
            <div className="space-y-4 mb-4 sm:mb-6">
              {/* Payment Service URL */}
              <div className={x402OnlyMode ? 'opacity-40' : ''}>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Payment Service URL
                  {x402OnlyMode && (
                    <span className="ml-2 text-xs text-foreground/60">(disabled in x402-only mode)</span>
                  )}
                </label>
                {configMode === 'custom' ? (
                  <input
                    type="text"
                    value={currentConfig.paymentServiceUrl}
                    onChange={(e) => updateCustomConfig('paymentServiceUrl', e.target.value)}
                    disabled={x402OnlyMode}
                    className="w-full px-3 py-2 bg-background border border-border/20 rounded-2xl text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-black rounded-2xl text-sm text-gray-100 font-mono">
                      {currentConfig.paymentServiceUrl}
                    </code>
                    <CopyButton textToCopy={currentConfig.paymentServiceUrl} />
                  </div>
                )}
              </div>

              {/* Upload Service URL with X402 Toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground/80">Upload Service URL</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground/80">X402-Only</span>
                    <button
                      onClick={() => setX402OnlyMode(!x402OnlyMode)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card ${
                        x402OnlyMode ? 'bg-primary' : 'bg-background border border-border/20'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-foreground transition-transform ${
                          x402OnlyMode ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <Popover className="relative">
                      <PopoverButton className="text-foreground/80 hover:text-foreground transition-colors focus:outline-none">
                        <Info className="w-4 h-4" />
                      </PopoverButton>
                      <PopoverPanel className="absolute right-0 z-10 mt-2 w-72 rounded-2xl bg-card border border-border/20 shadow-lg p-3">
                        <div className="text-xs">
                          <div className="font-medium text-foreground mb-1">X402-Only Mode</div>
                          <p className="text-foreground/80 leading-relaxed">
                            Enable for bundlers that only support x402 payments (BASE-USDC microtransactions).
                            Disables all payment service features: credits, fiat top-ups, gifts, and balance checking.
                            Only crypto payments via x402 will be available.
                          </p>
                        </div>
                      </PopoverPanel>
                    </Popover>
                  </div>
                </div>
                {configMode === 'custom' ? (
                  <input
                    type="text"
                    value={currentConfig.uploadServiceUrl}
                    onChange={(e) => updateCustomConfig('uploadServiceUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border/20 rounded-2xl text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-black rounded-2xl text-sm text-gray-100 font-mono">
                      {currentConfig.uploadServiceUrl}
                    </code>
                    <CopyButton textToCopy={currentConfig.uploadServiceUrl} />
                  </div>
                )}
              </div>

              {/* Capture Service URL */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">Capture Service URL</label>
                {configMode === 'custom' ? (
                  <input
                    type="text"
                    value={currentConfig.captureServiceUrl}
                    onChange={(e) => updateCustomConfig('captureServiceUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border/20 rounded-2xl text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-black rounded-2xl text-sm text-gray-100 font-mono">
                      {currentConfig.captureServiceUrl}
                    </code>
                    <CopyButton textToCopy={currentConfig.captureServiceUrl} />
                  </div>
                )}
              </div>

              {/* AR.IO Gateway URL */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">AR.IO Gateway URL</label>
                {configMode === 'custom' ? (
                  <input
                    type="text"
                    value={currentConfig.arioGatewayUrl}
                    onChange={(e) => updateCustomConfig('arioGatewayUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border/20 rounded-2xl text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-black rounded-2xl text-sm text-gray-100 font-mono">
                      {currentConfig.arioGatewayUrl}
                    </code>
                    <CopyButton textToCopy={currentConfig.arioGatewayUrl} />
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Settings (collapsible) */}
            <details className="mb-4 sm:mb-6">
              <summary className="cursor-pointer text-sm font-medium text-foreground/80 mb-3 hover:text-foreground">
                Advanced Settings
              </summary>
              <div className="space-y-4 p-4 bg-background/50 rounded-2xl">
                {/* Stripe Key */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">Stripe Publishable Key</label>
                  {configMode === 'custom' ? (
                    <input
                      type="text"
                      value={currentConfig.stripeKey}
                      onChange={(e) => updateCustomConfig('stripeKey', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border/20 rounded-2xl text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-black rounded-2xl text-sm text-gray-100 font-mono">
                        {currentConfig.stripeKey.substring(0, 20)}...{currentConfig.stripeKey.substring(currentConfig.stripeKey.length - 4)}
                      </code>
                      <CopyButton textToCopy={currentConfig.stripeKey} />
                    </div>
                  )}
                </div>

                {/* Process ID */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">AR.IO Process ID</label>
                  {configMode === 'custom' ? (
                    <input
                      type="text"
                      value={currentConfig.processId}
                      onChange={(e) => updateCustomConfig('processId', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border/20 rounded-2xl text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-black rounded-2xl text-sm text-gray-100 font-mono break-all overflow-hidden">
                        {currentConfig.processId}
                      </code>
                      <CopyButton textToCopy={currentConfig.processId} />
                    </div>
                  )}
                </div>

                {/* Token Gateway Map */}
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-foreground/80 mb-3 hover:text-foreground">
                    Token Gateway Configuration ({Object.keys(currentConfig.tokenMap).length} networks)
                  </summary>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {Object.entries(currentConfig.tokenMap).map(([token, url]) => (
                      <div key={token}>
                        <label className="block text-xs font-medium text-foreground/80 mb-1 uppercase">{token}</label>
                        {configMode === 'custom' ? (
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => updateTokenMap(token as any, e.target.value)}
                            className="w-full px-2 py-1 bg-background border border-border/20 rounded text-foreground text-xs focus:ring-1 focus:ring-primary focus:border-transparent"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-2 py-1 bg-black rounded text-xs text-gray-100 font-mono truncate">
                              {url}
                            </code>
                            <CopyButton textToCopy={url} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </details>

            {/* Warning for non-production */}
            {configMode !== 'production' && (
              <p className="text-sm text-warning mb-4 sm:mb-6">
                Non-production endpoint services may not work as expected
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-3 pt-4 border-t border-border/20">
              {configMode === 'custom' && (
                <button
                  onClick={resetToDefaults}
                  className="px-4 py-2 border border-border/20 text-foreground/80 rounded-full hover:bg-background transition-colors text-sm"
                >
                  Reset to Production
                </button>
              )}

              <button
                onClick={applyConfiguration}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/80 transition-colors text-sm font-medium"
              >
                Apply Changes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/3 rounded-2xl border border-border/20 p-4 sm:p-6 mb-4 sm:mb-6">

        {/* Live Service Status */}
        {uploadServiceInfo && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-primary" />
              <h4 className="text-lg font-bold font-heading text-foreground">Live Service Status</h4>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-4 sm:mb-6">
              <div className="bg-card rounded-2xl p-4">
                <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Version</div>
                <div className="text-lg font-bold text-primary">{uploadServiceInfo.version}</div>
              </div>

              <div className="bg-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-foreground/80" />
                  <div className="text-xs text-foreground/80 uppercase tracking-wider">AR.IO Peers</div>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {peersInfo?.gatewayCount ?? '—'}
                </div>
              </div>

              <div className="bg-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-foreground/80" />
                  <div className="text-xs text-foreground/80 uppercase tracking-wider">Arweave Peers</div>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {peersInfo?.arweaveNodeCount ?? '—'}
                </div>
              </div>
            </div>

            {/* Service Wallets */}
            <div className="bg-card rounded-2xl p-4">
              <h5 className="text-sm font-medium text-foreground/80 mb-3 uppercase tracking-wider">Service Wallets</h5>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(uploadServiceInfo.addresses).map(([chain, address]) => (
                  <div key={chain} className="bg-card rounded-2xl p-3 flex justify-between items-center border border-border/20">
                    <div>
                      <span className="text-xs text-foreground/80 uppercase tracking-wider">{chain}</span>
                      <div className="font-mono text-sm text-foreground">{formatWalletAddress(address, 12)}</div>
                    </div>
                    <CopyButton textToCopy={address} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Information */}
        {(pricingInfo || gatewayInfo?.x402) && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="w-5 h-5 text-primary" />
              <h4 className="text-lg font-bold font-heading text-foreground">Pricing</h4>
            </div>

            {/* Upload Pricing */}
            {pricingInfo && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-foreground/80 mb-3 uppercase tracking-wider">Upload Pricing</h5>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Free Tier</div>
                    <div className="text-lg font-bold text-success">
                      {uploadServiceInfo ? `${Math.round(uploadServiceInfo.freeUploadLimitBytes / 1024)} KiB` : '105 KiB'}
                    </div>
                    <div className="text-xs text-foreground/80 mt-1">No cost for small files</div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">ar.io Rate</div>
                    <div className="text-lg font-bold text-primary">
                      ${pricingInfo.usdPerGiB.toFixed(4)}
                    </div>
                    <div className="text-xs text-foreground/80 mt-1">Per GiB via ar.io</div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Base Rate</div>
                    <div className="text-lg font-bold text-foreground">
                      {pricingInfo.baseGatewayPrice !== undefined
                        ? pricingInfo.baseGatewayPrice === 0
                          ? 'FREE'
                          : `$${pricingInfo.baseGatewayPrice.toFixed(4)}`
                        : 'Unavailable'
                      }
                    </div>
                    <div className="text-xs text-foreground/80 mt-1">Per GiB direct to arweave</div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">ar.io Premium</div>
                    <div className="text-lg font-bold text-primary">
                      {pricingInfo.turboFeePercentage
                        ? `+${pricingInfo.turboFeePercentage.toFixed(1)}%`
                        : pricingInfo.baseGatewayPrice === 0
                          ? 'N/A'
                          : 'Unavailable'
                      }
                    </div>
                    <div className="text-xs text-foreground/80 mt-1">
                      {pricingInfo.baseGatewayPrice === 0 ? 'vs free gateway' : 'Convenience fee'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Access Pricing (x402) */}
            {gatewayInfo?.x402?.enabled && gatewayInfo.x402.dataEgress?.pricing && (
              <div>
                <h5 className="text-sm font-medium text-foreground/80 mb-3 uppercase tracking-wider">Access Pricing (x402)</h5>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Min Price</div>
                    <div className="text-lg font-bold text-success">
                      ${parseFloat(gatewayInfo.x402.dataEgress.pricing.minPrice).toFixed(4)}
                    </div>
                    <div className="text-xs text-foreground/80 mt-1">{gatewayInfo.x402.dataEgress.pricing.currency}</div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">1 MB</div>
                    <div className="text-lg font-bold text-foreground">
                      ${gatewayInfo.x402.dataEgress.pricing.exampleCosts['1MB'].toFixed(4)}
                    </div>
                    <div className="text-xs text-foreground/80 mt-1">{gatewayInfo.x402.dataEgress.pricing.currency}</div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">1 GB</div>
                    <div className="text-lg font-bold text-primary">
                      ${gatewayInfo.x402.dataEgress.pricing.exampleCosts['1GB'].toFixed(4)}
                    </div>
                    <div className="text-xs text-foreground/80 mt-1">{gatewayInfo.x402.dataEgress.pricing.currency}</div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Network</div>
                    <div className="text-lg font-bold text-foreground capitalize">
                      {gatewayInfo.x402.network}
                    </div>
                    <div className="text-xs text-foreground/80 mt-1">Payment network</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Network Status */}
        {(arIOGatewayInfo || arweaveNodeInfo) && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h4 className="text-lg font-bold font-heading text-foreground">Network Status</h4>
            </div>

            {/* AR.IO Network */}
            {arIOGatewayInfo && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-foreground/80 mb-3 uppercase tracking-wider">AR.IO Network</h5>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Status</div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-lg font-bold text-primary capitalize">{arIOGatewayInfo.status}</span>
                    </div>
                    <div className="text-xs text-foreground/80">
                      Since {new Date(arIOGatewayInfo.startTimestamp).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Success Rate</div>
                    <div className="text-lg font-bold text-foreground">
                      {((arIOGatewayInfo.stats.passedEpochCount / arIOGatewayInfo.stats.totalEpochCount) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Operator Stake</div>
                    <div className="text-lg font-bold text-foreground">
                      {(arIOGatewayInfo.operatorStake / 1e6).toLocaleString()} ARIO
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Composite Weight</div>
                    <div className="text-lg font-bold text-foreground">
                      {arIOGatewayInfo.weights.compositeWeight.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Arweave Network */}
            {arweaveNodeInfo && (
              <div>
                <h5 className="text-sm font-medium text-foreground/80 mb-3 uppercase tracking-wider">Arweave Network</h5>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Block Height</div>
                    <div className="text-lg font-bold text-primary">
                      {arweaveNodeInfo.height.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Version</div>
                    <div className="text-lg font-bold text-foreground">
                      v{arweaveNodeInfo.version}.{arweaveNodeInfo.release}
                    </div>
                    <div className="text-xs text-foreground/80 mt-1">{arweaveNodeInfo.network}</div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Peers</div>
                    <div className="text-lg font-bold text-foreground">
                      {arweaveNodeInfo.peers}
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl p-4">
                    <div className="text-xs text-foreground/80 uppercase tracking-wider mb-1">Queue</div>
                    <div className="text-lg font-bold text-foreground">
                      {arweaveNodeInfo.queue_length}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* API and Service Information */}
      <div className="space-y-4">
        <h4 className="text-lg font-bold font-heading text-foreground">API and Documentation</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href={`${currentConfig.arioGatewayUrl.replace(/\/$/, '')}/ar-io/info`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card rounded-2xl p-4 hover:bg-card/80 transition-colors border border-border/20 hover:border-primary/50 flex items-start gap-3"
          >
            <Server className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-medium text-foreground mb-1">Gateway Info</h5>
              <p className="text-xs text-foreground/80">Gateway configuration data.</p>
            </div>
          </a>

          {gatewayInfo?.wallet && (
            <a
              href={`https://gateways.ar.io/#/gateways/${gatewayInfo.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card rounded-2xl p-4 hover:bg-card/80 transition-colors border border-border/20 hover:border-primary/50 flex items-start gap-3"
            >
              <Globe className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-medium text-foreground mb-1">Gateway Settings</h5>
                <p className="text-xs text-foreground/80">See more network configurations for this gateway.</p>
              </div>
            </a>
          )}

          <a
            href="https://upload.ardrive.io/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card rounded-2xl p-4 hover:bg-card/80 transition-colors border border-border/20 hover:border-primary/50 flex items-start gap-3"
          >
            <Upload className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-medium text-foreground mb-1">Upload</h5>
              <p className="text-xs text-foreground/80">Storing data and confirming availability.</p>
            </div>
          </a>

          <a
            href="https://payment.ardrive.io/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card rounded-2xl p-4 hover:bg-card/80 transition-colors border border-border/20 hover:border-primary/50 flex items-start gap-3"
          >
            <Wallet className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-medium text-foreground mb-1">Payments</h5>
              <p className="text-xs text-foreground/80">Rates, purchasing credits and managing accounts.</p>
            </div>
          </a>

          <a
            href="http://turbo-gateway.com/api-docs/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card rounded-2xl p-4 hover:bg-card/80 transition-colors border border-border/20 hover:border-primary/50 flex items-start gap-3"
          >
            <Server className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-medium text-foreground mb-1">Access</h5>
              <p className="text-xs text-foreground/80">Data access and domain name resolution.</p>
            </div>
          </a>

          <a
            href="https://docs.ar.io"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card rounded-2xl p-4 hover:bg-card/80 transition-colors border border-border/20 hover:border-primary/50 flex items-start gap-3"
          >
            <ExternalLink className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-medium text-foreground mb-1">Full Documentation</h5>
              <p className="text-xs text-foreground/80">Complete ar.io developer documentation.</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
