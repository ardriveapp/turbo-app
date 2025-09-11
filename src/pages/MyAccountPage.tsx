import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { User, Globe, ExternalLink, RefreshCw, Calendar, ArrowRight } from 'lucide-react';
import { usePrimaryArNSName } from '../hooks/usePrimaryArNSName';
import { useOwnedArNSNames } from '../hooks/useOwnedArNSNames';
import { makePossessive } from '../utils';
import BalanceCardsGrid from '../components/account/BalanceCardsGrid';
import CreditSharingSection from '../components/account/CreditSharingSection';
import ActivityOverview from '../components/account/ActivityOverview';

export default function MyAccountPage() {
  const { address, walletType } = useStore();
  const navigate = useNavigate();
  const { arnsName, profile, loading: loadingArNS } = usePrimaryArNSName(walletType !== 'solana' ? address : null);
  const { names: ownedNames, loading: loadingDomains, fetchOwnedNames } = useOwnedArNSNames();

  // Redirect to home if not logged in
  if (!address) {
    navigate('/');
    return null;
  }

  return (
    <div className="px-4 sm:px-6">
      {/* Page Header */}
      <div className="flex items-start gap-4 mb-6">
        {/* Profile Image or User Icon */}
        {profile.logo ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface border border-default/50 flex items-center justify-center flex-shrink-0 mt-1">
            <img 
              src={profile.logo} 
              alt={`${profile.name} logo`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to user icon on error
                const target = e.target as HTMLImageElement;
                const container = target.parentElement;
                if (container) {
                  target.style.display = 'none';
                  const fallback = container.querySelector('.fallback-icon') as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }
              }}
            />
            <div className="fallback-icon hidden w-full h-full bg-fg-muted/20 rounded-lg items-center justify-center">
              <User className="w-6 h-6 text-fg-muted" />
            </div>
          </div>
        ) : (
          <div className="w-12 h-12 bg-fg-muted/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
            <User className="w-6 h-6 text-fg-muted" />
          </div>
        )}
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg-muted mb-1">
            {loadingArNS ? (
              'Loading...'
            ) : arnsName ? (
              `${makePossessive(arnsName)} Account`
            ) : (
              'My Account'
            )}
          </h1>
          <p className="text-sm text-link">
            {walletType && 'View your account details, like credits and recent activity.'}
          </p>
        </div>
      </div>

      {/* Wallet Overview Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-fg-muted mb-4">Overview</h2>
        <div className="space-y-4">
          <BalanceCardsGrid />
          <CreditSharingSection />
        </div>
      </div>

      {/* Domains Section - Only show for Arweave and Ethereum wallets */}
      {(walletType === 'arweave' || walletType === 'ethereum') && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-fg-muted">Domains</h2>
            <button
              onClick={() => fetchOwnedNames(true)}
              disabled={loadingDomains}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-turbo-yellow hover:text-turbo-yellow/80 transition-colors disabled:opacity-50"
              title="Refresh domain list"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDomains ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-turbo-yellow/5 to-turbo-yellow/3 rounded-xl border border-turbo-yellow/20 p-6">
            {loadingDomains ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 text-turbo-yellow mx-auto mb-3 animate-spin" />
                <p className="text-sm text-link">Loading your domains...</p>
              </div>
            ) : ownedNames.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-turbo-yellow/50 mx-auto mb-4" />
                <h3 className="font-medium text-fg-muted mb-2">No Domains Yet</h3>
                <p className="text-sm text-link mb-4">
                  Register an ArNS domain to give your apps and sites friendly names
                </p>
                <button
                  onClick={() => navigate('/domains')}
                  className="px-4 py-2 bg-turbo-yellow text-black rounded-lg font-medium hover:bg-turbo-yellow/90 transition-colors"
                >
                  Search for Your Name
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 mb-6">
                  {ownedNames.slice(0, 5).map((domain) => (
                    <div key={domain.name} className="bg-surface/50 rounded-lg border border-turbo-yellow/10 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Domain Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Globe className="w-5 h-5 text-turbo-yellow flex-shrink-0" />
                            <div>
                              <h3 className="text-lg font-bold text-turbo-yellow">
                                {domain.displayName}.ar.io
                              </h3>
                              {domain.displayName !== domain.name && (
                                <p className="text-xs text-link">Raw name: {domain.name}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 text-sm">
                            {domain.lastUpdated && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-link" />
                                <span className="text-link">
                                  Registered: {domain.lastUpdated.toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {/* TODO: Add lease expiration when that data is available in the domain object */}
                            <span className="text-xs text-link">Permanently owned</span>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0">
                          <button
                            onClick={() => window.open(`https://${domain.name}.ar.io`, '_blank')}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-turbo-yellow text-black rounded-lg font-medium hover:bg-turbo-yellow/90 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Visit
                          </button>
                          <button
                            onClick={() => window.open(`https://arns.ar.io/#/manage/names/${domain.name}`, '_blank')}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-turbo-yellow/30 rounded-lg text-turbo-yellow hover:bg-turbo-yellow/10 transition-colors"
                          >
                            <Globe className="w-4 h-4" />
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* View All Domains Button - Always show if user has domains */}
                {ownedNames.length > 0 && (
                  <div className="text-center pt-4 border-t border-turbo-yellow/20">
                    <button
                      onClick={() => window.open('https://arns.ar.io/#/manage/names', '_blank')}
                      className="flex items-center justify-center gap-2 px-6 py-3 text-turbo-yellow hover:text-turbo-yellow/80 transition-colors font-medium"
                    >
                      View All Domains
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Activity & Management */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-fg-muted">Activity</h2>
        
        {/* Activity Overview */}
        <ActivityOverview />

      </div>
    </div>
  );
}