import { useState, useEffect } from 'react';
import { mARIOToken } from '@ar.io/sdk';
import { useCreditsForFiat } from './useCreditsForFiat';
import { getARIO } from '../utils';

interface ArNSPricingTier {
  characterLength: number;
  displayName: string;
  pricesInCredits: {
    year1: number;
    year2: number;
    year3: number;
    year4: number;
    year5: number;
    permabuy: number;
  };
  pricesInUSD: {
    year1: number;
    year2: number;
    year3: number;
    year4: number;
    year5: number;
    permabuy: number;
  };
  pricesInARIO: {
    year1: number;
    year2: number;
    year3: number;
    year4: number;
    year5: number;
    permabuy: number;
  };
  category: 'premium' | 'standard' | 'budget';
  description: string;
}

interface ArNSPricingCache {
  tiers: ArNSPricingTier[];
  demandFactor: number;
  arioUSDPrice: number;
  timestamp: number;
  creditsPerUSDAtCache: number; // Store the conversion rate used for cache
}

interface ArNSAffordabilityOption {
  tier: ArNSPricingTier;
  maxYears: number;
  totalCostCredits: number;
  totalCostUSD: number;
  remainingCredits: number;
  recommendedName: string; // Example name for this character length
}

export interface UseArNSPricingReturn {
  pricingTiers: ArNSPricingTier[];
  getAffordableOptions: (credits: number) => ArNSAffordabilityOption[];
  getBestDomainForBudget: (credits: number) => ArNSAffordabilityOption | null;
  getPriceForName: (name: string, type: 'lease' | 'permabuy', years?: number) => Promise<{ ario: number; usd: number; credits: number } | null>;
  loading: boolean;
  error: string | null;
  demandFactor: number;
}

// Sample names for different character lengths to show users examples
const SAMPLE_NAMES_BY_LENGTH: Record<number, string[]> = {
  1: ['a', 'x', 'z'],
  2: ['ai', 'go', 'io'],
  3: ['app', 'web', 'dev'],
  4: ['tech', 'code', 'data'],
  5: ['turbo', 'drive', 'cloud'],
  8: ['myawesomeapp', 'blockchain', 'developer'],
  13: ['mycompanyname', 'longerdomainname', 'superlongappname']
};

// Cache key and duration
const ARNS_PRICING_CACHE_KEY = 'arns-pricing-cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache like ArNS names

function getCategoryForLength(length: number): { category: 'premium' | 'standard' | 'budget', description: string } {
  if (length <= 3) return { category: 'premium', description: `Ultra-premium ${length} character${length > 1 ? 's' : ''}` };
  if (length <= 8) return { category: 'standard', description: `Standard length (${length} chars)` };
  return { category: 'budget', description: `Budget friendly (${length}+ chars)` };
}

// Cache management functions
function getCachedPricing(): ArNSPricingCache | null {
  try {
    const cached = localStorage.getItem(ARNS_PRICING_CACHE_KEY);
    if (!cached) return null;
    
    const data: ArNSPricingCache = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - data.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(ARNS_PRICING_CACHE_KEY);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to read ArNS pricing cache:', error);
    localStorage.removeItem(ARNS_PRICING_CACHE_KEY);
    return null;
  }
}

