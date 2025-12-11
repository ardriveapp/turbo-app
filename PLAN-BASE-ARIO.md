# Implementation Plan: Base ARIO Token Support - COMPLETED

## Overview

Add support for `base-ario` token type - ARIO tokens bridged to Base L2 network. This enables Ethereum wallet users to pay with ARIO tokens on Base, benefiting from fast L2 confirmations and low gas fees.

**Token Characteristics:**
- Token Type: `base-ario`
- Network: Base (L2)
- Chain IDs: 8453 (mainnet), 84532 (testnet/sepolia)
- Decimals/Exponent: 6 (same as ARIO on AO - 1 ARIO = 1,000,000 mARIO)
- Contract Type: ERC-20 on Base
- Behavior: Similar to `base-usdc` (ERC-20 on Base), but uses standard Turbo SDK pricing (not X402)

**Status: COMPLETED**
- [x] Base ARIO contract address: `0x138746adfA52909E5920def027f5a8dc1C7EfFb6`
- [x] Turbo SDK `@ardrive/turbo-sdk@1.39.0-alpha.1` supports `base-ario` token type

---

## Files to Modify (18 files)

### 1. Constants & Type Definitions

#### `src/constants.ts`
- [ ] Add `'base-ario'` to `supportedCryptoTokens` array (line ~57)
- [ ] Add to `tokenLabels`: `'base-ario': 'ARIO (Base)'`
- [ ] Add to `tokenNetworkLabels`: `'base-ario': 'ARIO on Base Network'`
- [ ] Add to `tokenNetworkDescriptions`: `'base-ario': 'ARIO tokens bridged to Base Layer 2 network'`
- [ ] Add to `tokenProcessingTimes`:
  ```typescript
  'base-ario': {
    time: 'near instant-3 minutes',
    speed: 'fast',
    description: 'ARIO on Base L2 offers faster confirmation times'
  }
  ```
- [ ] Add to `BUTTON_VALUES`: `'base-ario': [50, 100, 500, 1000]` (same as ario)
- [ ] Add `BASE_ARIO_CONFIG` constant:
  ```typescript
  export const BASE_ARIO_CONFIG = {
    chainIds: {
      production: 8453,  // Base Mainnet
      development: 84532, // Base Sepolia
    },
    contractAddresses: {
      production: 'TBD', // NEED FROM AR.IO TEAM
      development: 'TBD', // NEED FROM AR.IO TEAM
    },
    decimals: 6, // 1 ARIO = 1,000,000 mARIO
  } as const;
  ```

### 2. Store & Configuration

#### `src/store/useStore.ts`
- [ ] Add to `PRESET_CONFIGS.production.tokenMap`:
  ```typescript
  'base-ario': 'https://mainnet.base.org',
  ```
- [ ] Add to `PRESET_CONFIGS.development.tokenMap`:
  ```typescript
  'base-ario': 'https://sepolia.base.org',
  ```
- [ ] Add to `jitMaxTokenAmount` default state:
  ```typescript
  'base-ario': 200,  // 200 ARIO ≈ $20 at $0.10/ARIO
  ```

### 3. JIT Payment Utilities

#### `src/utils/jitPayment.ts`
- [ ] Add to `supportsJitPayment()` function (line ~7-9):
  ```typescript
  return tokenType === 'ario' || tokenType === 'solana' || tokenType === 'base-eth' || tokenType === 'base-usdc' || tokenType === 'base-ario';
  ```
- [ ] Add to `TOKEN_DECIMALS` in `getTokenConverter()` (line ~16):
  ```typescript
  'base-ario': 6,  // 1 ARIO = 1,000,000 mARIO
  ```
- [ ] Add to `TOKEN_DECIMALS` in `fromSmallestUnit()` (line ~37):
  ```typescript
  'base-ario': 6,
  ```
- [ ] Add to `precision` in `formatTokenAmount()` (line ~67):
  ```typescript
  'base-ario': 2,  // 100.50 ARIO
  ```
- [ ] Add to `defaults` in `getDefaultMaxTokenAmount()` (line ~299):
  ```typescript
  'base-ario': 200,  // 200 ARIO ≈ $20 at $0.10/ARIO
  ```
- [ ] In `calculateRequiredTokenAmount()`, base-ario should use **standard Turbo SDK pricing** (not X402), so no special handling needed - it falls through to the `else` branch at line ~209

### 4. Token Balance Hook

