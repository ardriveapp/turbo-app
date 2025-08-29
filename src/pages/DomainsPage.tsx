import ArNSPanel from '../components/panels/ArNSPanel';

export default function DomainsPage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <ArNSPanel />
        </div>
      </div>
    </div>
  );
}