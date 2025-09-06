import {
  ArconnectSigner,
  TokenType,
  TurboSigner,
} from '@ardrive/turbo-sdk/web';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { useCallback, useEffect, useState } from 'react';
import { parseEther } from 'viem';
import {
  useSendTransaction,
} from 'wagmi';
import { mainnet } from 'wagmi/chains';
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
  const [addressState, setAddressState] = useState<AddressState>();
  const { address, walletType, clearAddress } = useStore();

  // wagmi hooks for Ethereum transactions
  const { sendTransactionAsync } = useSendTransaction();
  
  // Solana hooks for transactions
  const { sendTransaction: solanaSendTransaction } = useWallet();
  const { connection: solanaConnection } = useConnection();

  const updateAddressState = useCallback(async () => {
    if (!address || !walletType) {
      setAddressState(undefined);
      return;
    }

    // Map our store's wallet state to AddressState format
    switch (walletType) {
      case 'arweave':
        setAddressState({
          address,
          token: 'arweave',
          disconnect: clearAddress, // Use store's clearAddress instead of calling setAddress(null, null)
          explorerUrl: `https://viewblock.io/arweave/address/${address}`,
          signer: window.arweaveWallet ? new ArconnectSigner(window.arweaveWallet) : undefined,
        });
        break;

      case 'ethereum':
        setAddressState({
          address,
          token: 'ethereum',
          disconnect: clearAddress, // Use store's clearAddress
          explorerUrl: `https://etherscan.io/address/${address}`,
          submitNativeTransaction: async (amount: number, toAddress: string) => {
            if (!toAddress.startsWith('0x')) {
              throw new Error('Invalid address');
            }

            try {
              const res = await sendTransactionAsync({
                to: toAddress as `0x${string}`,
                value: parseEther(amount.toString()),
                chainId: mainnet.id,
              });

              return {
                txid: res,
                explorerURL: `https://etherscan.io/tx/${res}`,
              };
            } catch (error) {
              console.error('Transaction failed', error);
              throw error;
            }
          },
        });
        break;

      case 'solana':
        setAddressState({
          address,
          token: 'solana',
          disconnect: clearAddress, // Use store's clearAddress
          explorerUrl: `https://solscan.io/address/${address}`,
          submitNativeTransaction: async (amount: number, toAddress: string) => {
            try {
              const publicKey = new PublicKey(address);
              const recipientPubKey = new PublicKey(toAddress);

              const transaction = new Transaction();
              const sendSolInstruction = SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: recipientPubKey,
                lamports: amount * LAMPORTS_PER_SOL,
              });

              transaction.add(sendSolInstruction);

              const signature = await solanaSendTransaction(transaction, solanaConnection);

              const latestBlockHash = await solanaConnection.getLatestBlockhash();
              const res = await solanaConnection.confirmTransaction(
                {
                  signature,
                  blockhash: latestBlockHash.blockhash,
                  lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                },
                'processed',
              );
              
              if (res.value.err) {
                throw res.value.err;
              }

              return {
                txid: signature,
                explorerURL: `https://solscan.io/tx/${signature}`,
              };
            } catch (error) {
              console.error('Transaction failed', error);
              throw error;
            }
          },
        });
        break;

      default:
        setAddressState(undefined);
        break;
    }
  }, [address, walletType, clearAddress, sendTransactionAsync, solanaSendTransaction, solanaConnection]);

  useEffect(() => {
    updateAddressState();
  }, [updateAddressState]);

  return addressState;
};

export default useAddressState;