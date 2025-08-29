import PricingCalculatorPanel from '../components/panels/PricingCalculatorPanel';

interface CalculatorPageProps {
  navigateToService?: (service?: 'topup' | 'upload' | 'domains') => void;
}

export default function CalculatorPage({ navigateToService }: CalculatorPageProps = {}) {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <PricingCalculatorPanel navigateToService={navigateToService} />
        </div>
      </div>
    </div>
  );
}