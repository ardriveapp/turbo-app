import UploadPanel from '../components/panels/UploadPanel';

export default function UploadPage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <UploadPanel />
        </div>
      </div>
    </div>
  );
}