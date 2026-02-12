import { useState } from 'react';
import { features } from './dashboardFeatures';

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
      <div className="rounded-2xl border border-border/20 bg-card">
        {/* Panel Content */}
        <div className="p-3 sm:p-8">
          <SelectedComponent />
        </div>
      </div>
    </div>
  );
}