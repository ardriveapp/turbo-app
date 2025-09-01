import ServicesCalculatorPanel from '../components/panels/ServicesCalculatorPanel';

export default function ServicesCalculatorPage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <ServicesCalculatorPanel />
        </div>
      </div>
    </div>
  );
}