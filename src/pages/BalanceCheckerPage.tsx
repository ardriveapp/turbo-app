import BalanceCheckerPanel from '../components/panels/BalanceCheckerPanel';

export default function BalanceCheckerPage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <BalanceCheckerPanel />
        </div>
      </div>
    </div>
  );
}