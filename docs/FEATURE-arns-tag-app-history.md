# Feature: ArNS Tag & App History

**Status:** Planned
**Created:** 2025-12-17

## Overview

Add an `ArNS-Name` tag to manifest transactions when associating with an ArNS name. This enables querying Arweave to discover all deployments a user has made, providing cross-device history recovery and an "App History" feature.

## Tag Format

```
ArNS-Name: blog_myapp    (with undername)
ArNS-Name: myapp         (root name only)
```

Format: `{undername}_{rootname}` when undername exists, otherwise just `{rootname}`.

## Benefits

1. **Cross-device recovery** - Deployment history lives on-chain, not just localStorage
2. **Discoverability** - GraphQL query finds all named deployments for a wallet
3. **App versioning history** - Combined with `App-Name`/`App-Version` tags, complete deployment timeline
4. **Portfolio feature** - "View all my deployed apps" from chain data

## Tradeoffs

1. **Privacy** - ArNS ↔ wallet association becomes permanent and public
2. **Stale data** - ArNS can be repointed; tag captures moment-in-time, not current state
3. **One-way binding** - Manifest knows its ArNS name, but name might later point elsewhere

## GraphQL Query Strategy

Cannot query by tag name alone - need name + value. Query all manifests by owner, then filter client-side:

```graphql
query GetUserDeployments($owner: String!) {
  transactions(
    owners: [$owner],
    tags: [
      { name: "Content-Type", values: ["application/x.arweave-manifest+json"] }
    ]
    first: 100
  ) {
    edges {
      node {
        id
        block { timestamp height }
        tags { name value }
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
```

Client-side parsing extracts:
- `App-Name` tag → app name
- `App-Version` tag → version
- `ArNS-Name` tag → associated ArNS name
- `Deployed-By` / `Deployed-By-Version` → deployment tool info

## Data Comparison: Local vs Chain

| Field | Local (recent) | Chain (historical) |
|-------|---------------|-------------------|
| Manifest ID | ✓ | ✓ |
| File list + sizes | ✓ Full detail | ✗ (need extra fetch) |
| Receipts | ✓ | ✗ |
| App Name/Version | ✓ | ✓ (from tags) |
| ArNS Name | ✓ | ✓ (from tag) |
| Timestamp | ✓ Exact | ✓ Block time |
| Upload status | ✓ | ✗ |

Historical deployments (chain-only) show simpler cards with "Loaded from Arweave" badge.

## Implementation Plan

### Phase 1: Add the ArNS-Name tag

**Files to modify:**
- `src/hooks/useFolderUpload.ts`

**Changes:**
- When building manifest tags, check if ArNS association exists
- If yes, add `ArNS-Name` tag with value `{undername}_{rootname}` or `{rootname}`

**Location in code:**
```typescript
// In deployFolder function, where manifest tags are built
// Around line 870-920 where manifest is created

// Add after other tags:
if (arnsName) {
  const arnsTagValue = undername ? `${undername}_${arnsName}` : arnsName;
  manifestTags.push({ name: 'ArNS-Name', value: arnsTagValue });
}
```

**Risk:** Low - additive change only

---

### Phase 2: GraphQL query hook

**New file:** `src/hooks/useArweaveDeployments.ts`

```typescript
interface ArweaveDeployment {
  manifestId: string;
  timestamp: number; // from block
  appName?: string;
  appVersion?: string;
  arnsName?: string;
  deployedBy?: string;
  deployedByVersion?: string;
}

interface UseArweaveDeploymentsResult {
  deployments: ArweaveDeployment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useArweaveDeployments(
  ownerAddress: string | null
): UseArweaveDeploymentsResult {
  // Query Arweave GraphQL
  // Parse tags from results
  // Return structured data
  // Cache results to avoid repeated queries
}
```

**GraphQL endpoint:** `https://arweave.net/graphql` or configurable gateway

---

### Phase 3: Merge & display on /deployments

**Files to modify:**
- `src/pages/RecentDeploymentsPage.tsx`

**Changes:**
1. Add "Load from Arweave" button (or auto-load option)
2. Call `useArweaveDeployments(address)`
3. Merge chain data with localStorage `deployHistory`
4. Dedupe by manifest ID (prefer local data when both exist)
5. Add visual indicator for chain-loaded entries

**UI mockup:**
```
┌─────────────────────────────────────────────────┐
│ Your Site Deployments                           │
│ 5 sites deployed    [Load from Arweave] [Clear] │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ 📦 MyApp v2.0.0           myapp.ar.io      │ │
│ │ Dec 17, 2025 • 45 files • 2.3 MB           │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📦 MyApp v1.0.0      [From Arweave]        │ │
│ │ Nov 3, 2025 • manifest only                │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

### Phase 4: App History view (optional enhancement)

Group deployments by `App-Name` to show version timeline:

```
┌─────────────────────────────────────────────────┐
│ App History                                     │
├─────────────────────────────────────────────────┤
│ MyApp                                    ▼      │
│   v2.0.0  Dec 17, 2025  myapp.ar.io  [Visit]   │
│   v1.1.0  Dec 1, 2025   myapp.ar.io  [Visit]   │
│   v1.0.0  Nov 3, 2025   myapp.ar.io  [Visit]   │
├─────────────────────────────────────────────────┤
│ Portfolio Site                           ▼      │
│   v1.0.0  Oct 15, 2025  portfolio.ar.io [Visit]│
└─────────────────────────────────────────────────┘
```

---

## Open Questions

1. **Auto-load or manual?**
   - Auto-load on /deployments page visit?
   - Or require "Load from Arweave" button click?
   - Recommendation: Button first, can add auto-load setting later

2. **Pagination?**
   - GraphQL returns paginated results
   - Need to handle users with many deployments
   - Lazy load older deployments?

3. **Caching strategy?**
   - How long to cache chain query results?
   - Store in localStorage or just memory?
   - Recommendation: Memory cache for session, localStorage for persistence

4. **Gateway selection?**
   - Use arweave.net or user's configured gateway?
   - Consider goldsky or other indexers for faster queries

---

## Files Reference

**Existing files to modify:**
- `src/hooks/useFolderUpload.ts` - Add ArNS-Name tag
- `src/pages/RecentDeploymentsPage.tsx` - Merge chain data, new UI

**New files to create:**
- `src/hooks/useArweaveDeployments.ts` - GraphQL query hook

**Related existing code:**
- `src/store/useStore.ts` - `deployHistory` state
- `src/components/account/RecentDeploymentsSection.tsx` - May need similar updates
