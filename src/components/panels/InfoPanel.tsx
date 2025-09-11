import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { getTurboBalance, wincToCredits } from '../../utils';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import Faq from '../Faq';

export default function InfoPanel() {
  const { address } = useStore();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const wincForOneGiB = useWincForOneGiB();

  useEffect(() => {
    if (!address) return;
    
    setLoading(true);
    getTurboBalance(address)
      .then((result) => {
        setBalance(wincToCredits(result.winc));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address]);

  const estimatedStorage = wincForOneGiB 
    ? (balance * 1_000_000_000_000) / Number(wincForOneGiB) 
    : 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Your Account</h2>
        <p className="text-link">Manage credits, upload files, and more</p>
      </div>

      {/* Balance Card */}
      <div className="bg-surface rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="text-sm text-link mb-1">Current Balance</div>
        {loading ? (
          <div className="animate-pulse h-8 bg-default rounded w-32"></div>
        ) : (
          <>
            <div className="text-3xl font-bold mb-2">
              {balance.toLocaleString()} 
              <span className="text-lg text-link ml-2">Credits</span>
            </div>
            <div className="text-sm text-link">
              ≈ {estimatedStorage.toFixed(2)} GiB storage
            </div>
          </>
        )}
      </div>

      {/* Quick Stats */}
      <div className="space-y-4">
        <div className="bg-surface rounded-lg p-4">
          <div className="text-sm text-link mb-1">Upload Speed</div>
          <div className="font-semibold">860 tx/sec</div>
        </div>
        
        <div className="bg-surface rounded-lg p-4">
          <div className="text-sm text-link mb-1">Network Status</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-semibold">Online</span>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4">
          <div className="text-sm text-link mb-1">Free Tier</div>
          <div className="font-semibold">Files under 100KiB</div>
        </div>
      </div>

      {/* Resources */}
      <div className="mt-8 pt-8 border-t border-default">
        <h3 className="font-semibold mb-4">Resources</h3>
        <div className="space-y-2">
          <a 
            href="https://docs.ardrive.io/docs/turbo/turbo-sdk/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-link hover:text-fg-muted transition-colors"
          >
            SDK Documentation →
          </a>
          <a 
            href="https://cookbook.ar.io/guides/posting-transactions/turbo.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-link hover:text-fg-muted transition-colors"
          >
            Code Examples →
          </a>
          <a 
            href="https://github.com/ardriveapp/turbo-sdk" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-link hover:text-fg-muted transition-colors"
          >
            GitHub Repository →
          </a>
        </div>
      </div>

      {/* FAQ */}
      <Faq />
    </div>
  );
}