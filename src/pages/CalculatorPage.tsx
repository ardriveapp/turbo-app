import PricingCalculatorPanel from '../components/panels/PricingCalculatorPanel';

export default function CalculatorPage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <PricingCalculatorPanel />
        </div>
      </div>
    </div>
  );
}