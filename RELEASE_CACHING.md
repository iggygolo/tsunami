# Release Data Caching Implementation

## Overview

This implementation adds intelligent caching to eliminate the need to re-fetch and re-resolve track data when navigating from the releases list to individual release pages.

## How It Works

### 1. List-Level Caching (`useReleases`)

When the releases list is loaded:
- Fetches all playlist events and resolves their tracks
- **Caches individual release data** for each release:
  - Release event data (`release-event` cache key)
  - Resolved track data (`playlist-track-resolution` cache key)  
  - Converted release objects (`release-conversion` cache key)

### 2. Individual Release Loading (`useReleaseData`)

When navigating to a specific release page:
- **Checks cache first** using `initialData` in React Query
- If cached data exists, loads **instantly** without network requests
- Only falls back to network fetching if cache misses occur

### 3. Prefetching (`useReleasePrefetch`)

For even better performance:
- **Hover prefetching** on release cards
- Preloads release event data when user hovers over links
- Provides near-instant navigation experience

## Cache Keys

```typescript
// Release event cache
['release-event', `${pubkey}:${kind}:${identifier}`]

// Track resolution cache  
['playlist-track-resolution', JSON.stringify(trackReferences)]

// Converted release cache
['release-conversion', eventId, resolvedTracksLength]
```

## Benefits

1. **Instant Navigation**: Releases load immediately when clicking from the list
2. **Reduced Network Requests**: Eliminates duplicate fetching of the same data
3. **Better UX**: No loading spinners when navigating between cached releases
4. **Efficient**: Only fetches data once, reuses across components

## Cache Invalidation

- **Stale Time**: 5 minutes for all cached data
- **Garbage Collection**: 30 minutes for track resolution data
- **Automatic**: React Query handles cache invalidation and cleanup

## Implementation Files

- `src/hooks/useReleaseData.ts` - Individual release cache checking
- `src/hooks/usePlaylistTrackResolution.ts` - Track resolution caching
- `src/hooks/useReleasePrefetch.ts` - Hover prefetching
- `src/components/music/ReleaseCard.tsx` - Prefetch integration

## Usage

The caching is automatic and transparent:

```typescript
// In releases list - automatically caches data
const { data: releases } = useReleases();

// In individual release page - automatically uses cache
const { release, isLoading } = useReleaseData({ addressableEvent });

// Hover prefetching - automatic on release cards
<ReleaseCard release={release} /> // Prefetches on hover
```

## Performance Impact

- **Before**: Each release page navigation required 2-3 network requests + track resolution
- **After**: Cached releases load instantly with 0 network requests
- **Prefetching**: Hover-triggered prefetching makes navigation feel instantaneous