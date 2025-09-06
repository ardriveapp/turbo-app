import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { User } from 'lucide-react';
import WalletOverviewCard from '../components/account/WalletOverviewCard';
import BalanceCardsGrid from '../components/account/BalanceCardsGrid';
import CreditSharingSection from '../components/account/CreditSharingSection';
import ActivityOverview from '../components/account/ActivityOverview';

export default function MyAccountPage() {
  const { address } = useStore();
  const navigate = useNavigate();

  // Redirect to home if not logged in
  if (!address) {
    navigate('/');
    return null;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-5 h-5 text-turbo-red" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-fg-muted mb-1">My Account</h1>
          <p className="text-sm text-link">
            View your account details, like credits and recent activity.
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