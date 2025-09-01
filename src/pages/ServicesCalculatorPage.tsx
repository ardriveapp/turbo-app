import ServicesCalculatorPanel from '../components/panels/ServicesCalculatorPanel';

interface ServicesCalculatorPageProps {
  navigateToService?: (service?: 'topup' | 'upload' | 'domains') => void;
}

export default function ServicesCalculatorPage({ navigateToService }: ServicesCalculatorPageProps = {}) {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <ServicesCalculatorPanel navigateToService={navigateToService} />
        </div>
      </div>
    </div>
  );
}