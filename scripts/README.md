# Build Scripts

This directory contains the build scripts for generating static data from Nostr relays.

## Unified Build System

The build system has been refactored to use a single data fetch from Nostr relays to generate both RSS feeds and static cache files, eliminating duplicate network requests and ensuring data consistency.

### Main Scripts

#### `build-static-data.ts`
The main unified build script that:
- Fetches data from Nostr relays **once**
- Generates RSS feed (`dist/rss.xml`)
- Generates static cache files (`dist/data/releases.json`, `dist/data/latest-release.json`)
- Creates health check files
- Ensures data consistency across all outputs

#### `shared/nostr-data-fetcher.ts`
Shared module that handles all Nostr data fetching:
- Connects to multiple relays for better coverage
- Fetches tracks, playlists, and metadata in parallel
- Handles deduplication and error recovery
- Returns a unified data bundle

### Usage

```bash
# Full build (includes Vite build + static data)
npm run build

# Generate only static data (RSS + cache)
npm run build:data
```

### Generated Files

The build process creates:

```
dist/
├── rss.xml                    # RSS feed for podcast apps
├── data/
│   ├── releases.json          # Cache of latest 20 releases
│   └── latest-release.json    # Cache of most recent release
├── rss-health.json           # RSS feed health check
├── cache-health.json         # Cache health check
└── .nojekyll                 # GitHub Pages compatibility
```

### Benefits

1. **Single Data Fetch**: Eliminates duplicate network requests to Nostr relays
2. **Data Consistency**: RSS and cache files use identical data
3. **Better Performance**: Parallel generation of all outputs
4. **Error Resilience**: Fallback mechanisms for failed requests
5. **Health Monitoring**: Built-in health checks for all endpoints

### Environment Variables

The build script reads configuration from environment variables:

- `VITE_ARTIST_NPUB` - Artist's Nostr public key (required)
- `VITE_ARTIST_NAME` - Artist display name
- `VITE_MUSIC_DESCRIPTION` - Podcast/feed description
- `VITE_ARTIST_IMAGE` - Artist image URL
- `VITE_ARTIST_WEBSITE` - Artist website URL
- And many more (see `.env.example`)

### Legacy Scripts

The old separate scripts (`build-rss.ts` and `build-ssg.ts`) have been replaced by the unified system. They can be safely removed once the new system is verified to work correctly.