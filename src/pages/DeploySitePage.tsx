import DeploySitePanel from '../components/panels/DeploySitePanel';

export default function DeploySitePage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <DeploySitePanel />
        </div>
      </div>
    </div>
  );
}