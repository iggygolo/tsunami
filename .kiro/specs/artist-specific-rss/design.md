# Design Document

## Overview

Transform the RSS system from a single global feed to individual artist-specific feeds. Artists control RSS generation through a simple toggle in their settings, with feeds generated during static build and served as static files.

## Architecture

### Current System
- Single global RSS feed with all artists' content
- Runtime RSS generation via `useRSSFeedGenerator` hook
- Global RSS navigation links

### New System
- Individual RSS feeds per artist at `/rss/{artistPubkey}.xml`
- RSS toggle in artist settings stored in Nostr metadata
- RSS generation during static build process only
- RSS badges on artist pages when enabled

### Data Flow
```
Artist Settings → Nostr Metadata → Build Process → Static RSS Files → Artist Pages
```

## Components and Interfaces

### 1. Artist Metadata Extension
Add RSS toggle to existing artist metadata:

```typescript
interface ArtistMetadata {
  // ... existing fields
  rssEnabled: boolean; // Simple boolean toggle
}
```

### 2. RSS Settings UI
Add toggle to existing ArtistSettings component:

```typescript
// Simple toggle in existing settings form
<Switch 
  checked={formData.rssEnabled} 
  onCheckedChange={(enabled) => setFormData({...formData, rssEnabled: enabled})}
/>
```

### 3. Artist RSS Badge
Simple badge component for artist pages:

```typescript
interface ArtistRSSBadgeProps {
  artistPubkey: string;
  enabled: boolean;
}
```

### 4. Build Process Update
Modify existing build script to generate per-artist RSS:

```typescript
async function generateArtistRSSFeeds(
  artists: ArtistWithMetadata[],
  tracks: MusicTrackData[],
  playlists: MusicPlaylistData[],
  distDir: string
): Promise<void>
```

## Data Models

### Simplified RSS Settings
```typescript
// Just add to existing ArtistMetadata
interface ArtistMetadata {
  // ... existing fields
  rssEnabled: boolean;
}
```

### Metadata Event Update
```json
{
  "kind": 34139,
  "content": {
    "artist": "Artist Name",
    // ... existing fields
    "rssEnabled": true
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: RSS Settings Persistence
*For any* artist, updating RSS enabled/disabled setting should persist in Nostr metadata and be retrievable
**Validates: Requirements 1.2, 1.3, 5.1**

### Property 2: RSS Default State
*For any* new artist without existing RSS settings, RSS should default to disabled
**Validates: Requirements 1.5, 5.5**

### Property 3: Conditional RSS Generation
*For any* artist, RSS files should be generated during build if and only if RSS is enabled
**Validates: Requirements 2.2, 2.3**

### Property 4: Artist Content Filtering
*For any* generated RSS feed, it should contain only that artist's tracks and releases
**Validates: Requirements 2.4, 7.1**

### Property 5: RSS File Path Format
*For any* artist with RSS enabled, the RSS file should be accessible at `/rss/{artistPubkey}.xml`
**Validates: Requirements 2.5, 3.6**

### Property 6: RSS Format Compliance
*For any* generated RSS feed, it should be valid RSS XML with required elements
**Validates: Requirements 2.6, 7.2**

### Property 7: Artist Page RSS Display
*For any* artist page, RSS badge should be visible if and only if RSS is enabled for that artist
**Validates: Requirements 3.1, 3.4**

## Error Handling

- Handle missing RSS settings gracefully (default to disabled)
- Continue build process if individual RSS generation fails
- Provide clear error messages for RSS setting updates
- Handle malformed artist metadata gracefully

## Testing Strategy

### Unit Tests
- Test RSS toggle functionality in settings
- Test RSS badge display logic
- Test migration notice content
- Test error handling scenarios

### Property-Based Tests
- Test RSS settings persistence across random metadata
- Test RSS generation with various artist content combinations
- Test RSS format compliance with different data inputs
- Minimum 100 iterations per property test
- Tag format: `Feature: artist-specific-rss, Property {number}: {property_text}`