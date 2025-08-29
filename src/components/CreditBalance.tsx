import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useQuery } from '@tanstack/react-query';
import { TurboFactory } from '@ardrive/turbo-sdk/web';

export function CreditBalance() {
  const { address, walletType } = useStore();
  
  const { data: balance, isLoading } = useQuery({
    queryKey: ['balance', address],
    queryFn: async () => {
      if (!address) return null;
      
      const turbo = TurboFactory.authenticated({
        privateKey: undefined,
        token: 'ethereum',
        gatewayUrl: 'https://turbo.ardrive.io',
      });
      
      const { winc } = await turbo.getBalance();
      return winc;
    },
    enabled: !!address,
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