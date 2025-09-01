import DeploySitePanel from '../components/panels/DeploySitePanel';

export default function DeploySitePage() {
  console.log('🚀 DeploySitePage is rendering!');
  return (
    <div>
      <div className="rounded-lg border border-default bg-canvas">
        <div className="p-8">
          <DeploySitePanel />
        </div>
      </div>
    </div>
  );
}