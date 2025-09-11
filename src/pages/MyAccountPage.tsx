import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { User } from 'lucide-react';
import { usePrimaryArNSName } from '../hooks/usePrimaryArNSName';
import { makePossessive } from '../utils';
import WalletOverviewCard from '../components/account/WalletOverviewCard';
import BalanceCardsGrid from '../components/account/BalanceCardsGrid';
import CreditSharingSection from '../components/account/CreditSharingSection';
import ActivityOverview from '../components/account/ActivityOverview';

export default function MyAccountPage() {
  const { address, walletType } = useStore();
  const navigate = useNavigate();
  const { arnsName, profile, loading: loadingArNS } = usePrimaryArNSName(walletType !== 'solana' ? address : null);

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
          <WalletOverviewCard />
          <BalanceCardsGrid />
          <CreditSharingSection />
        </div>
      </div>


      {/* Activity & Management */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-fg-muted">Activity</h2>
        
        {/* Activity Overview */}
        <ActivityOverview />

      </div>
    </div>
  );
}