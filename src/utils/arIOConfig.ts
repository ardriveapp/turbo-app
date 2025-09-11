import { ARIO, ANT, AOProcess, ContractSigner, InjectedEthereumSigner, AoSigner } from '@ar.io/sdk/web';
import { connect } from '@permaweb/aoconnect';
import { ethers } from 'ethers';

// ArDrive CU URL for ANT operations
const ANT_AO_CU_URL = 'https://cu.ardrive.io';

// Create dedicated ANT AO client (like reference app)
const antAoClient = connect({
  CU_URL: ANT_AO_CU_URL,
  MU_URL: 'https://mu.ao-testnet.xyz', 
  MODE: 'legacy' as const,
});

/**
 * Get ARIO mainnet instance
 */
export const getARIO = () => {
  return ARIO.mainnet();
};

/**
 * Get ANT instance following exact reference app pattern  
 * @param processId - The ANT process ID  
 * @param signer - Optional signer for write operations
 * @param hyperbeamUrl - Optional hyperbeam URL
 */
export const getANT = (processId: string, signer?: any, hyperbeamUrl?: string) => {
  const config: any = {
    process: new AOProcess({
      processId,
      ao: antAoClient,
    }),
  };
  
  if (signer) {
    config.signer = signer;
  }
  
  if (hyperbeamUrl) {
    config.hyperbeamUrl = hyperbeamUrl;
  }
  
  return ANT.init(config);
};

/**
 * Create appropriate signer based on wallet type (following reference app pattern)
 * @param walletType - The wallet type ('arweave' | 'ethereum' | 'solana')
 * @returns Proper ContractSigner for the wallet type
 */
export const createContractSigner = async (walletType: 'arweave' | 'ethereum' | 'solana' | null): Promise<ContractSigner> => {
  if (walletType === 'arweave') {
    // For Arweave wallets, use direct wallet (like WanderWalletConnector)
    return window.arweaveWallet as ContractSigner;
  } else if (walletType === 'ethereum') {
    // For Ethereum wallets, create AoSigner (like EthWalletConnector + our existing pattern)
    if (!window.ethereum) {
      throw new Error('Ethereum wallet not found. Please install MetaMask.');
    }

    // Use our existing Ethereum pattern from uploads
    const ethersProvider = new ethers.BrowserProvider(window.ethereum);
    const ethersSigner = await ethersProvider.getSigner();
    
    // Create provider interface that matches reference app pattern
    const provider = {
      getSigner: () => ({
        signMessage: async (message: any) => {
          const arg = typeof message === 'string' ? message : message.raw || message;
          return await ethersSigner.signMessage(arg);
        },
      }),
    };
    
    const injectedSigner = new InjectedEthereumSigner(provider as any);
    
    // Set up public key (required for Ethereum signers)  
    const message = 'Sign this message to connect to Turbo Gateway';
    const signature = await ethersSigner.signMessage(message);
    const messageHash = ethers.hashMessage(message);
    const recoveredKey = ethers.SigningKey.recoverPublicKey(messageHash, signature);
    injectedSigner.publicKey = Buffer.from(ethers.getBytes(recoveredKey));
    
    // Create AoSigner wrapper (like reference app EthWalletConnector)
    const aoSigner: AoSigner = async ({ data, tags, target }) => {
      if (!injectedSigner.publicKey) {
        throw new Error('Public key not set for Ethereum signer');
      }
      
      // Use arbundles to create data item (like reference app)
      const { createData } = await import('arbundles');
      const dataItem = createData(data as string, injectedSigner, {
        tags,
        target,
        anchor: Math.round(Date.now() / 1000)
          .toString()
          .padStart(32, Math.floor(Math.random() * 10).toString()),
      });

      await dataItem.sign(injectedSigner);
      return {
        id: dataItem.id,
        raw: dataItem.getRaw() as unknown as ArrayBuffer,
      };
    };
    
    return aoSigner as ContractSigner;
  } else {
    throw new Error('Only Arweave and Ethereum wallets can update ArNS records.');
  }
};

// Write options for ANT interactions
export const WRITE_OPTIONS = {
  tags: [
    {
      name: 'App-Name',
      value: 'Turbo App',
    },
    { 
      name: 'App-Version', 
      value: '0.3.0' 
    },
  ],
};