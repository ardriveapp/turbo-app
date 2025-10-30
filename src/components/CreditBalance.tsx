import React from 'react';
import { Coins } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useQuery } from '@tanstack/react-query';
import { getTurboBalance } from '@/utils';

export function CreditBalance() {
  const { address, walletType, getCurrentConfig } = useStore();

  const { data: balance, isLoading } = useQuery({
    queryKey: ['balance', address, walletType, getCurrentConfig().paymentServiceUrl],
    queryFn: async () => {
      if (!address || !walletType) return null;

      const result = await getTurboBalance(address, walletType);
      return result.winc;
    },
    enabled: !!address && !!walletType,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const formatBalance = (winc: string) => {
    const credits = Number(winc) / 1e12; // Convert Winston credits to credits
    if (credits < 1) {
      return credits.toFixed(6);
    }
    return credits.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  if (!address) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
      <Coins className="w-4 h-4 text-primary" />
      <div className="text-sm">
        {isLoading ? (
          <span className="text-muted">Loading...</span>
        ) : (
          <>
            <span className="font-mono font-medium">
              {balance ? formatBalance(balance) : '0'}
            </span>
            <span className="text-muted ml-1">Credits</span>
          </>
        )}
      </div>
    </div>
  );
}