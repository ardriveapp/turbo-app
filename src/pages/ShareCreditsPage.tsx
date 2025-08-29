import ShareCreditsPanel from '../components/panels/ShareCreditsPanel';

export default function ShareCreditsPage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <ShareCreditsPanel />
        </div>
      </div>
    </div>
  );
}