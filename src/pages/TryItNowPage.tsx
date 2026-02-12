import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import TryItNowPanel from '../components/panels/TryItNowPanel';

/**
 * Try It Out Page
 *
 * Allows users to upload files without connecting a wallet.
 * Uses Privy email login when user clicks upload.
 *
 * Behavior:
 * - If user has wallet connected: Redirect to /upload
 * - If user has no wallet: Show upload UI, prompt Privy login on upload
 */
export default function TryItNowPage() {
  const navigate = useNavigate();
  const { address, walletType } = useStore();

  useEffect(() => {
    // If user has a wallet connected via external wallet (not Privy email), redirect to regular upload
    // Privy email users can stay here since they came through the Try It Out flow
    if (address && walletType === 'arweave') {
      navigate('/upload');
      return;
    }
    if (address && walletType === 'solana') {
      navigate('/upload');
      return;
    }
  }, [address, walletType, navigate]);

  return (
    <div className="pt-6 sm:pt-8 pb-3 sm:pb-4">
      <TryItNowPanel />
    </div>
  );
}
