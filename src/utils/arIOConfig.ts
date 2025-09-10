import { ARIO, ANT, AOProcess } from '@ar.io/sdk/web';
import { connect } from '@permaweb/aoconnect';

// Custom ArDrive CU URL for better performance
const ARDRIVE_CU_URL = 'https://cu.ardrive.io';

// Get the mainnet process ID from the SDK
const getMainnetProcessId = () => {
  // Use the SDK's default mainnet instance to get the process ID
  const defaultArIO = ARIO.mainnet();
  return (defaultArIO as any).process?.processId || 'bLAgYxAdX2Ry-nt6aH2ixgfYfBUUxDxQkqfzm2WMuI8'; // fallback mainnet ID
};

/**
 * Get ARIO mainnet instance configured with ArDrive CU
 * Uses the SDK's built-in mainnet process ID
 */
export const getARIO = () => {
  console.log('Creating ARIO with CU_URL:', ARDRIVE_CU_URL);
  
  const aoConnection = connect({ 
    CU_URL: ARDRIVE_CU_URL,
    MODE: 'legacy'
  });
  
  console.log('ARIO AO connection created:', aoConnection);
  console.log('ARIO AO connection CU_URL should be:', ARDRIVE_CU_URL);
  console.log('ARIO AO connection actual CU_URL:', (aoConnection as any).CU_URL);
  
  const ario = ARIO.init({
    process: new AOProcess({
      processId: getMainnetProcessId(),
      ao: aoConnection,
    }),
  });
  
  console.log('ARIO instance created:', ario);
  
  return ario;
};

/**
 * Get ANT instance configured with ArDrive CU
 * @param processId - The ANT process ID
 * @param signer - Optional signer for write operations
 */
export const getANT = (processId: string, signer?: any) => {
  console.log('Creating ANT with CU_URL:', ARDRIVE_CU_URL, 'for processId:', processId);
  
  const aoConnection = connect({ 
    CU_URL: ARDRIVE_CU_URL,
    MODE: 'legacy'
  });
  
  console.log('ANT AO connection created:', aoConnection);
  console.log('ANT AO connection CU_URL should be:', ARDRIVE_CU_URL);
  console.log('ANT AO connection actual CU_URL:', (aoConnection as any).CU_URL);
  
  const config: any = {
    process: new AOProcess({
      processId,
      ao: aoConnection,
    })
  };
  
  if (signer) {
    config.signer = signer;
  }
  
  console.log('ANT config:', config);
  
  const ant = ANT.init(config);
  console.log('ANT instance created:', ant);
  
  return ant;
};