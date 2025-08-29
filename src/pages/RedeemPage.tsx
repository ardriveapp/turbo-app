import RedeemPanel from '../components/panels/RedeemPanel';

export default function RedeemPage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <RedeemPanel />
        </div>
      </div>
    </div>
  );
}