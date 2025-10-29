import { useGatewayInfo } from '../../hooks/useGatewayInfo';
import { 
  Server, 
  Globe, 
  TrendingUp, 
  Database,
  Coins,
  Upload,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import CopyButton from '../CopyButton';
import { formatWalletAddress } from '../../utils';
import { useStore } from '../../store/useStore';

export default function GatewayInfoPanel() {
  const { uploadServiceInfo, gatewayInfo, arIOGatewayInfo, pricingInfo, arweaveNodeInfo, loading, error, refreshing, refresh } = useGatewayInfo();
  const { getCurrentConfig } = useStore();
  const currentConfig = getCurrentConfig();

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-turbo-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-link">Loading gateway information...</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6">
      {/* Inline Header with Description */}
      <div className="flex items-start gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 bg-turbo-purple/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Server className="w-5 h-5 text-turbo-purple" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-fg-muted mb-1">Service Info</h3>
          <p className="text-sm text-link">
            Real-time gateway service configuration, performance metrics, and technical details
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-default text-link hover:text-fg-muted hover:border-turbo-purple/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={refreshing ? 'Refreshing...' : 'Refresh gateway data'}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-turbo-purple' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Main Content Container with Gradient */}
      <div className="bg-gradient-to-br from-turbo-purple/5 to-turbo-purple/3 rounded-xl border border-default p-4 sm:p-6 mb-4 sm:mb-6">
        
        {/* Service Overview */}
        {uploadServiceInfo && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-turbo-purple" />
              <h4 className="text-lg font-bold text-fg-muted">Service Overview</h4>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 sm:mb-6">
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Version</div>
                <div className="text-lg font-bold text-turbo-purple">{uploadServiceInfo.version}</div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Free Limit</div>
                <div className="text-lg font-bold text-fg-muted">
                  {Math.round(uploadServiceInfo.freeUploadLimitBytes / 1024)} KB
                </div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Gateway</div>
                <div className="text-sm font-medium text-fg-muted">
                  {uploadServiceInfo.gateway.replace('https://', '')}
                </div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Chains</div>
                <div className="text-sm font-medium text-fg-muted">
                  {Object.keys(uploadServiceInfo.addresses).length} supported
                </div>
              </div>
            </div>

            {/* Multi-chain Addresses */}
            <div className="bg-canvas rounded-lg p-4">
              <h5 className="text-sm font-medium text-link mb-3 uppercase tracking-wider">Service Addresses</h5>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(uploadServiceInfo.addresses).map(([chain, address]) => (
                  <div key={chain} className="bg-surface rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-link uppercase tracking-wider">{chain}</span>
                      <div className="font-mono text-sm text-fg-muted">{formatWalletAddress(address, 12)}</div>
                    </div>
                    <CopyButton textToCopy={address} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Information */}
        {pricingInfo && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="w-5 h-5 text-turbo-purple" />
              <h4 className="text-lg font-bold text-fg-muted">Upload Fees & Pricing</h4>
            </div>
            
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Free Tier</div>
                <div className="text-lg font-bold text-turbo-green">
                  {uploadServiceInfo ? `${Math.round(uploadServiceInfo.freeUploadLimitBytes / 1024)} KiB` : '105 KiB'}
                </div>
                <div className="text-xs text-link mt-1">No cost for small files</div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Turbo Rate</div>
                <div className="text-lg font-bold text-turbo-purple">
                  ${pricingInfo.usdPerGiB.toFixed(4)}
                </div>
                <div className="text-xs text-link mt-1">Per GiB via Turbo</div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Base Rate</div>
                <div className="text-lg font-bold text-fg-muted">
                  {pricingInfo.baseGatewayPrice !== undefined 
                    ? pricingInfo.baseGatewayPrice === 0 
                      ? 'FREE' 
                      : `$${pricingInfo.baseGatewayPrice.toFixed(4)}`
                    : 'Unavailable'
                  }
                </div>
                <div className="text-xs text-link mt-1">Per GiB direct to gateway</div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Turbo Premium</div>
                <div className="text-lg font-bold text-turbo-purple">
                  {pricingInfo.turboFeePercentage 
                    ? `+${pricingInfo.turboFeePercentage.toFixed(1)}%` 
                    : pricingInfo.baseGatewayPrice === 0 
                      ? 'N/A'
                      : 'Unavailable'
                  }
                </div>
                <div className="text-xs text-link mt-1">
                  {pricingInfo.baseGatewayPrice === 0 ? 'vs free gateway' : 'Convenience fee'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance & Status */}
        {arIOGatewayInfo && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-turbo-purple" />
              <h4 className="text-lg font-bold text-fg-muted">AR.IO Network Status</h4>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 sm:mb-6">
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Status</div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-turbo-purple" />
                  <span className="text-lg font-bold text-turbo-purple capitalize">{arIOGatewayInfo.status}</span>
                </div>
                <div className="text-xs text-link">
                  Since {new Date(arIOGatewayInfo.startTimestamp).toLocaleDateString()}
                </div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Success Rate</div>
                <div className="text-lg font-bold text-fg-muted">
                  {((arIOGatewayInfo.stats.passedEpochCount / arIOGatewayInfo.stats.totalEpochCount) * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Operator Stake</div>
                <div className="text-lg font-bold text-fg-muted">
                  {(arIOGatewayInfo.operatorStake / 1e6).toLocaleString()} ARIO
                </div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Onchain Performance</div>
                <div className="text-lg font-bold text-fg-muted">
                  {(arIOGatewayInfo.weights.compositeWeight * 100).toFixed(1)}%
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Arweave Network Info */}
        {arweaveNodeInfo && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-turbo-purple" />
              <h4 className="text-lg font-bold text-fg-muted">Arweave Network Status</h4>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Block Height</div>
                <div className="text-lg font-bold text-turbo-purple">
                  {arweaveNodeInfo.height.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Version</div>
                <div className="text-lg font-bold text-fg-muted">
                  v{arweaveNodeInfo.version}.{arweaveNodeInfo.release}
                </div>
                <div className="text-xs text-link mt-1">{arweaveNodeInfo.network}</div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Peers</div>
                <div className="text-lg font-bold text-fg-muted">
                  {arweaveNodeInfo.peers}
                </div>
              </div>
              
              <div className="bg-surface rounded-lg p-4">
                <div className="text-xs text-link uppercase tracking-wider mb-1">Queue</div>
                <div className="text-lg font-bold text-fg-muted">
                  {arweaveNodeInfo.queue_length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Service Links */}
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-fg-muted">Related Services</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href={currentConfig.uploadServiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors border border-default hover:border-link/50"
          >
            <div className="flex items-center justify-between mb-2">
              <Upload className="w-5 h-5 text-link" />
              <ExternalLink className="w-4 h-4 text-link" />
            </div>
            <h5 className="font-medium text-fg-muted mb-1">Upload Service</h5>
            <p className="text-xs text-link">Live service configuration</p>
          </a>
          
          <a 
            href="https://arweave.net/ar-io/info"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors border border-default hover:border-link/50"
          >
            <div className="flex items-center justify-between mb-2">
              <Server className="w-5 h-5 text-link" />
              <ExternalLink className="w-4 h-4 text-link" />
            </div>
            <h5 className="font-medium text-fg-muted mb-1">Gateway Info</h5>
            <p className="text-xs text-link">Gateway configuration data</p>
          </a>
          
          {gatewayInfo?.wallet && (
            <a 
              href={`https://gateways.ar.io/#/gateways/${gatewayInfo.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors border border-default hover:border-link/50"
            >
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-5 h-5 text-link" />
                <ExternalLink className="w-4 h-4 text-link" />
              </div>
              <h5 className="font-medium text-fg-muted mb-1">Network Portal</h5>
              <p className="text-xs text-link">AR.IO network gateway details</p>
            </a>
          )}
          
          {uploadServiceInfo?.gateway && (
            <a 
              href={`${uploadServiceInfo.gateway}/info`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors border border-default hover:border-link/50"
            >
              <div className="flex items-center justify-between mb-2">
                <Database className="w-5 h-5 text-link" />
                <ExternalLink className="w-4 h-4 text-link" />
              </div>
              <h5 className="font-medium text-fg-muted mb-1">Arweave Node</h5>
              <p className="text-xs text-link">Live network and node status</p>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}