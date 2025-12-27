# Static Site Generation (SSG) System Guide

This document provides comprehensive guidance on Tsunami's Static Site Generation (SSG) system, which pre-builds cache files and RSS feeds for optimal performance and instant loading.

## Overview

Tsunami uses a sophisticated SSG system that fetches data from Nostr relays during build time and generates static cache files. This enables instant loading of recent releases, artist profiles, and RSS feeds without waiting for network requests.

## Architecture

### Build Process Flow

```
1. Fetch Data from Nostr Relays
   ↓
2. Validate & Convert Events
   ↓
3. Filter & Process Releases
   ↓
4. Generate Static Files
   ↓
5. Output to Both dist/ and public/
```

### Key Components

- **Data Fetcher** (`scripts/shared/nostr-data-fetcher.ts`) - Fetches from multiple Nostr relays
- **Build Script** (`scripts/build-static-data.ts`) - Orchestrates the entire build process
- **Event Conversions** (`src/lib/eventConversions.ts`) - Converts Nostr events to app data
- **Cache Hooks** (`src/hooks/useStaticReleaseCache.ts`) - Loads cached data in the app

## Generated Files

### Cache Files (JSON)

#### Main Cache Files
- **`data/releases.json`** - Top 20 releases with images (filtered for UI compatibility)
- **`data/latest-release.json`** - Single latest release (prefers releases with images)
- **`data/releases/[eventId].json`** - Individual release caches for direct access

#### Health Check Files
- **`rss-health.json`** - RSS system status and metadata
- **`cache-health.json`** - Cache system status and statistics
- **`rss-build-errors.json`** - Error log from RSS generation (if errors occur)

### RSS Feeds (XML)

#### Individual Artist Feeds
- **`rss/[artistPubkey].xml`** - RSS feed for each artist with RSS enabled
- Only generated for artists who have `rssEnabled: true` in their metadata
- Contains tracks and playlists in podcast-compatible format

## Dual Output System

All files are generated in **both** directories:

### Development (`public/`)
- Files served by Vite during development
- Enables instant loading during local development
- Updated by running `npm run dev:data`

### Production (`dist/`)
- Files included in production builds
- Deployed with the application
- Generated during `npm run build`

## Image Filtering Strategy

The SSG system implements intelligent image filtering to optimize cache efficiency:

### Release Cache Filtering
```typescript
// Only cache releases with images (required for main page display)
const releasesWithImages = releases.filter(release => release.imageUrl);
const cachedReleases = releasesWithImages.slice(0, 20);
```

### Latest Release Selection
```typescript
// Prefer releases with images for hero display
const releasesWithImages = releases.filter(release => release.imageUrl);
const latestRelease = releasesWithImages.length > 0 
  ? releasesWithImages[0] 
  : (releases.length > 0 ? releases[0] : null);
```

### Individual Cache Prioritization
```typescript
// Prioritize releases with images, fill remaining slots with others
const prioritizedReleases = [
  ...releasesWithImages.slice(0, 20),
  ...releasesWithoutImages.slice(0, Math.max(0, 20 - releasesWithImages.length))
].slice(0, 20);
```

## Cache Strategy in Application

### Loading Hierarchy
1. **Static Cache** (instant) - Load from `/data/releases.json`
2. **Background Refresh** (5-6 hours) - Update stale cache in background
3. **Live Data Fallback** (12+ hours) - Fetch from Nostr when cache is very old

### Cache Validation
```typescript
// Cache is considered stale after 6 hours
function isCacheStale(generatedAt: string): boolean {
  const cacheTime = new Date(generatedAt);
  const now = new Date();
  const sixHours = 6 * 60 * 60 * 1000;
  return (now.getTime() - cacheTime.getTime()) > sixHours;
}

// Prefer live data after 12 hours
function shouldPreferLiveData(generatedAt: string): boolean {
  const cacheTime = new Date(generatedAt);
  const now = new Date();
  const twelveHours = 12 * 60 * 60 * 1000;
  return (now.getTime() - cacheTime.getTime()) > twelveHours;
}
```

## Build Commands

### Development
```bash
# Generate static files for development
npm run dev:data
npx tsx scripts/build-static-data.ts

# Start development server (uses public/ files)
npm run dev
```

