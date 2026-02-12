import { useState, useEffect } from 'react';
import { type AoGateway } from '@ar.io/sdk';
import { TurboFactory, USD } from '@ardrive/turbo-sdk/web';
import { useTurboConfig } from './useTurboConfig';
import { useStore } from '../store/useStore';

interface UploadServiceInfo {
  version: string;
  addresses: {
    arweave: string;
    ethereum: string;
    solana: string;
    pol: string;
    kyve: string;
  };
  gateway: string;
  freeUploadLimitBytes: number;
}

interface X402Pricing {
  perBytePrice: string;
  minPrice: string;
  maxPrice: string;
  currency: string;
  exampleCosts: {
    '1KB': number;
    '1MB': number;
    '1GB': number;
  };
}

interface GatewayInfo {
  wallet: string;
  processId: string;
  release: string;
  ans104UnbundleFilter: any;
  ans104IndexFilter: any;
  supportedManifestVersions: string[];
  x402?: {
    enabled: boolean;
    network: string;
    walletAddress: string;
    dataEgress?: {
      pricing: X402Pricing;
    };
  };
}

// Use the actual AR.IO SDK type
type ArIOGatewayInfo = AoGateway;

interface PricingInfo {
  wincPerGiB: string;
  usdPerGiB: number;
  baseGatewayPrice?: number;
  turboFeePercentage?: number;
}

interface ArweaveNodeInfo {
  version: number;
  release: number;
  queue_length: number;
  peers: number;
  node_state_latency: number;
  network: string;
  height: number;
  current: string;
  blocks: number;
}

interface PeersInfo {
  gatewayCount: number;
  arweaveNodeCount: number;
}

const CACHE_KEY_PREFIX = 'turbo-gateway-info';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

interface CachedGatewayInfo {
  data: {
    uploadServiceInfo: UploadServiceInfo | null;
    gatewayInfo: GatewayInfo | null;
    arIOGatewayInfo: ArIOGatewayInfo | null;
    pricingInfo: PricingInfo | null;
    arweaveNodeInfo: ArweaveNodeInfo | null;
    peersInfo: PeersInfo | null;
  };
  timestamp: number;
}

