import { useEffect, useState } from 'react';
import { Coins, HardDrive, Share2, ArrowDown, Plus } from 'lucide-react';
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Credits Card */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-turbo-red/10 to-turbo-red/5 border border-turbo-red/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-turbo-red" />
            <span className="font-medium text-fg-muted">Credits</span>
          </div>
          <button
            onClick={() => navigate('/topup')}
            className="px-3 py-1.5 bg-turbo-red/20 hover:bg-turbo-red/30 text-turbo-red rounded-md transition-colors flex items-center gap-1 text-sm font-medium"
          >
            <Plus className="w-3 h-3" />
            Top Up
          </button>
        </div>
        
        <div className="text-2xl font-bold text-fg-muted mb-1">
          {loading ? '...' : balanceData ? (() => {
            const credits = balanceData.credits;
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
          })() : '0'}
        </div>
        
        <div className="text-xs text-link">
          {balanceData && balanceData.credits < 1 && balanceData.credits > 0 
            ? 'Very small amount - needs top-up'
            : 'Your spendable balance'
          }
        </div>
      </div>

      {/* Storage Card */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-turbo-blue/10 to-turbo-blue/5 border border-turbo-blue/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-turbo-blue" />
            <span className="font-medium text-fg-muted">Storage</span>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="px-3 py-1.5 bg-turbo-blue/20 hover:bg-turbo-blue/30 text-turbo-blue rounded-md transition-colors flex items-center gap-1 text-sm font-medium"
          >
            <Plus className="w-3 h-3" />
            Upload
          </button>
        </div>
        
        <div className="text-2xl font-bold text-fg-muted mb-1">
          {loading ? '...' : balanceData ? balanceData.gibStorage.toFixed(2) : '0'} GiB
        </div>
        
        <div className="text-xs text-link">
          Available storage capacity
        </div>
      </div>

      {/* Shared Out Credits Card */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-fg-muted">Credits Shared</span>
          </div>
          <button
            onClick={() => navigate('/share')}
            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-md transition-colors flex items-center gap-1 text-sm font-medium"
          >
            <Plus className="w-3 h-3" />
            Share
          </button>
        </div>
        
        <div className="text-2xl font-bold text-fg-muted mb-1">
          {loading ? '...' : balanceData ? balanceData.sharedOut.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          }) : '0'}
        </div>
        
        <div className="text-xs text-link">
          Credits you've shared with others
        </div>
      </div>

      {/* Credits Available from Others Card */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
        <div className="flex items-center gap-2 mb-3">
          <ArrowDown className="w-5 h-5 text-green-500" />
          <span className="font-medium text-fg-muted">Credits Available</span>
        </div>
        
        <div className="text-2xl font-bold text-fg-muted mb-1">
          {loading ? '...' : balanceData ? balanceData.available.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          }) : '0'}
        </div>
        
        <div className="text-xs text-link">
          Shared by others for your use
        </div>
      </div>
    </div>
  );
}