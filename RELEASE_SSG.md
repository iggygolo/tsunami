# Release Static Site Generation (SSG) Implementation

## Overview

This implementation extends the existing static generation system to create pre-rendered HTML pages and individual cache files for single release pages, providing instant loading and better SEO.

## How It Works

### 1. **Build-Time Generation**

During `npm run build`, the system now generates:
- **Static HTML pages**: `/dist/releases/[id].html` with SEO metadata
- **Individual cache files**: `/dist/data/releases/[id].json` with release data
- **Server redirects**: `_redirects` and `.htaccess` for proper routing

### 2. **Cache-First Loading Strategy**

The `useReleaseData` hook now follows this priority:
1. **Static cache** (SSG) - Instant loading from `/data/releases/[id].json`
2. **Runtime cache** - From previous list navigation
3. **Network fetch** - Only as final fallback

### 3. **SEO-Optimized Routing**

- **Explicit routes**: `/releases/[id]` for better SEO and crawling
- **NIP-19 compatibility**: Still supports `/:naddr1` format
- **Static HTML**: Pre-rendered pages with metadata and structured data

## Generated Files

### Static HTML Pages (`/dist/releases/[id].html`)
```html
<title>Release Title - Artist Name</title>
<meta name="description" content="Release description" />
<meta property="og:title" content="Release Title - Artist Name" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MusicAlbum",
  "name": "Release Title",
  "datePublished": "2025-12-24T00:00:00.000Z",
  "byArtist": { "@type": "MusicGroup", "name": "Artist Name" }
}
</script>
```

### Individual Cache Files (`/dist/data/releases/[id].json`)
```json
{
  "release": {
    "id": "release-id",
    "title": "Release Title",
    "tracks": [...],
    "totalDuration": 210
  },
  "metadata": {
    "generatedAt": "2025-12-24T11:03:52.356Z",
    "releaseId": "release-id",
    "dataSource": "nostr"
  }
}
```

## Performance Benefits

1. **Instant Loading**: Static cache provides 0ms load time for cached releases
2. **Better SEO**: Pre-rendered HTML with proper metadata and structured data
3. **Reduced Network**: Eliminates duplicate fetching when navigating from lists
4. **Crawlable URLs**: Search engines can index `/releases/[id]` routes

## Implementation Files

### Build System
- `scripts/build-static-data.ts` - Extended with SSG generation
- `scripts/shared/nostr-data-fetcher.ts` - Unchanged data fetching

### Hooks & Caching
- `src/hooks/useStaticSingleReleaseCache.ts` - New static cache hook
- `src/hooks/useReleaseData.ts` - Enhanced with cache-first strategy
- `src/hooks/useStaticReleaseCache.ts` - Existing list cache (unchanged)

### Routing & Components
- `src/AppRouter.tsx` - Added `/releases/:releaseId` route
- `src/pages/NIP19Page.tsx` - Enhanced to handle both route formats
- `src/components/music/ReleaseCard.tsx` - Updated to use explicit routes

### Server Configuration
- `public/_redirects` - Netlify redirect rules
- `public/.htaccess` - Apache redirect rules

## Usage

### Automatic SSG
The SSG is automatic and transparent:

```bash
npm run build  # Generates static pages + cache files
```

### Cache-First Loading
```typescript
// Automatically uses static cache first, then runtime cache, then network
const { release, isLoading } = useReleaseData({ addressableEvent });
```

### SEO-Friendly URLs
```typescript
// Release cards now link to explicit routes
<Link to={`/releases/${releaseId}`}>Release Title</Link>
```

## Cache Strategy

- **Static cache**: Generated at build time, never expires
- **Runtime cache**: 5-minute stale time with background refresh
- **Fallback**: Network fetch if all caches miss
- **Scope**: Top 20 most recent releases get static generation

## Server Configuration

### Netlify
```
/releases/:id /releases/:id.html 200
/*    /index.html   200
```

### Apache
```apache
RewriteRule ^releases/([^/]+)/?$ /releases/$1.html [L]
RewriteRule . /index.html [L]
```

## Benefits Summary

- **Performance**: Instant loading for popular releases
- **SEO**: Better search engine indexing and social sharing
- **UX**: Seamless navigation with no loading states
- **Scalability**: Reduces server load by serving static files
- **Compatibility**: Maintains existing NIP-19 routing