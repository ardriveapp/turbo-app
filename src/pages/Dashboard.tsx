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
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-3 sm:p-8">
          <SelectedComponent />
        </div>
      </div>
    </div>
  );
}