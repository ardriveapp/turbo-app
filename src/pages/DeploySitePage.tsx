import DeploySitePanel from '../components/panels/DeploySitePanel';

export default function DeploySitePage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        <div className="p-3 sm:p-8">
          <DeploySitePanel />
        </div>
      </div>
    </div>
  );
}