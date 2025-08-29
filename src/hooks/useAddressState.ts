import { TokenType, TurboSigner, ArconnectSigner } from '@ardrive/turbo-sdk/web';
import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

export type TransferTransactionResult = {
  txid: string;
  explorerURL: string;
};

export type AddressState = {
  address: string;
  token: TokenType;
  disconnect: () => void;
  explorerUrl: string;
  signer?: TurboSigner;
  submitNativeTransaction?: (
    amount: number,
    toAddress: string,
  ) => Promise<TransferTransactionResult>;
};

const useAddressState = (): AddressState | undefined => {
  const { address, walletType, setAddress } = useStore();
  const [addressState, setAddressState] = useState<AddressState>();

  const updateAddressState = useCallback(async () => {
    if (!address || !walletType) {
      setAddressState(undefined);
      return;
    }

    // Map wallet types to token types and create appropriate address state
    switch (walletType) {
      case 'arweave':
        setAddressState({
          address: address,
          token: 'arweave', // Default to AR for Arweave wallets
          disconnect: () => {
            setAddress(null);
            if (window.arweaveWallet) {
              window.arweaveWallet.disconnect();
            }
          },
          explorerUrl: `https://viewblock.io/arweave/address/${address}`,
          signer: window.arweaveWallet ? new ArconnectSigner(window.arweaveWallet) : undefined,
          // Arweave wallets can do direct payments via SDK, no manual transaction needed
        });
        break;

      case 'ethereum':
        setAddressState({
          address: address,
          token: 'ethereum',
          disconnect: () => {
            setAddress(null);
            // Additional disconnect logic would go here for wagmi
          },
          explorerUrl: `https://etherscan.io/address/${address}`,
          // Ethereum wallets require manual transaction submission
          submitNativeTransaction: async (amount: number, toAddress: string) => {
            // This would integrate with wagmi to send ETH transaction
            // For now, return a placeholder - this needs proper implementation
            throw new Error('Ethereum manual transactions not yet implemented');
          },
        });
        break;

      case 'solana':
        setAddressState({
          address: address,
          token: 'solana',
          disconnect: () => {
            setAddress(null);
            // Additional disconnect logic would go here for Solana wallet adapter
          },
          explorerUrl: `https://solscan.io/address/${address}`,
          // Solana wallets require manual transaction submission
          submitNativeTransaction: async (amount: number, toAddress: string) => {
            // This would integrate with Solana wallet adapter to send SOL transaction
            // For now, return a placeholder - this needs proper implementation
            throw new Error('Solana manual transactions not yet implemented');
          },
        });
        break;

      default:
        setAddressState(undefined);
        break;
    }
  }, [address, walletType, setAddress]);

  useEffect(() => {
    updateAddressState();
  }, [updateAddressState]);

  return addressState;
};

export default useAddressState;