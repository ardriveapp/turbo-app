# Dynamic FREE Upload Limit Implementation

## Summary

Successfully implemented dynamic free upload limit functionality based on the bundler's actual `freeUploadLimitBytes` configuration. The app now fetches the free limit from the bundler's info endpoint and uses it throughout the application instead of hardcoded values.

## Changes Made

### 1. Store Updates (`src/store/useStore.ts`)
- Added `freeUploadLimitBytes: number` state (defaults to 0)
- Added `setFreeUploadLimitBytes(limitBytes: number)` action
- Added to persist configuration for caching across sessions

### 2. New Hook (`src/hooks/useFreeUploadLimit.ts`)
Created a comprehensive hook with three exports:

```typescript
// Fetches and syncs bundler's free upload limit
useFreeUploadLimit(): number

// Utility to check if a file is free
isFileFree(fileSize: number, freeLimit: number): boolean

// Format free limit for display
formatFreeLimit(limitBytes: number): string
```

**Key Features:**
- Automatically fetches from the upload service URL
- Updates when bundler configuration changes in Developer Resources
- Defaults to 0 bytes if fetch fails or value not present
- Logs the limit to console for debugging

### 3. Components Updated

All upload/deploy flows now use dynamic free limit:

#### Upload & Deploy Panels
- ✅ `src/components/panels/UploadPanel.tsx`
  - Dynamic free limit check in `calculateUploadCost()`
  - Dynamic text: "Files under {formatFreeLimit()} are FREE"
  - File list shows FREE badge dynamically
  - Upload history displays FREE dynamically

- ✅ `src/components/panels/DeploySitePanel.tsx`
  - Dynamic free limit in `calculateTotalCost()`
  - File list FREE badges use dynamic limit
  - Deployment history displays FREE dynamically

- ✅ `src/components/panels/CapturePanel.tsx`
  - Dynamic free limit in `calculateUploadCost()`
  - Capture history displays FREE dynamically

#### Pages
- ✅ `src/pages/RecentDeploymentsPage.tsx`
  - Deployment file list uses dynamic FREE check

#### App Initialization
- ✅ `src/App.tsx`
  - Hook called in `AppRoutes()` to initialize on app startup
  - Ensures limit is fetched early and cached

### 4. Unchanged (Already Correct)
- `src/hooks/useUploadStatus.ts` - Already checks `winc === 0` (bundler-reported)
- Static marketing text pages (FAQ, Landing, Calculator) - Can be updated separately if needed

## How It Works

### Bundler Info Endpoint
The app fetches from the upload service URL (e.g., `https://upload.ardrive.io`):

```json
{
  "version": "0.2.0",
  "addresses": { ... },
  "gateway": "https://arweave.net",
  "freeUploadLimitBytes": 107520
}
```

### Bundler Configuration Changes
When the user changes the bundler in **Developer Resources**:
1. The `uploadServiceUrl` changes in the store
2. `useFreeUploadLimit` hook's `useEffect` triggers (depends on `getCurrentConfig`)
3. New bundler info is fetched
4. `freeUploadLimitBytes` is updated in the store
5. All components using the hook automatically get the new value

### Default Behavior
- If bundler doesn't provide `freeUploadLimitBytes`: defaults to **0 bytes** (no free tier)
- If fetch fails: defaults to **0 bytes** and logs warning
- **This ensures the app never incorrectly shows "FREE" when there is no free tier**

## Testing Instructions

### Test 1: Default Bundler (ArDrive Production)
1. Start app: `npm run dev`
2. Check browser console for log: `"Bundler free upload limit: 107520 bytes (105.00 KiB)"`
3. Navigate to Upload Files page
4. Verify text says: "Files under 105 KiB are FREE"
5. Add a 100 KiB file - should show "• FREE" badge
6. Add a 110 KiB file - should show credit cost (not free)

### Test 2: Different Bundler
1. Navigate to Developer Resources
2. Change Upload Service URL to a different bundler
3. Check console for new log with different free limit
4. Verify Upload/Deploy pages reflect the new limit

### Test 3: Bundler Without Free Tier
1. Change Upload Service URL to a test endpoint that returns no `freeUploadLimitBytes`
2. Check console warning: "defaulting to 0 free bytes"
3. Verify Upload page no longer shows FREE text
4. Verify all files show credit costs (none show FREE)

### Test 4: Configuration Switching
1. Navigate to Developer Resources
2. Switch between Production/Development/Custom modes
3. Verify free limit updates each time
4. Check that upload pages reflect changes immediately

### Test 5: Persistence
1. Upload a file under the free limit
2. Refresh the page
3. Verify the free limit is still correct (persisted in localStorage)
4. Verify upload history still shows "FREE" for the uploaded file

## Files Modified

### New Files
- `src/hooks/useFreeUploadLimit.ts` (new hook)

### Modified Files
- `src/store/useStore.ts` (added state and action)
- `src/components/panels/UploadPanel.tsx`
- `src/components/panels/DeploySitePanel.tsx`
- `src/components/panels/CapturePanel.tsx`
- `src/pages/RecentDeploymentsPage.tsx`
- `src/App.tsx` (initialize on startup)

## Benefits

1. **Accurate**: Always reflects actual bundler configuration
2. **Dynamic**: Updates automatically when bundler changes
3. **Safe**: Defaults to 0 bytes (no false "FREE" claims)
4. **Cached**: Free limit persisted in store for performance
5. **Debuggable**: Console logs show current limit
6. **Maintainable**: Single source of truth in the hook

## Future Enhancements

- Update static text in FAQ, Calculator, and Landing pages to be dynamic
- Add UI indicator showing current free limit in header/footer
- Add bundler info panel showing all bundler capabilities
- Support different free limits per token type (if bundlers implement this)
