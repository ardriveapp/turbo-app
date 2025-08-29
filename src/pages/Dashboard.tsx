import { useState } from 'react';
import { CreditCard, Upload, Share2, Gift, Globe, Code } from 'lucide-react';
import TopUpPanel from '../components/panels/TopUpPanel';
import GiftPanel from '../components/panels/GiftPanel';
import ShareCreditsPanel from '../components/panels/ShareCreditsPanel';
import UploadPanel from '../components/panels/UploadPanel';
import ArNSPanel from '../components/panels/ArNSPanel';
import DeveloperPanel from '../components/panels/DeveloperPanel';

export const features = [
  { name: 'Buy Credits', component: TopUpPanel, icon: CreditCard },
  { name: 'Upload Files', component: UploadPanel, icon: Upload },
  { name: 'Share Credits', component: ShareCreditsPanel, icon: Share2 },
  { name: 'Send Gift', component: GiftPanel, icon: Gift },
  { name: 'Manage Domains', component: ArNSPanel, icon: Globe },
];

// Developer feature for Build dropdown
export const developerFeature = { name: 'Developer Resources', component: DeveloperPanel, icon: Code };

interface DashboardProps {
  selectedFeature?: any;
  setSelectedFeature?: (feature: any) => void;
}

export default function Dashboard({ selectedFeature }: DashboardProps = {}) {
  // Use provided state or local state
  const [localSelectedFeature] = useState(features[0]);
  const currentFeature = selectedFeature || localSelectedFeature;
  const SelectedComponent = currentFeature.component;

  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-8">
          <SelectedComponent />
        </div>
      </div>
    </div>
  );
}