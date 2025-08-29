import GatewayInfoPanel from '../components/panels/GatewayInfoPanel';

export default function GatewayInfoPage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <GatewayInfoPanel />
        </div>
      </div>
    </div>
  );
}