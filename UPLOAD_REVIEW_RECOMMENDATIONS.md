# Upload Page Implementation - Senior Review & Recommendations

## Critical Issues Identified

### 1. Incorrect Signer Implementation
**Current Issue**: Using custom signer wrapper instead of SDK's built-in signers
**Impact**: Unreliable uploads, poor error handling, missing wallet support
**Priority**: CRITICAL

### 2. Wallet Discrimination
**Current Issue**: Hardcoded blocking of Ethereum/Solana wallets
**Impact**: Users can't upload files with 66%+ of connected wallets
**Priority**: CRITICAL

### 3. Missing Injected Wallet Support
**Current Issue**: No implementation for browser-injected wallets
**Impact**: SDK supports these, but we don't use them
**Priority**: HIGH

## Recommended Implementation

### Updated Upload Hook Structure

```typescript
import { 
  ArconnectSigner, 
  InjectedEthereumSigner, 
  InjectedSolanaSigner,
  TurboFactory 
} from '@ardrive/turbo-sdk/web';

export function useFileUpload() {
  const { address, walletType } = useStore();

  const createTurboClient = useCallback(async () => {
    if (!address || !walletType) {
      throw new Error('Wallet not connected');
    }

    let signer;
    
    switch (walletType) {
      case 'arweave':
        if (!window.arweaveWallet) {
          throw new Error('Wander wallet not available');
        }
        signer = new ArconnectSigner(window.arweaveWallet);
        break;
        
      case 'ethereum':
        if (!window.ethereum) {
          throw new Error('Ethereum wallet not available');
        }
        signer = new InjectedEthereumSigner(window.ethereum);
        break;
        
      case 'solana':
        if (!window.solana) {
          throw new Error('Solana wallet not available');
        }
        signer = new InjectedSolanaSigner(window.solana);
        break;
        
      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }

    return TurboFactory.authenticated({ 
      ...turboConfig,
      signer 
    });
  }, [address, walletType]);

  const uploadFile = useCallback(async (file: File) => {
    const turbo = await createTurboClient();
    
    const result = await turbo.uploadFile({
      file,
      dataItemOpts: {
        tags: [
          { name: 'Content-Type', value: file.type || 'application/octet-stream' },
          { name: 'File-Name', value: file.name }
        ]
      },
      events: {
        onProgress: ({ totalBytes, processedBytes, step }) => {
          const percentage = Math.round((processedBytes / totalBytes) * 100);
          setUploadProgress(prev => ({ ...prev, [file.name]: percentage }));
        },
        onError: ({ error }) => {
          console.error(`Upload error for ${file.name}:`, error);
          throw error;
        },
        onSuccess: () => {
          console.log(`Upload successful for ${file.name}`);
        }
      }
    });

    return result;
  }, [createTurboClient]);

  // ... rest of implementation
}
```

### Type Definitions Updates

Add proper window interface for Solana:

```typescript
interface Window {
  arweaveWallet?: {
    // ... existing ArConnect interface
  };
  ethereum?: {
    // ... existing Ethereum interface  
  };
  solana?: {
    connect(): Promise<{ publicKey: { toString(): string } }>;
    disconnect(): Promise<void>;
    signTransaction(transaction: any): Promise<any>;
    signAllTransactions(transactions: any[]): Promise<any[]>;
    signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
    publicKey?: { toString(): string };
    isConnected?: boolean;
  };
}
```

### Updated Upload Panel

Remove wallet type discrimination:

```typescript
// REMOVE THIS BLOCK:
{address && walletType !== 'arweave' && (
  <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
    <div className="flex items-center gap-2 mb-2">
      <Shield className="w-5 h-5 text-yellow-500" />
      <span className="font-medium text-yellow-500">Arweave Wallet Required</span>
    </div>
    <p className="text-sm text-link">
      File uploads require an Arweave wallet (Wander). Your current {walletType} wallet cannot sign data items for permanent storage.
      Please connect an Arweave wallet to upload files.
    </p>
  </div>
)}

// UPDATE BUTTON:
disabled={uploading || files.length === 0} // Remove walletType check
```

## Implementation Priority

### Phase 1 (Immediate - Same Day)
1. Update import statements to use proper SDK signers
2. Implement `createTurboClient` function with wallet type switching
3. Remove wallet discrimination in UI
4. Add Solana window interface types

### Phase 2 (Next Day)  
1. Add comprehensive error handling for each wallet type
2. Implement wallet-specific connection validation
3. Add loading states for wallet connection
4. Test with all three wallet types

### Phase 3 (Following Day)
1. Add wallet-specific upload optimization
2. Implement retry logic for failed uploads
3. Add progress indicators for large files
4. Performance testing and optimization

## Testing Strategy

### Unit Tests Needed
- [ ] Signer creation for each wallet type
- [ ] Error handling for missing wallet extensions
- [ ] Upload progress tracking
- [ ] File validation and preprocessing

### Integration Tests Needed
- [ ] End-to-end upload with Wander wallet
- [ ] End-to-end upload with MetaMask
- [ ] End-to-end upload with Phantom
- [ ] Large file upload testing
- [ ] Multiple file upload testing

### Manual Testing Checklist
- [ ] Connect with Wander → Upload single file
- [ ] Connect with MetaMask → Upload single file  
- [ ] Connect with Phantom → Upload single file
- [ ] Test file size limits (100KB free tier)
- [ ] Test upload cancellation
- [ ] Test network error handling

## Risk Assessment

### High Risk
- **Current upload failure rate**: ~100% for non-Arweave wallets
- **User experience**: Extremely poor - users can't complete primary action
- **Business impact**: Loss of user engagement and trust

### Medium Risk  
- **Development complexity**: Moderate - well-documented SDK patterns
- **Testing overhead**: Requires multiple wallet types
- **Rollback complexity**: Can fallback to Arweave-only if needed

### Low Risk
- **SDK compatibility**: Turbo SDK is stable and well-maintained
- **Breaking changes**: Minimal - mostly additive changes
- **Performance impact**: Negligible - using official SDK patterns

## Success Metrics

### Technical Metrics
- Upload success rate > 95% across all wallet types
- Average upload time < 30s for files under 1MB
- Error rate < 2% for valid file uploads
- Zero wallet type discrimination errors

### User Experience Metrics
- Time to first successful upload < 2 minutes
- User retention after first upload > 80%
- Support tickets related to uploads < 5/month
- User satisfaction score > 4.0/5.0

## Conclusion

The current upload implementation has fundamental architectural flaws that prevent it from working with 2 out of 3 supported wallet types. This is a critical issue that should be addressed immediately. 

The recommended solution leverages the Turbo SDK's built-in signer architecture, which is the official and supported approach. Implementation should take 2-3 days with proper testing.

**Recommendation: Implement immediately with Phase 1 changes today.**