### Production
```bash
# Full production build (includes static generation)
npm run build

# Generate only static files
npm run build:data
```

## Multi-Relay Data Fetching

The system fetches from multiple Nostr relays for redundancy and completeness:

### Default Relays
- `wss://relay.primal.net`
- `wss://relay.damus.io`
- `wss://nos.lol`
- `wss://relay.ditto.pub`

### Fetching Strategy
```typescript
// Parallel queries to all relays with timeout
const relayPromises = relays.map(async ({url, relay}) => {
  return Promise.race([
    relay.query([{ kinds: [MUSIC_KINDS.MUSIC_PLAYLIST], limit: 100 }]),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout for ${url}`)), 15000)
    )
  ]);
});
```

### Deduplication
- Events are deduplicated by `pubkey:identifier` combination
- Latest version of each addressable event is kept
- Edit events properly replace original events

## RSS Generation

### Artist Control
- Artists enable/disable RSS in their profile metadata
- Only artists with `rssEnabled: true` get RSS feeds generated
- RSS feeds include both tracks and playlists

### RSS Format
- Podcast-compatible RSS 2.0 format
- Each track/playlist becomes a podcast episode
- Includes audio URLs, descriptions, and metadata
- Orange-themed RSS UI elements throughout the app

### Error Handling
- Comprehensive validation of generated RSS content
- Fallback RSS generation for failed feeds
- Error logging to `rss-build-errors.json`

## Performance Optimizations

### Build Time
- Parallel generation of all file types
- Individual error handling (one failure doesn't stop others)
- Efficient deduplication algorithms
- Timeout handling for network requests

### Runtime
- Cache-first loading strategy
- Background refresh for stale data
- Conditional queries (only fetch when needed)
- Smart filtering reduces unnecessary processing

### Memory Management
- Map-based lookups for efficient track resolution
- Streaming file writes for large datasets
- Proper cleanup of network connections
- Garbage collection friendly data structures

## Monitoring and Health Checks

### Health Check Endpoints
```json
// /cache-health.json
{
  "status": "ok",
  "endpoints": {
    "releases": "/data/releases.json",
    "latestRelease": "/data/latest-release.json"
  },
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "cacheCount": 16,
  "artistCount": 17,
  "dataSource": {
    "releases": "nostr",
    "relays": ["wss://relay.primal.net", "..."]
  }
}
```

### Build Logging
- Detailed console output during build
- Performance timing for each phase
- Error summaries with artist-specific details
- Statistics on filtered vs total content

## Troubleshooting

### Common Issues

#### Cache Not Loading
1. Check if files exist in `public/data/` (development) or `dist/data/` (production)
2. Verify file permissions and accessibility
3. Check browser network tab for 404 errors
4. Ensure build completed successfully

#### Stale Data
1. Check `generatedAt` timestamp in cache metadata
2. Run `npm run dev:data` to regenerate files
3. Verify Nostr relay connectivity
4. Check for build errors in console output

#### Missing Releases
1. Verify releases have images (required for main cache)
2. Check if events exist on configured relays
3. Validate event format using `validateMusicPlaylist()`
4. Ensure track references in playlists are resolvable

#### RSS Issues
1. Check if artist has `rssEnabled: true` in metadata
2. Verify RSS XML validation passes
3. Check `rss-build-errors.json` for specific errors
4. Ensure artist has tracks or playlists to include

### Debug Commands
```bash
# Check cache file contents
cat public/data/releases.json | jq '.metadata'

# Verify dual output
ls -la dist/data/ public/data/

# Check RSS generation
ls -la dist/rss/ public/rss/

# View build errors
cat dist/rss-build-errors.json | jq '.'
```

## Best Practices

### When Modifying SSG System

1. **Always test dual output** - Ensure files appear in both `dist/` and `public/`
2. **Maintain backward compatibility** - Don't break existing cache file formats
3. **Add comprehensive logging** - Help debug issues in production
4. **Handle errors gracefully** - One failure shouldn't stop entire build
5. **Test with real Nostr data** - Use actual relay data for testing

### When Adding New Cache Types

1. **Use the helper function** - `writeToMultipleDirectories()` for dual output
2. **Add to health checks** - Include new endpoints in health check files
3. **Document the format** - Add interface definitions and examples
4. **Consider filtering** - Apply appropriate filters for UI requirements
5. **Add corresponding hooks** - Create React hooks to consume the cache

### When Debugging Build Issues

1. **Check relay connectivity** - Ensure relays are accessible
2. **Validate event formats** - Use validation functions from `eventConversions.ts`
3. **Monitor memory usage** - Large datasets can cause memory issues
4. **Check file permissions** - Ensure write access to output directories
5. **Review error logs** - Check both console output and error files

## Integration with React Application

### Cache Loading Hooks
```typescript
// Load main releases cache
const { data: releases, isLoading, isStale } = useStaticReleaseCache();

