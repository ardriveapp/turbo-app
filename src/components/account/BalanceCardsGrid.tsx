import { useEffect, useState } from 'react';
import { Coins, Share2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TurboFactory } from '@ardrive/turbo-sdk/web';
import { useStore } from '../../store/useStore';
import { useTurboConfig } from '../../hooks/useTurboConfig';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { wincPerCredit } from '../../constants';

interface BalanceData {
  credits: number;
  gibStorage: number;
  sharedOut: number;
  available: number;
}

export default function BalanceCardsGrid() {
  const { address } = useStore();
  const navigate = useNavigate();
  const turboConfig = useTurboConfig();
  const wincForOneGiB = useWincForOneGiB();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBalanceData = async () => {
      if (!address) return;
      
      setLoading(true);
      try {
        const turbo = TurboFactory.unauthenticated(turboConfig);
        const balance = await turbo.getBalance(address);
        
        const {
          winc,
          controlledWinc,
          effectiveBalance,
        } = balance;
        
        const credits = Number(winc) / wincPerCredit;
        const gibStorage = wincForOneGiB ? Number(winc) / Number(wincForOneGiB) : 0;
        const sharedOut = controlledWinc ? (Number(controlledWinc) - Number(winc)) / wincPerCredit : 0;
        const available = effectiveBalance ? (Number(effectiveBalance) - Number(winc)) / wincPerCredit : 0;
        
        setBalanceData({
          credits,
          gibStorage,
          sharedOut,
          available
        });
      } catch (error) {
        console.error('Failed to fetch balance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalanceData();
  }, [address, turboConfig, wincForOneGiB]);

  if (!balanceData && !loading) {
    return null;
  }

  const formatCredits = (credits: number): string => {
    if (credits >= 1) {
      return credits.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    } else if (credits > 0) {
      return credits.toLocaleString('en-US', {
        minimumFractionDigits: 6,
        maximumFractionDigits: 8
      });
    } else {
      return '0';
    }
  };

  return (
    <div className="bg-gradient-to-br from-fg-muted/5 to-fg-muted/3 rounded-xl border border-default p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-fg-muted/20 rounded-lg flex items-center justify-center">
            <Coins className="w-5 h-5 text-fg-muted" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-fg-muted">Account Balance</h3>
            <p className="text-sm text-link">Credits and storage overview</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-link">Loading account balance...</div>
        </div>
      ) : balanceData ? (
        <>
          {/* Primary Balance Display */}
          <div className="bg-surface/50 rounded-lg p-4 mb-4">
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-fg-muted mb-1">
                {formatCredits(balanceData.credits)} Credits
              </div>
              <div className="text-sm text-turbo-green">
                ≈ {balanceData.gibStorage.toFixed(2)} GiB storage capacity
              </div>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/topup')}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-fg-muted text-black rounded-lg font-medium hover:bg-fg-muted/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Top Up Credits
            </button>
            <button
              onClick={() => navigate('/share')}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-surface border border-default rounded-lg text-fg-muted hover:bg-canvas transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share Credits
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-link">
          Unable to load balance data
        </div>
      )}
    </div>
  );
}