#### `src/hooks/useTokenBalance.ts`
- [ ] Add `fetchBaseArioBalance` function (after `fetchBaseUsdcBalance`):
  ```typescript
  const fetchBaseArioBalance = useCallback(async (ethAddress: string): Promise<{ readable: number; smallest: number }> => {
    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check current network (same chain IDs as base-usdc)
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const expectedChainId = configMode === 'development'
        ? X402_CONFIG.chainIds.development  // 84532
        : X402_CONFIG.chainIds.production;   // 8453

      if (currentChainId !== expectedChainId) {
        const networkName = configMode === 'development' ? 'Base Sepolia' : 'Base';
        throw new Error(`Please switch to ${networkName} network to view balance`);
      }

      // Get Base ARIO contract address
      const { BASE_ARIO_CONFIG } = await import('../constants');
      const arioAddress = configMode === 'development'
        ? BASE_ARIO_CONFIG.contractAddresses.development
        : BASE_ARIO_CONFIG.contractAddresses.production;

      // Create contract instance
      const contract = new ethers.Contract(arioAddress, ERC20_ABI, provider);

      // Fetch balance
      const balanceInSmallest = await contract.balanceOf(ethAddress);
      const balanceInArio = Number(ethers.formatUnits(balanceInSmallest, 6)); // ARIO uses 6 decimals
      const balanceInSmallestNumber = Number(balanceInSmallest);

      return {
        readable: balanceInArio,
        smallest: balanceInSmallestNumber,
      };
    } catch (err: any) {
      console.error('Failed to fetch BASE-ARIO balance:', err);
      throw err;
    }
  }, [configMode]);
  ```
- [ ] Add case in `fetchBalance()` switch statement:
  ```typescript
  case 'base-ario':
    result = await fetchBaseArioBalance(address);
    break;
  ```
- [ ] Add `fetchBaseArioBalance` to the `useCallback` dependency array

### 5. Pricing Hooks

#### `src/hooks/useWincForOneGiB.ts`
- [ ] Add case in `getAmountByTokenType()` function:
  ```typescript
  case 'base-ario':
    return ARIOToTokenAmount(amount); // Use same conversion as ario (6 decimals)
  ```
- [ ] Update USDC-style check if needed (around line ~113) - but base-ario should use SDK method, not special pricing

#### `src/hooks/useCryptoPrice.ts`
- [ ] Add case in `getTokenSmallestUnit()`:
  ```typescript
  case 'base-ario':
    return BigInt(10 ** 6);  // 1 ARIO = 1,000,000 mARIO
  ```

### 6. TopUp Panel

#### `src/components/panels/TopUpPanel.tsx`
- [ ] Add case in `getCryptoPresets()` (line ~169):
  ```typescript
  case 'base-ario': return [50, 100, 500, 1000];
  ```
- [ ] Update `getAvailableTokens()` for ethereum wallet (line ~351):
  ```typescript
  case 'ethereum':
    return ['ario', 'base-ario', 'base-usdc', 'base-eth', 'usdc', 'polygon-usdc', 'pol', 'ethereum'];
  ```
- [ ] Add case in `getWalletRequirementMessage()` (line ~367):
  ```typescript
  case 'base-ario':
    return 'Connect an Ethereum wallet (like MetaMask) to pay with ARIO on Base L2';
  ```

### 7. Crypto Confirmation Panel

#### `src/components/panels/crypto/CryptoConfirmationPanel.tsx`
- [ ] Update `canPayDirectly` logic (line ~91):
  ```typescript
  (walletType === 'ethereum' && (tokenType === 'ethereum' || tokenType === 'base-eth' || tokenType === 'pol' || tokenType === 'usdc' || tokenType === 'base-usdc' || tokenType === 'base-ario' || tokenType === 'polygon-usdc' || tokenType === 'ario'))
  ```
- [ ] Update payment handling condition (line ~210):
  ```typescript
  } else if (walletType === 'ethereum' && (tokenType === 'ethereum' || tokenType === 'base-eth' || tokenType === 'pol' || tokenType === 'usdc' || tokenType === 'base-usdc' || tokenType === 'base-ario' || tokenType === 'polygon-usdc'))
  ```
- [ ] Add network detection for base-ario (uses same chain IDs as base-usdc):
  ```typescript
  : (tokenType === 'base-eth' || tokenType === 'base-usdc' || tokenType === 'base-ario')
  ? (isDevMode ? 84532 : 8453) // Base Sepolia : Base mainnet
  ```
- [ ] Add token amount conversion for base-ario:
  ```typescript
  } else if (tokenType === 'base-ario') {
    // Base ARIO uses 6 decimals (same as ARIO on AO)
    tokenAmount = (cryptoAmount * 1e6).toString();
  }
  ```

### 8. JIT Token Selector

#### `src/components/JitTokenSelector.tsx`
- [ ] Update `getAvailableTokens()` for ethereum wallet:
  ```typescript
  if (walletType === 'ethereum') {
    // Ethereum wallets: BASE-USDC (x402), BASE-ARIO, and BASE-ETH (regular JIT)
    return ['base-usdc', 'base-ario', 'base-eth'];
  }
  ```
