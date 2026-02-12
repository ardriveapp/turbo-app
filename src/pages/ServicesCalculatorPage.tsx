import ServicesCalculatorPanel from '../components/panels/ServicesCalculatorPanel';

export default function ServicesCalculatorPage() {
  return (
    <div>
      <div className="rounded-2xl border border-border/20 bg-card">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <ServicesCalculatorPanel />
        </div>
      </div>
    </div>
  );
}