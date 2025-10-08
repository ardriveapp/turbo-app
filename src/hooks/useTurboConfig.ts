import { useMemo } from 'react';
import { TurboUnauthenticatedConfiguration } from '@ardrive/turbo-sdk';
import { useStore } from '../store/useStore';

export const useTurboConfig = (tokenType?: string): any => {
  const getCurrentConfig = useStore((state) => state.getCurrentConfig);

  return useMemo(() => {
    const config = getCurrentConfig();
    const baseConfig = {
      paymentServiceConfig: { url: config.paymentServiceUrl },
      uploadServiceConfig: { url: config.uploadServiceUrl },
      processId: config.processId,
    };

    // If token type is provided and has a custom RPC, pass it as gatewayUrl
    if (tokenType && config.tokenMap[tokenType as keyof typeof config.tokenMap]) {
      return {
        ...baseConfig,
        gatewayUrl: config.tokenMap[tokenType as keyof typeof config.tokenMap],
      };
    }

    return baseConfig;
  }, [getCurrentConfig, tokenType]);
};