function setCachedPricing(cache: ArNSPricingCache): void {
  try {
    localStorage.setItem(ARNS_PRICING_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to cache ArNS pricing:', error);
  }
}

export function useArNSPricing(): UseArNSPricingReturn {
  const [pricingTiers, setPricingTiers] = useState<ArNSPricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demandFactor, setDemandFactor] = useState(1);
  
  // Get conversion rate from USD to Turbo credits
  const [creditsPerUSD] = useCreditsForFiat(1, () => {});

  const getPriceForName = async (name: string, type: 'lease' | 'permabuy', years: number = 1): Promise<{ ario: number; usd: number; credits: number } | null> => {
    try {
      const ario = getARIO();
      
      // Get the token cost for buying this name
      const cost = await ario.getTokenCost({
        intent: 'Buy-Name',
        name,
        type,
        ...(type === 'lease' ? { years } : {})
      });

      // Convert from mARIO to ARIO
      const arioTokens = new mARIOToken(cost).toARIO().valueOf();
      
      // Note: We'd need ARIO price in USD to convert properly
      // For now, let's use a rough estimate or fetch from CoinGecko
      const usd = 0; // TODO: Fetch ARIO price from CoinGecko
      const credits = creditsPerUSD ? usd / creditsPerUSD : 0;

      return { ario: arioTokens, usd, credits };
    } catch (err) {
      console.error('Failed to get price for name:', err);
      return null;
    }
  };

  const getAffordableOptions = (credits: number): ArNSAffordabilityOption[] => {
    if (credits <= 0 || !creditsPerUSD) return [];
    
    const options: ArNSAffordabilityOption[] = [];

    // Check each pricing tier
    pricingTiers.forEach(tier => {
      
      // Find the maximum years they can afford for this character length
      let maxYears = 0;
      let totalCostCredits = 0;
      
      for (let years = 1; years <= 5; years++) {
        const yearKey = `year${years}` as keyof typeof tier.pricesInCredits;
        const cost = tier.pricesInCredits[yearKey];
        if (cost <= credits && cost > 0) {
          maxYears = years;
          totalCostCredits = cost;
        } else if (cost > 0) {
          break;
        }
      }

      if (maxYears > 0) {
        const yearKey = `year${maxYears}` as keyof typeof tier.pricesInUSD;
        const totalCostUSD = tier.pricesInUSD[yearKey];
        const remainingCredits = credits - totalCostCredits;
        const sampleNames = SAMPLE_NAMES_BY_LENGTH[tier.characterLength] || [];
        const recommendedName = sampleNames[0] || `${tier.characterLength}-char-name`;
        
        options.push({
          tier,
          maxYears,
          totalCostCredits,
          totalCostUSD,
          remainingCredits,
          recommendedName
        });
      }
    });

    // Sort by character length (shortest/most premium first)
    return options.sort((a, b) => a.tier.characterLength - b.tier.characterLength);
  };

  const getBestDomainForBudget = (credits: number): ArNSAffordabilityOption | null => {
    const options = getAffordableOptions(credits);
    if (options.length === 0) return null;
    
    // Return the longest domain they can afford (best value)
    return options[options.length - 1];
  };

  useEffect(() => {
    const loadPricing = async () => {
      if (!creditsPerUSD) return;
      
      setLoading(true);
      setError(null);

      try {
        // First, check if we have valid cached data
        const cachedData = getCachedPricing();
        
        // If cache is valid and the credits conversion rate hasn't changed much (within 5%)
        if (cachedData && Math.abs(cachedData.creditsPerUSDAtCache - creditsPerUSD) / creditsPerUSD < 0.05) {
          console.log('Using cached ArNS pricing data');
          
          // Recalculate credit prices with current conversion rate if needed
          const updatedTiers = cachedData.tiers.map(tier => ({
            ...tier,
            pricesInCredits: {
              year1: tier.pricesInUSD.year1 / creditsPerUSD, // USD / (credits per USD) = credits needed
              year2: tier.pricesInUSD.year2 / creditsPerUSD,
              year3: tier.pricesInUSD.year3 / creditsPerUSD,
              year4: tier.pricesInUSD.year4 / creditsPerUSD,
              year5: tier.pricesInUSD.year5 / creditsPerUSD,
              permabuy: tier.pricesInUSD.permabuy / creditsPerUSD,
            }
          }));
          
          setPricingTiers(updatedTiers);
          setDemandFactor(cachedData.demandFactor);
          setLoading(false);
          return;
        }

        console.log('Fetching fresh ArNS pricing data');
        const ario = getARIO();
        
        // Get the current demand factor once
        const currentDemandFactor = await ario.getDemandFactor();
        setDemandFactor(currentDemandFactor);

        // Use the more efficient approach from the example - get all fees at once
        // This uses the same method as the ARNS-REGISTRATION-FEES-EXAMPLE.js
        const CU_ENDPOINT = "https://cu.ardrive.io/dry-run?process-id=qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE";
        
        const fetchCUMessage = async (action: string): Promise<string> => {
          const res = await fetch(CU_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Id: "1234",
              Target: "qNvAoz0TgcH7DMg8BCVn8jF32QH5L6T29VjHxhHqqGE",
              Owner: "1234",
              Anchor: "0",
              Data: "1234",
              Tags: [
                { name: "Action", value: action },
                { name: "Data-Protocol", value: "ao" },
                { name: "Type", value: "Message" },
                { name: "Variant", value: "ao.TN.1" },
              ],
            }),
          });
          const json = await res.json();
          return json.Messages?.[0]?.Data;
        };

        // Fetch ARIO price and registration fees in parallel - much more efficient!
        const COINGECKO_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price?ids=ar-io-network&vs_currencies=usd";
        const [arioUSDPrice, feesRaw] = await Promise.all([
          fetch(COINGECKO_ENDPOINT).then(res => res.json()).then(data => data["ar-io-network"].usd),
          fetchCUMessage("Registration-Fees")
        ]);

        if (!arioUSDPrice || arioUSDPrice <= 0) {
          throw new Error('Failed to fetch ARIO price from CoinGecko');
        }

        const fees = JSON.parse(feesRaw);
        const tiers: ArNSPricingTier[] = [];

        // Process the fee structure (similar to the example file)
        const sortedKeys = Object.keys(fees)
          .map(Number)
          .sort((a, b) => a - b);

        let seenLongForm = false;
        for (const key of sortedKeys) {
          if (key > 12) {
            if (seenLongForm) continue;
            seenLongForm = true;
          }
          
          const characterLength = key > 12 ? 13 : key;
          const displayName = key > 12 ? '13+ characters' : `${key} character${key > 1 ? 's' : ''}`;
          const lease = fees[key].lease;
          const permabuy = fees[key].permabuy;
          
          // Convert mARIO to ARIO, then to USD with demand factor
          const formatPrice = (mARIO: number) => {
            const ario = (mARIO / 1e6) * currentDemandFactor;
            const usd = ario * arioUSDPrice;
            return { ario, usd };
          };

          const year1 = formatPrice(lease['1']);
          const year2 = formatPrice(lease['2']);
          const year3 = formatPrice(lease['3']);
          const year4 = formatPrice(lease['4']);
          const year5 = formatPrice(lease['5']);
          const permabuyPrice = formatPrice(permabuy);

          const { category, description } = getCategoryForLength(characterLength);
          
          tiers.push({
            characterLength,
            displayName,
            pricesInARIO: {
              year1: year1.ario,
              year2: year2.ario,
              year3: year3.ario,
              year4: year4.ario,
              year5: year5.ario,
              permabuy: permabuyPrice.ario,
            },
            pricesInUSD: {
              year1: year1.usd,
              year2: year2.usd,
              year3: year3.usd,
              year4: year4.usd,
              year5: year5.usd,
              permabuy: permabuyPrice.usd,
            },
            pricesInCredits: {
              year1: year1.usd / creditsPerUSD, // USD / (credits per USD) = credits needed
              year2: year2.usd / creditsPerUSD,
              year3: year3.usd / creditsPerUSD,
              year4: year4.usd / creditsPerUSD,
              year5: year5.usd / creditsPerUSD,
              permabuy: permabuyPrice.usd / creditsPerUSD,
            },
            category,
            description: key > 12 ? 'Budget friendly (13+ chars)' : description,
          });
        }

        setPricingTiers(tiers);
        
        // Cache the pricing data for future use
        setCachedPricing({
          tiers,
          demandFactor: currentDemandFactor,
          arioUSDPrice,
          timestamp: Date.now(),
          creditsPerUSDAtCache: creditsPerUSD
        });
        
        console.log('ArNS pricing cached for 1 hour');
      } catch (err) {
        console.error('Failed to load ArNS pricing:', err);
        setError('Failed to load ArNS pricing data');
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
  }, [creditsPerUSD]); // Re-run when credit conversion rate changes

  return {
    pricingTiers,
    getAffordableOptions,
    getBestDomainForBudget,
    getPriceForName,
    loading,
    error,
    demandFactor
  };
}