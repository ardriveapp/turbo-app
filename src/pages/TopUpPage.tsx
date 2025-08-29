import TopUpPanel from '../components/panels/TopUpPanel';

export default function TopUpPage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <TopUpPanel />
        </div>
      </div>
    </div>
  );
}