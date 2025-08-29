import DeveloperPanel from '../components/panels/DeveloperPanel';

export function DeveloperPage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <DeveloperPanel />
        </div>
      </div>
    </div>
  );
}