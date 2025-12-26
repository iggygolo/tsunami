# Design Document

## Overview

This design implements dedicated navigation for Nostr music events, creating separate `TrackPage` and `ReleasePage` components with standardized URL patterns. The system replaces fragile navigation with reliable `/track/{pubkey}/{identifier}` and `/release/{pubkey}/{identifier}` URLs that directly resolve MUSIC_TRACK (36787) and RELEASE (34139) events.

## Architecture

### URL Structure
```
/track/{pubkey}/{identifier}    - Individual track pages (kind 36787)
/release/{pubkey}/{identifier}  - Release/playlist pages (kind 34139)
```

### Component Architecture
- `TrackPage` - Displays individual tracks with metadata, audio player, and playlist links
- `ReleasePage` - Displays releases with track listings and navigation
- `EventResolver` - Handles multi-relay event resolution with caching
- `PlaylistResolver` - Finds playlists containing specific tracks

### Data Flow
1. Router extracts pubkey/identifier from URL
2. EventResolver queries relays for addressable event
3. Data converted using existing `eventConversions.ts` functions
4. Page components render resolved data with cross-navigation

## Components and Interfaces

### TrackPage Component
```typescript
interface TrackPageProps {
  pubkey: string;
  identifier: string;
}
```
- Displays track metadata (title, artist, description, lyrics, credits)
- Integrated audio player
- Links to containing playlists
- Social interactions (zaps, likes, comments)

### ReleasePage Component  
```typescript
interface ReleasePageProps {
  pubkey: string;
  identifier: string;
}
```
- Displays release metadata and artwork
- Complete track listing with ordering
- Navigation to individual tracks
- Playlist-style playback controls

### EventResolver Hook
```typescript
function useEventResolver<T>(
  pubkey: string,
  kind: 36787 | 34139,
  identifier: string,
  converter: (event: NostrEvent) => T
): { data: T | null; isLoading: boolean; error: string | null }
```
- Multi-relay querying with parallel requests
- Retry logic with exponential backoff
- Caching with TTL
- Error handling

## Data Models

### Enhanced Navigation Data
```typescript
interface MusicTrackDataWithNavigation extends MusicTrackData {
  containingPlaylists?: MusicPlaylistData[];
}

interface MusicPlaylistDataWithNavigation extends MusicPlaylistData {
  resolvedTracks?: Map<string, MusicTrackData>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: URL Resolution Consistency
*For any* valid pubkey and identifier combination, accessing URLs in format `/track/{pubkey}/{identifier}` or `/release/{pubkey}/{identifier}` should correctly resolve the corresponding Nostr events with the appropriate kind (36787 for tracks, 34139 for releases)
**Validates: Requirements 1.1, 2.1**

### Property 2: URL Generation Standardization  
*For any* track or release data, the system should generate URLs that follow the exact format `/track/{pubkey}/{identifier}` for tracks and `/release/{pubkey}/{identifier}` for releases
**Validates: Requirements 1.3, 2.4, 4.1, 4.2**

### Property 3: URL Parsing Reliability
*For any* valid navigation URL, the system should correctly extract pubkey and identifier components and handle URL encoding/decoding properly
**Validates: Requirements 4.3, 4.4**

### Property 4: Complete Metadata Display
*For any* track or release page, when the event data is available, the page should display all required metadata fields including title, artist, description, and cover art
**Validates: Requirements 1.2, 2.2, 5.1, 6.1**

### Property 5: Audio Integration Consistency
*For any* track with available audio, the track page should provide integrated audio player controls, and for any release with playable tracks, the release page should provide playlist-style playback controls
**Validates: Requirements 5.2, 6.3**

### Property 6: Content Display Completeness
*For any* track with lyrics or credits, the track page should display them in readable format, and for any release with additional metadata, the release page should display credits and release notes
**Validates: Requirements 5.3, 5.4, 6.4**

### Property 7: Cross-Navigation Integrity
*For any* track that is part of playlists, the track page should show all containing playlists with navigation links and parent track references, and for any release with tracks, the release page should provide navigation to individual track pages
**Validates: Requirements 5.5, 6.5, 7.1, 7.2**

### Property 8: Multi-Relay Event Resolution
*For any* event resolution request, the system should query multiple relays in parallel and implement retry logic with exponential backoff when events are not found
**Validates: Requirements 3.1, 3.2**

### Property 9: Cache Invalidation Consistency
*For any* track or release event that is updated, the corresponding page should automatically reflect the latest version, and the system should implement appropriate cache invalidation strategies
**Validates: Requirements 1.5, 2.5, 3.4, 3.5**

### Property 10: Error Handling Completeness
*For any* error condition (invalid identifiers, network issues, corrupted data, missing events), the system should display appropriate error messages, provide meaningful loading states, and offer navigation back to main content areas
**Validates: Requirements 1.4, 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 11: Track Ordering Preservation
*For any* release with multiple tracks, the release page should display all tracks with proper ordering and complete metadata as specified in the playlist event
**Validates: Requirements 2.3, 6.2**

### Property 12: Parent Track References
*For any* track that is part of an album or collection, the track page should display reference to the parent release with navigation link
**Validates: Requirements 7.1, 7.2**

### Property 13: Performance Optimization Consistency
*For any* page loading scenario, the system should implement efficient caching, use parallel queries for faster resolution, implement progressive loading for large releases, and manage memory appropriately to prevent performance degradation
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

## Error Handling

### Event Resolution
- **Not Found**: Display "Track/Release Not Found" with navigation suggestions
- **Network Issues**: Show "Connection Issues" with manual retry option
- **Invalid Data**: Log errors and show "Content Unavailable" message

### URL Handling
- **Invalid Format**: Redirect to 404 page
- **Invalid Parameters**: Show validation error with format examples

### Cross-Navigation
- **Missing Playlists**: Hide broken references, show available only
- **Missing Tracks**: Show placeholder entries marked "Unavailable"

<function_calls>
<invoke name="prework">
<parameter name="featureName">nostr-navigation-rework