import { useMemo } from 'react';
import { TurboUnauthenticatedConfiguration } from '@ardrive/turbo-sdk';
import { useStore } from '../store/useStore';

export const useTurboConfig = (): TurboUnauthenticatedConfiguration => {
  const getCurrentConfig = useStore((state) => state.getCurrentConfig);
  
  return useMemo(() => {
    const config = getCurrentConfig();
    return {
      paymentServiceConfig: { url: config.paymentServiceUrl },
      uploadServiceConfig: { url: config.uploadServiceUrl },
      processId: config.processId,
    };
  }, [getCurrentConfig]);
};