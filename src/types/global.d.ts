interface Window {
  arweaveWallet?: {
    connect(permissions: string[]): Promise<void>;
    disconnect(): Promise<void>;
    getActiveAddress(): Promise<string>;
    getActivePublicKey(): Promise<string>;
    sign(transaction: any): Promise<any>;
    signDataItem(dataItem: any): Promise<ArrayBufferLike>;
    dispatch(transaction: any): Promise<any>;
    walletName?: string;
    walletVersion?: string;
  };
  ethereum?: {
    request(args: { method: string; params?: any[] }): Promise<any>;
    on(event: string, handler: (...args: any[]) => void): void;
    removeListener(event: string, handler: (...args: any[]) => void): void;
  };
  solana?: {
    connect(): Promise<{ publicKey: { toString(): string } }>;
    disconnect(): Promise<void>;
    signTransaction(transaction: any): Promise<any>;
    signAllTransactions(transactions: any[]): Promise<any[]>;
    signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
    publicKey?: { toString(): string };
    isConnected?: boolean;
    isPhantom?: boolean;
  };
}