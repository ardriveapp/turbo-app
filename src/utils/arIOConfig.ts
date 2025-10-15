import { ARIO, ANT, AOProcess, ContractSigner, InjectedEthereumSigner, AoSigner } from '@ar.io/sdk/web';
import { connect } from '@permaweb/aoconnect';
import { ethers } from 'ethers';

// Production AR.IO Process ID for comparison
const PRODUCTION_PROCESS_ID = 'qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE';

/**
 * Get current developer configuration from store
 */
const getCurrentConfig = () => {
  if (typeof window !== 'undefined' && (window as any).__TURBO_STORE__) {
    return (window as any).__TURBO_STORE__.getState().getCurrentConfig();
  }
  // Fallback to production defaults
  return {
    processId: PRODUCTION_PROCESS_ID,
  };
};

/**
 * Get ARIO instance with dynamic configuration based on developer mode
 * Uses production mainnet or custom process ID based on configuration
 */
export const getARIO = () => {
  const config = getCurrentConfig();

  // If using production process ID, use mainnet shorthand
  if (config.processId === PRODUCTION_PROCESS_ID) {
    return ARIO.mainnet();
  }

  // Otherwise, initialize with custom process ID (for development/custom modes)
  return ARIO.init({
    processId: config.processId,
  });
};

/**
 * Get ANT instance with dynamic AO client configuration
 * @param processId - The ANT process ID
 * @param signer - Optional signer for write operations
 * @param hyperbeamUrl - Optional hyperbeam URL
 */
export const getANT = (processId: string, signer?: any, hyperbeamUrl?: string) => {
  // Create AO client dynamically based on configuration
  // For now, we use ArDrive CU for all environments (can be made configurable later)
  const antAoClient = connect({
    CU_URL: 'https://cu.ardrive.io',
    MU_URL: 'https://mu.ao-testnet.xyz',
    MODE: 'legacy' as const,
  });

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
    // For Arweave wallets, ensure wallet is connected and get the active address
    if (!window.arweaveWallet) {
      throw new Error('Arweave wallet not found. Please connect your wallet.');
    }

    // Ensure the wallet has the active address available
    try {
      const activeAddress = await window.arweaveWallet.getActiveAddress();
      if (!activeAddress) {
        throw new Error('No active address found. Please reconnect your Arweave wallet.');
      }
      // Wallet is properly connected with an active address
    } catch (error) {
      console.error('Failed to get Arweave wallet address:', error);
      throw new Error('Failed to verify Arweave wallet connection. Please reconnect.');
    }

    // Return the wallet as ContractSigner
    return window.arweaveWallet as ContractSigner;
  } else if (walletType === 'ethereum') {
    // For Ethereum wallets, create AoSigner (like EthWalletConnector + our existing pattern)
    if (!window.ethereum) {
      throw new Error('Ethereum wallet not found. Please install MetaMask.');
    }

    // Use our existing Ethereum pattern from uploads
    const ethersProvider = new ethers.BrowserProvider(window.ethereum);
    const ethersSigner = await ethersProvider.getSigner();
    const address = await ethersSigner.getAddress();

    // Create provider interface that matches reference app pattern
    const provider = {
      getSigner: () => ({
        signMessage: async (message: any) => {
          const arg = typeof message === 'string' ? message : message.raw || message;
          return await ethersSigner.signMessage(arg);
        },
        getAddress: async () => address,
      }),
    };

    const injectedSigner = new InjectedEthereumSigner(provider as any);

    // CRITICAL: Set the address property for ArNS permission checks
    (injectedSigner as any).address = address;

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
      value: '0.4.1'
    },
  ],
};