- [ ] Update display label if needed:
  ```typescript
  {token === 'base-usdc' ? 'USDC (Base) with x402'
    : token === 'base-ario' ? 'ARIO (Base)'
    : tokenLabels[token]}
  ```

### 9. Upload/Deploy/Capture Panels

#### `src/components/panels/UploadPanel.tsx`
- [ ] If base-ario does NOT use X402 (expected), no changes needed for x402 checks
- [ ] If base-ario should appear in JIT token selection, the JitTokenSelector component handles it

#### `src/components/panels/DeploySitePanel.tsx`
- [ ] Same as UploadPanel - JitTokenSelector handles token selection

#### `src/components/panels/CapturePanel.tsx`
- [ ] Same as UploadPanel - JitTokenSelector handles token selection

### 10. Payment Flow Hook

#### `src/hooks/usePaymentFlow.ts`
- [ ] Consider updating default token for Ethereum users:
  ```typescript
  const [selectedJitToken, setSelectedJitToken] = useState<SupportedTokenType>(() => {
    if (walletType === 'arweave') return 'ario';
    if (walletType === 'solana') return 'solana';
    return 'base-ario';  // Change default for Ethereum - use base-ario instead of base-eth
  });
  ```

### 11. File/Folder Upload Hooks

#### `src/hooks/useFileUpload.ts`
- [ ] If base-ario does NOT use X402, no changes needed to x402 checks
- [ ] The hook already handles JIT payments via the `selectedJitToken` parameter

#### `src/hooks/useFolderUpload.ts`
- [ ] Same as useFileUpload - no changes needed if base-ario doesn't use X402

### 12. Utility Functions

#### `src/utils/index.ts`
- [ ] Add case in `getExplorerUrl()` for transaction links:
  ```typescript
  case 'base-ario':
    return `https://basescan.org/tx/${txid}`;
  ```
- [ ] Consider if `getTokenTypeFromChainId()` needs updating (probably not - returns 'base-eth' for Base chain, which is fine for chain detection)

### 13. Pricing Calculator

#### `src/components/panels/PricingCalculatorPanel.tsx`
- [ ] Ensure base-ario appears in token selection for pricing display
- [ ] May need to update token list if it filters tokens

---

## Feature Support Summary

| Feature | base-ario |
|---------|-----------|
| Buy Credits (Crypto Topup) | Yes |
| Direct Wallet Payment | Yes (via Ethereum wallet + ERC-20 transfer) |
| JIT Payments | Yes |
| X402 Protocol | No (uses standard Turbo SDK pricing) |
| Balance Checking | Yes (ERC-20 contract balanceOf) |
| Network Auto-Switch | Yes (to Base) |
| Token Presets | [50, 100, 500, 1000] |
| Decimal Places Display | 2 |
| Processing Time | Near instant - 3 minutes (fast) |

---

## Key Implementation Notes

1. **Similar to base-usdc**: Both are ERC-20 tokens on Base network, use same chain IDs, same RPC URLs
2. **Different from base-usdc**: base-ario uses standard Turbo SDK pricing, NOT X402 protocol
3. **Same as ario**: Uses 6 decimals, same preset amounts, same display precision
4. **Payment flow**: Uses `walletAdapter` pattern (like base-eth/base-usdc), NOT `InjectedEthereumSigner` (which is for ARIO on AO)
5. **Default for Ethereum users**: Consider making base-ario the default JIT token for Ethereum wallets

---

## Testing Checklist

- [ ] Token appears in TopUp token selector dropdown
- [ ] Token appears in JIT payment token selector
- [ ] Balance fetching works on Base network
- [ ] Price conversion via Turbo SDK works
- [ ] JIT payment calculation works correctly
- [ ] Network auto-switching to Base works
- [ ] Top-up payment flow completes successfully
- [ ] JIT payment during upload works
- [ ] JIT payment during deploy works
- [ ] JIT payment during capture works
- [ ] Storage calculator shows correct pricing in base-ario
- [ ] Token presets work correctly
- [ ] Cross-wallet top-ups work with base-ario
- [ ] Block explorer links work correctly
- [ ] Error messages are appropriate for base-ario

---

## Dependencies

- Turbo SDK must support `base-ario` token type
- AR.IO team must provide Base ARIO contract addresses
- Base ARIO must be bridged and available on Base mainnet/testnet

---

## Estimated Scope

- **Files to modify**: 18
- **New functions**: 1 (fetchBaseArioBalance)
- **New constants**: 1 (BASE_ARIO_CONFIG)
- **Type changes**: SupportedTokenType union type auto-updates from constants.ts
