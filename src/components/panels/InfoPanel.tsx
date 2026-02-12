import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { getTurboBalance, wincToCredits } from '../../utils';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { useFreeUploadLimit, formatFreeLimit } from '../../hooks/useFreeUploadLimit';
import Faq from '../Faq';

export default function InfoPanel() {
  const { address, walletType } = useStore();
  const freeUploadLimitBytes = useFreeUploadLimit();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const wincForOneGiB = useWincForOneGiB();

  useEffect(() => {
    if (!address || !walletType) return;

    setLoading(true);
    getTurboBalance(address, walletType)
      .then((result) => {
        setBalance(wincToCredits(result.winc));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address, walletType]);

  const estimatedStorage = wincForOneGiB 
    ? (balance * 1_000_000_000_000) / Number(wincForOneGiB) 
    : 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Your Account</h2>
        <p className="text-foreground/80">Manage credits, upload files, and more</p>
      </div>

      {/* Balance Card */}
      <div className="bg-card rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="text-sm text-foreground/80 mb-1">Current Balance</div>
        {loading ? (
          <div className="animate-pulse h-8 bg-border/20 rounded w-32"></div>
        ) : (
          <>
            <div className="text-3xl font-bold mb-2">
              {balance.toLocaleString()}
              <span className="text-lg text-foreground/80 ml-2">Credits</span>
            </div>
            <div className="text-sm text-foreground/80">
              ≈ {estimatedStorage.toFixed(2)} GiB storage
            </div>
          </>
        )}
      </div>

      {/* Quick Stats */}
      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-4">
          <div className="text-sm text-foreground/80 mb-1">Upload Speed</div>
          <div className="font-semibold">860 tx/sec</div>
        </div>

        <div className="bg-card rounded-2xl p-4">
          <div className="text-sm text-foreground/80 mb-1">Network Status</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="font-semibold">Online</span>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-4">
          <div className="text-sm text-foreground/80 mb-1">Free Tier</div>
          <div className="font-semibold">
            {freeUploadLimitBytes > 0 ? `Files under ${formatFreeLimit(freeUploadLimitBytes)}` : 'No free tier'}
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="mt-8 pt-8 border-t border-border/20">
        <h3 className="font-semibold mb-4">Resources</h3>
        <div className="space-y-2">
          <a
            href="https://docs.ardrive.io/docs/turbo/turbo-sdk/"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-foreground/80 hover:text-foreground transition-colors"
          >
            SDK Documentation →
          </a>
          <a
            href="https://cookbook.ar.io/guides/posting-transactions/turbo.html"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-foreground/80 hover:text-foreground transition-colors"
          >
            Code Examples →
          </a>
          <a
            href="https://github.com/ardriveapp/turbo-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-foreground/80 hover:text-foreground transition-colors"
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