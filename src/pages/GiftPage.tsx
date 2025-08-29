import GiftPanel from '../components/panels/GiftPanel';

export default function GiftPage() {
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        {/* Panel Content */}
        <div className="p-4 sm:p-8">
          <GiftPanel />
        </div>
      </div>
    </div>
  );
}