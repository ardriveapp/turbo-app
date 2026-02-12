import { Wallet, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { usePrimaryArNSName } from '../../hooks/usePrimaryArNSName';
import CopyButton from '../CopyButton';

export default function WalletOverviewCard() {
  const { address, walletType } = useStore();
  const { arnsName, loading: loadingArNS } = usePrimaryArNSName(walletType !== 'solana' ? address : null);

  if (!address || !walletType) {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl bg-card border border-border/20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Wallet Details
        </h4>
        <div className="flex items-center gap-2">
          <CopyButton textToCopy={address} />
          <button
            onClick={() => {
              // Determine which explorer to use based on wallet type
              let explorerUrl = '';
              
              if (walletType === 'ethereum') {
                explorerUrl = `https://etherscan.io/address/${address}`;
              } else if (walletType === 'solana') {
                explorerUrl = `https://explorer.solana.com/address/${address}`;
              } else {
                explorerUrl = `https://viewblock.io/arweave/address/${address}`;
              }
              
              window.open(explorerUrl, '_blank');
            }}
            className="p-1.5 rounded hover:bg-card transition-colors"
            title="View on Explorer"
          >
            <ExternalLink className="w-4 h-4 text-foreground/80 hover:text-foreground" />
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        {(arnsName || loadingArNS) && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/80">ArNS Name:</span>
            {loadingArNS ? (
              <span className="font-medium text-foreground">Loading...</span>
            ) : arnsName ? (
              <a
                href={`https://${arnsName}.ar.io`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {arnsName}
              </a>
            ) : (
              <span className="font-medium text-foreground">None</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/80">Address:</span>
          <span className="font-mono text-xs break-all">{address}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/80">Wallet Type:</span>
          <span className="font-medium text-foreground capitalize">{walletType}</span>
        </div>
      </div>
    </div>
  );
}