// Load latest release
const { data: latestRelease } = useLatestReleaseCache();

// Load recent releases (filtered)
const { data: recentReleases } = useRecentReleases({
  limit: 5,
  excludeLatest: true,
  requireImages: true
});
```

### Fallback Strategy
```typescript
// Smart fallback from cache to live data
const shouldUseLiveData = !cachedData || isStale || cacheError;
const { data: liveData } = useReleases({
  enabled: shouldUseLiveData
});
```

### Background Refresh
```typescript
// Automatic background refresh for stale cache
const { data: backgroundData } = useQuery({
  queryKey: ['background-refresh', cacheTimestamp],
  queryFn: fetchLiveData,
  enabled: isStale && !shouldUseLiveData,
  staleTime: 300000 // 5 minutes
});
```

## Future Enhancements

### Potential Improvements
- **Incremental builds** - Only regenerate changed data
- **CDN integration** - Serve cache files from CDN
- **Compression** - Gzip cache files for smaller sizes
- **Versioning** - Cache versioning for better invalidation
- **Analytics** - Track cache hit rates and performance

### Scalability Considerations
- **Pagination** - Handle large numbers of releases
- **Sharding** - Split cache files by artist or date
- **Streaming** - Stream large datasets instead of loading in memory
- **Caching layers** - Multiple levels of caching (memory, disk, CDN)

This SSG system provides the foundation for Tsunami's fast, reliable content delivery while maintaining the decentralized nature of Nostr-based data storage.

## Trending Tracks SSG Implementation

### Shared Algorithm Approach

The trending tracks system uses a **shared algorithm** (`src/lib/trendingAlgorithm.ts`) to ensure complete consistency between static generation and live components:

#### Key Components
- **Shared Algorithm** (`src/lib/trendingAlgorithm.ts`) - Single source of truth for trending calculations
- **Build Script Integration** (`scripts/build-static-data.ts`) - Uses shared algorithm for cache generation
- **Live Component Hook** (`src/hooks/useTrendingTracks.ts`) - Uses same shared algorithm
- **Static Cache Hook** (`src/hooks/useStaticTrendingTracksCache.ts`) - Loads cached data with live fallback

#### Consistency Guarantees
- **Same Limit**: Both cache and live component use `TRENDING_CONFIG.DEFAULT_LIMIT` (8 tracks)
- **Same Algorithm**: Identical trending score calculation (60% zap amounts, 25% zap count, 15% recency)
- **Same Filtering**: Artist diversity filter (max 2 tracks per artist) applied identically
- **Same Sorting**: Trending score with date fallback for tracks with no engagement

#### Configuration Constants
```typescript
export const TRENDING_CONFIG = {
  DEFAULT_LIMIT: 8,
  MAX_PER_ARTIST: 2,
  RECENCY_WINDOW_DAYS: 7,
  WEIGHTS: {
    ZAP_AMOUNT: 0.6,
    ZAP_COUNT: 0.25,
    RECENCY: 0.15
  }
} as const;
```

### Cache Generation Process

1. **Fetch all tracks** from Nostr relays during build
2. **Apply shared algorithm** using `processTrendingTracks()`
3. **Generate exactly 8 tracks** (same as live component)
4. **Cache to both directories** (`dist/` and `public/`)
5. **Include algorithm metadata** for transparency and debugging

### Runtime Behavior

1. **Cache-first loading** - Instant display from `/data/trending-tracks.json`
2. **Live fallback** - Uses same algorithm when cache unavailable
3. **Background refresh** - Updates stale cache (10-minute threshold)
4. **Consistent results** - Same tracks in same order regardless of data source