export function useGatewayInfo() {
  const [uploadServiceInfo, setUploadServiceInfo] = useState<UploadServiceInfo | null>(null);
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null);
  const [arIOGatewayInfo, setArIOGatewayInfo] = useState<ArIOGatewayInfo | null>(null);
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null);
  const [arweaveNodeInfo, setArweaveNodeInfo] = useState<ArweaveNodeInfo | null>(null);
  const [peersInfo, setPeersInfo] = useState<PeersInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const turboConfig = useTurboConfig();
  const getCurrentConfig = useStore((state) => state.getCurrentConfig);
  const configMode = useStore((state) => state.configMode);

  // Create config-aware cache key
  const cacheKey = `${CACHE_KEY_PREFIX}-${configMode}`;

  useEffect(() => {
    const fetchGatewayInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsedCache: CachedGatewayInfo = JSON.parse(cached);
            const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION;
            
            if (!isExpired) {
              // Using cached gateway info
              setUploadServiceInfo(parsedCache.data.uploadServiceInfo);
              setGatewayInfo(parsedCache.data.gatewayInfo);
              setArIOGatewayInfo(parsedCache.data.arIOGatewayInfo);
              setPricingInfo(parsedCache.data.pricingInfo);
              setArweaveNodeInfo(parsedCache.data.arweaveNodeInfo);
              setPeersInfo(parsedCache.data.peersInfo);
              setLoading(false);
              return;
            }
          } catch (err) {
            console.warn('Failed to parse cached gateway info:', err);
          }
        }

        // Fetch all data
        let uploadData = null;
        let gatewayData = null;
        let arIOData = null;
        let pricingData = null;
        let arweaveNodeData = null;
        let peersData: PeersInfo | null = null;

        // Fetch upload service info from upload service URL
        try {
          const config = getCurrentConfig();
          const uploadResponse = await fetch(config.uploadServiceUrl);
          uploadData = await uploadResponse.json();
          setUploadServiceInfo(uploadData);
        } catch (err) {
          console.warn('Failed to fetch upload service info:', err);
        }

        // Fetch gateway info from configured AR.IO gateway
        const config = getCurrentConfig();
        const gatewayUrl = config.arioGatewayUrl.replace(/\/$/, ''); // Remove trailing slash
        try {
          const gatewayResponse = await fetch(`${gatewayUrl}/ar-io/info`);
          gatewayData = await gatewayResponse.json();
          setGatewayInfo(gatewayData);
        } catch (err) {
          console.warn('Failed to fetch gateway info:', err);
        }

        // Fetch peers info from configured gateway
        try {
          const peersResponse = await fetch(`${gatewayUrl}/ar-io/peers`);
          const peersRaw = await peersResponse.json();
          peersData = {
            gatewayCount: Object.keys(peersRaw.gateways || {}).length,
            arweaveNodeCount: Object.keys(peersRaw.arweaveNodes || {}).length,
          };
          setPeersInfo(peersData);
        } catch (err) {
          console.warn('Failed to fetch peers info:', err);
        }

        // Fetch AR.IO gateway info using SDK (if we have gateway wallet address)
        if (gatewayData?.wallet) {
          try {
            const { getARIO } = await import('../utils');
            const io = getARIO();
            arIOData = await io.getGateway({ address: gatewayData.wallet });
            setArIOGatewayInfo(arIOData);
          } catch (err) {
            console.warn('Gateway not found in AR.IO network or lookup failed:', err);
            // This is expected for some gateways - they might not be registered in AR.IO
          }
        }

        // Fetch Arweave node info from gateway
        if (uploadData?.gateway) {
          try {
            const gatewayHost = uploadData.gateway.replace('https://', '');
            const arweaveResponse = await fetch(`https://${gatewayHost}/info`);
            arweaveNodeData = await arweaveResponse.json();
            setArweaveNodeInfo(arweaveNodeData);
          } catch (err) {
            console.warn('Failed to fetch Arweave node info:', err);
          }
        }

        // Compare fiat payment processing: Turbo's rate vs direct conversion
        try {
          console.log('🔍 Comparing Turbo payment processing vs direct rates...');
          const turbo = TurboFactory.unauthenticated(turboConfig);
          const gigabyteInBytes = 1073741824; // 1 GiB in bytes
          
          // Step 1: Get how much winc you get when you PAY Turbo $10 USD (includes their 23% fee)
          console.log('💳 Getting Turbo payment rate (includes processing fees)...');
          const turboPaymentRate = await turbo.getWincForFiat({
            amount: USD(10),
            promoCodes: []
          });
          const turboWincPer10USD = Number(turboPaymentRate.winc);
          const turboWincPer1USD = turboWincPer10USD / 10;
          
          console.log('💰 Turbo payment processing:', {
            '$10 gets': turboWincPer10USD,
            'Per $1': turboWincPer1USD,
            'Includes fees': turboPaymentRate.fees
          });
          
          // Step 2: Get gateway winc cost for 1 GiB (direct gateway call)
          let gatewayWincFor1GiB = undefined;
          if (uploadData?.gateway) {
            try {
              const gatewayHost = uploadData.gateway.replace('https://', '');
              const gatewayUrl = `https://${gatewayHost}/price/${gigabyteInBytes}`;
              console.log('📡 Fetching direct from gateway:', gatewayUrl);
              const response = await fetch(gatewayUrl);
              gatewayWincFor1GiB = await response.json();
              console.log('🌐 Direct gateway winc for 1 GiB:', gatewayWincFor1GiB);
              
              // Let's also check what gateway we're actually hitting
              console.log('🏗️ Gateway we are comparing against:', gatewayHost);
              
            } catch (err) {
              console.warn('❌ Gateway pricing fetch failed:', err);
            }
          } else {
            console.warn('❌ No gateway URL available from upload service');
          }
          
          // Step 3: Compare payment processing efficiency 
          let turboFeePercentage = undefined;
          let gatewayUSDPer1GiB = undefined;
          let turboUSDPer1GiB = undefined;
          
          if (gatewayWincFor1GiB && gatewayWincFor1GiB > 0 && turboWincPer1USD) {
            
            // Calculate how much USD you'd need to buy 1 GiB worth of winc
            // Through Turbo (with 23% payment processing fee)
            const usdNeededForGatewayWinc_ViaTurbo = gatewayWincFor1GiB / turboWincPer1USD;
            
            // Calculate what the rate WOULD BE without Turbo's 23% processing fee
            const turboWithoutFees = turboWincPer1USD * 1.23; // Add back the ~23% that Turbo removes
            const theoreticalDirectUSD = gatewayWincFor1GiB / turboWithoutFees;
            
            // Show the difference (should be ~23% markup)
            turboFeePercentage = ((usdNeededForGatewayWinc_ViaTurbo - theoreticalDirectUSD) / theoreticalDirectUSD) * 100;
            
            turboUSDPer1GiB = usdNeededForGatewayWinc_ViaTurbo;
            gatewayUSDPer1GiB = theoreticalDirectUSD;
            
            console.log('🧮 Payment processing comparison:', { 
              gatewayWincFor1GiB,
              turboWincPer1USD,
              turboPaymentProcessingUSD: usdNeededForGatewayWinc_ViaTurbo,
              theoreticalDirectUSD: theoreticalDirectUSD,
              turboPaymentProcessingFee: turboFeePercentage
            });
          }
          
          pricingData = {
            wincPerGiB: gatewayWincFor1GiB?.toString() || '0',
            usdPerGiB: turboUSDPer1GiB || 0,
            baseGatewayPrice: gatewayUSDPer1GiB,
            turboFeePercentage: turboFeePercentage,
          };
          
          console.log('💾 Final pricing comparison:', pricingData);
          setPricingInfo(pricingData);
        } catch (err) {
          console.warn('❌ Pricing calculation failed:', err);
        }

        // Cache the results
        const cacheData: CachedGatewayInfo = {
          data: {
            uploadServiceInfo: uploadData,
            gatewayInfo: gatewayData,
            arIOGatewayInfo: arIOData,
            pricingInfo: pricingData,
            arweaveNodeInfo: arweaveNodeData,
            peersInfo: peersData,
          },
          timestamp: Date.now(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('Gateway info cached for 10 minutes');

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch gateway information');
      } finally {
        setLoading(false);
      }
    };

    fetchGatewayInfo();
  }, [getCurrentConfig, turboConfig, cacheKey, configMode]);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    
    // Clear cache and refetch
    localStorage.removeItem(cacheKey);
    
    try {
      // Fetch all data fresh
      let uploadData = null;
      let gatewayData = null;
      let arIOData = null;
      let pricingDataRefresh = null;
      let arweaveNodeDataRefresh = null;
      let peersDataRefresh: PeersInfo | null = null;

      // Fetch upload service info
      try {
        const config = getCurrentConfig();
        const uploadResponse = await fetch(config.uploadServiceUrl);
        uploadData = await uploadResponse.json();
        setUploadServiceInfo(uploadData);
      } catch (err) {
        console.warn('Failed to fetch upload service info:', err);
      }

      // Fetch gateway info from configured AR.IO gateway
      const config = getCurrentConfig();
      const gatewayUrl = config.arioGatewayUrl.replace(/\/$/, ''); // Remove trailing slash
      try {
        const gatewayResponse = await fetch(`${gatewayUrl}/ar-io/info`);
        gatewayData = await gatewayResponse.json();
        setGatewayInfo(gatewayData);
      } catch (err) {
        console.warn('Failed to fetch gateway info:', err);
      }

      // Fetch peers info from configured gateway
      try {
        const peersResponse = await fetch(`${gatewayUrl}/ar-io/peers`);
        const peersRaw = await peersResponse.json();
        peersDataRefresh = {
          gatewayCount: Object.keys(peersRaw.gateways || {}).length,
          arweaveNodeCount: Object.keys(peersRaw.arweaveNodes || {}).length,
        };
        setPeersInfo(peersDataRefresh);
      } catch (err) {
        console.warn('Failed to fetch peers info:', err);
      }

      // Fetch AR.IO gateway info (if we have gateway wallet address)
      if (gatewayData?.wallet) {
        try {
          const { getARIO } = await import('../utils');
          const io = getARIO();
          arIOData = await io.getGateway({ address: gatewayData.wallet });
          setArIOGatewayInfo(arIOData);
        } catch (err) {
          console.warn('Gateway not found in AR.IO network or lookup failed:', err);
          // This is expected for some gateways - they might not be registered in AR.IO
        }
      }

      // Fetch Arweave node info from gateway
      if (uploadData?.gateway) {
        try {
          const gatewayHost = uploadData.gateway.replace('https://', '');
          const arweaveResponse = await fetch(`https://${gatewayHost}/info`);
          arweaveNodeDataRefresh = await arweaveResponse.json();
          setArweaveNodeInfo(arweaveNodeDataRefresh);
        } catch (err) {
          console.warn('Failed to fetch Arweave node info:', err);
        }
      }

      // Fetch pricing information (same logic as initial fetch)
      try {
        const turbo = TurboFactory.unauthenticated(turboConfig);
        const gigabyteInBytes = 1073741824; // 1 GiB in bytes

        // Get how much winc you get when you PAY Turbo $10 USD (includes their 23% fee)
        const turboPaymentRate = await turbo.getWincForFiat({
          amount: USD(10),
          promoCodes: []
        });
        const turboWincPer10USD = Number(turboPaymentRate.winc);
        const turboWincPer1USD = turboWincPer10USD / 10;

        // Get gateway winc cost for 1 GiB (direct gateway call)
        let gatewayWincFor1GiB = undefined;
        if (uploadData?.gateway) {
          try {
            const gatewayHost = uploadData.gateway.replace('https://', '');
            const response = await fetch(`https://${gatewayHost}/price/${gigabyteInBytes}`);
            gatewayWincFor1GiB = await response.json();
          } catch (err) {
            console.warn('Gateway pricing fetch failed:', err);
          }
        }

        // Calculate pricing
        let turboFeePercentage = undefined;
        let gatewayUSDPer1GiB = undefined;
        let turboUSDPer1GiB = undefined;

        if (gatewayWincFor1GiB && gatewayWincFor1GiB > 0 && turboWincPer1USD) {
          // Calculate how much USD you'd need to buy 1 GiB worth of winc through Turbo
          const usdNeededForGatewayWinc_ViaTurbo = gatewayWincFor1GiB / turboWincPer1USD;

          // Calculate what the rate WOULD BE without Turbo's ~23% processing fee
          const turboWithoutFees = turboWincPer1USD * 1.23;
          const theoreticalDirectUSD = gatewayWincFor1GiB / turboWithoutFees;

          turboFeePercentage = ((usdNeededForGatewayWinc_ViaTurbo - theoreticalDirectUSD) / theoreticalDirectUSD) * 100;
          turboUSDPer1GiB = usdNeededForGatewayWinc_ViaTurbo;
          gatewayUSDPer1GiB = theoreticalDirectUSD;
        }

        pricingDataRefresh = {
          wincPerGiB: gatewayWincFor1GiB?.toString() || '0',
          usdPerGiB: turboUSDPer1GiB || 0,
          baseGatewayPrice: gatewayUSDPer1GiB,
          turboFeePercentage: turboFeePercentage,
        };
        setPricingInfo(pricingDataRefresh);
      } catch (err) {
        console.warn('Failed to fetch pricing info:', err);
      }

      // Cache the fresh results
      const cacheData: CachedGatewayInfo = {
        data: {
          uploadServiceInfo: uploadData,
          gatewayInfo: gatewayData,
          arIOGatewayInfo: arIOData,
          pricingInfo: pricingDataRefresh,
          arweaveNodeInfo: arweaveNodeDataRefresh,
          peersInfo: peersDataRefresh,
        },
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh gateway information');
    } finally {
      setRefreshing(false);
    }
  };

  return {
    uploadServiceInfo,
    gatewayInfo,
    arIOGatewayInfo,
    pricingInfo,
    arweaveNodeInfo,
    peersInfo,
    loading,
    error,
    refreshing,
    refresh,
  };
}