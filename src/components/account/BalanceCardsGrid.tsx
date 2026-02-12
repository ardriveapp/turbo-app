import { useEffect, useState } from 'react';
import { Coins, Share2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTurboBalance } from '../../utils';
import { useStore } from '../../store/useStore';
import { useWincForOneGiB } from '../../hooks/useWincForOneGiB';
import { wincPerCredit } from '../../constants';

interface BalanceData {
  credits: number;
  gibStorage: number;
  sharedOut: number;
  available: number;
}

export default function BalanceCardsGrid() {
  const { address, walletType } = useStore();
  const navigate = useNavigate();
  const wincForOneGiB = useWincForOneGiB();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBalanceData = async () => {
      if (!address || !walletType) return;

      setLoading(true);
      try {
        const balance = await getTurboBalance(address, walletType);

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
  }, [address, walletType, wincForOneGiB]);

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
    <div className="bg-card rounded-2xl border border-border/20 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-foreground/20 rounded-lg flex items-center justify-center border border-border/20">
            <Coins className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Account Balance</h3>
            <p className="text-sm text-foreground/80">Credits and storage overview</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-foreground/80">Loading account balance...</div>
        </div>
      ) : balanceData ? (
        <>
          {/* Primary Balance Display */}
          <div className="bg-card/50 rounded-2xl p-4 mb-4">
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-foreground mb-1">
                {formatCredits(balanceData.credits)} Credits
              </div>
              <div className="text-sm text-success">
                ≈ {balanceData.gibStorage.toFixed(2)} GiB storage capacity
              </div>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/topup')}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-foreground text-card rounded-full font-medium hover:bg-foreground/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Top Up Credits
            </button>
            <button
              onClick={() => navigate('/share')}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-card border border-border/20 rounded-full text-foreground hover:bg-card/80 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share Credits
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-foreground/80">
          Unable to load balance data
        </div>
      )}
    </div>
  );
}
