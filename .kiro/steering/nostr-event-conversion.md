# Nostr Event Conversion and Data Fetching Guidelines

This document provides comprehensive guidance on how event conversion and track/release data fetching works in the Tsunami music application, which uses Nostr as its decentralized backend.

## Overview

Tsunami uses Nostr (Notes and Other Stuff Transmitted by Relays) as a decentralized protocol for storing and retrieving music metadata. The application implements modern Nostr music event kinds and provides robust conversion between Nostr events and application data structures.

## Core Event Types

### Music Track Events (Kind 36787)
Individual addressable music tracks with comprehensive metadata.

**Required Tags:**
- `d` - Unique identifier for the track
- `title` - Track title
- `artist` - Artist name
- `url` - Direct URL to audio file
- `t` - Must include "music" tag

**Optional Tags:**
- `album` - Album name
- `track_number` - Position in album
- `released` - Release date (ISO 8601)
- `duration` - Track length in seconds
- `format` - Audio format (mp3, flac, m4a, ogg)
- `bitrate` - Audio bitrate
- `sample_rate` - Sample rate in Hz
- `image` - Album artwork URL
- `video` - Music video URL
- `language` - ISO 639-1 language code
- `explicit` - "true" for explicit content
- `t` - Additional genre tags
- `zap` - Lightning payment splits

### Music Playlist Events (Kind 34139)
Collections of music tracks with ordering and metadata.

**Required Tags:**
- `d` - Unique identifier for the playlist
- `title` - Playlist title
- `a` - Track references (format: `36787:pubkey:identifier`)

**Optional Tags:**
- `description` - Playlist description
- `image` - Playlist cover art URL
- `t` - Category/genre tags (excluding required "playlist" tag)

## Centralized Event Conversion

All event conversion logic is centralized in `src/lib/eventConversions.ts` to ensure consistency and maintainability.

### Key Functions

#### `validateMusicTrack(event: NostrEvent): boolean`
Validates that a Nostr event is a properly formatted music track.

```typescript
// Checks for required tags, validates URLs, and ensures music tag exists
const isValid = validateMusicTrack(event);
```

#### `validateMusicPlaylist(event: NostrEvent): boolean`
Validates that a Nostr event is a properly formatted music playlist.

```typescript
// Checks for required tags and validates track references
const isValid = validateMusicPlaylist(event);
```

#### `eventToMusicTrack(event: NostrEvent): MusicTrackData`
Converts a validated music track event to application data structure.

```typescript
// Parses all tags, content sections, and zap splits
const track = eventToMusicTrack(event);
```

#### `eventToMusicPlaylist(event: NostrEvent): MusicPlaylistData`
Converts a validated music playlist event to application data structure.

```typescript
// Extracts track references and metadata
const playlist = eventToMusicPlaylist(event);
```

#### `playlistToRelease(playlist: MusicPlaylistData, tracks: Map<string, MusicTrackData>): MusicRelease`
Converts playlist and resolved tracks to legacy release format for UI compatibility.

```typescript
// Combines playlist metadata with resolved track data
const release = playlistToRelease(playlist, tracksMap);
```

### Content Parsing

The conversion functions intelligently parse event content for structured data:

```typescript
// Content sections are parsed automatically:
// - First unlabeled section: description
// - "Lyrics:" section: track lyrics
// - "Credits:" section: production credits
```

### Zap Splits Parsing

Lightning payment splits are extracted from `zap` tags:

```typescript
// Format: ["zap", "address", "percentage"]
// Supports both Lightning addresses and node pubkeys
const zapSplits = event.tags
  .filter(([key]) => key === 'zap')
  .map(([, address, percentage]) => ({
    address,
    percentage: parseFloat(percentage || '0'),
    type: address.includes('@') ? 'lnaddress' : 'node'
  }));
```

## Data Fetching Hooks

### Track Fetching

#### `useMusicTracks(options?)`
Fetches all music tracks by the configured artist.

```typescript
const { data: tracks, isLoading } = useMusicTracks({
  limit: 100,
  sortBy: 'date', // 'date' | 'title' | 'album'
  sortOrder: 'desc' // 'asc' | 'desc'
});
```

**Features:**
- Automatic validation and deduplication
- Configurable sorting options
- Caching with 5-minute stale time
- Error handling and retry logic

#### `useMusicTrack(identifier)`
Fetches a single music track by identifier.

```typescript
const { data: track, isLoading } = useMusicTrack('track-identifier');
```

### Playlist Fetching

#### `useMusicPlaylists(options?)`
Fetches all music playlists by the configured artist.

```typescript
const { data: playlists, isLoading } = useMusicPlaylists({
  limit: 50,
  sortBy: 'date', // 'date' | 'title' | 'tracks'
  sortOrder: 'desc',
  includePrivate: false
});
```

#### `usePlaylistTrackResolution(trackReferences)`
Resolves track references in playlists to full track data.

```typescript
const { data: resolvedTracks } = usePlaylistTrackResolution(playlist.tracks);
```

### Release Data Integration

#### `useReleaseData({ eventId?, addressableEvent? })`
Unified hook for fetching release data with multiple fallback strategies.

```typescript
const { release, event, isLoading } = useReleaseData({
  addressableEvent: { pubkey, kind: 34139, identifier }
});
```

**Caching Strategy:**
1. Static cache from SSG build (instant loading)
2. Runtime cache from previous queries
3. Network requests as fallback

## Deduplication and Versioning

### Addressable Event Deduplication

Addressable events (tracks and playlists) can be updated, so the system automatically deduplicates by identifier and keeps the latest version:

```typescript
const deduplicatedEvents = deduplicateEventsByIdentifier(
  validEvents, 
  getEventIdentifier
);
```

### Edit Event Handling

The system supports edit events and properly excludes original events that have been edited:

```typescript
// Automatically handled in deduplication
const isEdit = isEditEvent(event);
const originalId = getOriginalEventId(event);
```

## Image Resolution Hierarchy

Track and release images follow a clear fallback hierarchy:

### For Individual Tracks:
1. **Primary**: Individual track image (`track.imageUrl`)
2. **Secondary**: Release/album artwork (`release.imageUrl`)
3. **Tertiary**: Music icon placeholder

### Implementation:
```typescript
// TrackList component automatically handles this hierarchy
{track.imageUrl ? (
  <img src={track.imageUrl} alt={`${track.title} artwork`} />
) : release.imageUrl ? (
  <img src={release.imageUrl} alt={`${release.title} artwork`} />
) : (
  <MusicIcon />
)}
```

## Error Handling and Validation

### Validation Pipeline

1. **Event Kind Check**: Verify correct Nostr event kind
2. **Required Tags**: Ensure all required tags are present
3. **URL Validation**: Validate audio and image URLs
4. **Numeric Fields**: Validate duration, track numbers, etc.
5. **Content Parsing**: Handle malformed content gracefully

### Error Recovery

```typescript
// Graceful fallback for missing track data
if (track) {
  // Use full track data
  const releaseTrack = { ...track };
} else {
  // Create placeholder with reference data
  const releaseTrack = {
    title: trackRef.title || `Track ${index + 1}`,
    audioUrl: '', // Indicates missing track
    // ... other defaults
  };
}
```

## Performance Optimizations

### Query Optimization

- **Batch Queries**: Fetch multiple events in single requests
- **Selective Fields**: Only fetch necessary event data
- **Timeout Handling**: 10-second timeouts for network requests
- **Abort Signals**: Proper cleanup of cancelled requests

### Caching Strategy

- **Static Cache**: Pre-built data from SSG (instant loading)
- **Runtime Cache**: 5-minute stale time for active data
- **Garbage Collection**: 30-minute cache retention
- **Initial Data**: Use cached data for immediate rendering

### Memory Management

- **Map-based Lookups**: Efficient track resolution
- **Lazy Loading**: Only resolve tracks when needed
- **Cleanup**: Proper disposal of unused data

## Best Practices

### When Adding New Event Types

1. **Add validation function** in `eventConversions.ts`
2. **Add conversion function** with proper error handling
3. **Update type definitions** in `types/music.ts`
4. **Add corresponding hook** in `hooks/`
5. **Include in deduplication logic** if addressable

### When Modifying Existing Conversions

1. **Maintain backward compatibility** with existing events
2. **Add comprehensive logging** for debugging
3. **Handle missing fields gracefully** with sensible defaults
4. **Update all related hooks** that use the conversion
5. **Test with real Nostr data** from relays

### When Creating New Hooks

1. **Use centralized conversion functions** from `eventConversions.ts`
2. **Implement proper caching** with appropriate stale times
3. **Add error boundaries** and retry logic
4. **Include loading states** for UI feedback
5. **Support query options** for flexibility

## Debugging and Monitoring

### Logging Strategy

The conversion functions include comprehensive logging:

```typescript
console.log('🔄 Converting playlist to release:', {
  playlistTitle: playlist.title,
  trackReferences: playlist.tracks?.length || 0,
  availableTracks: tracks.size
});
```

### Common Issues

1. **Missing Track Data**: Check if track events exist on relays
2. **Invalid References**: Verify track reference format in playlists
3. **Network Timeouts**: Increase timeout or check relay connectivity
4. **Cache Misses**: Verify cache keys and data structure
5. **Type Mismatches**: Ensure event kinds match expected values

### Debugging Tools

```typescript
// Enable detailed logging
localStorage.setItem('debug', 'nostr:*');

// Check query cache
queryClient.getQueryData(['music-tracks']);

// Inspect raw events
console.log('Raw event:', JSON.stringify(event, null, 2));
```

## Migration and Updates

### When Updating Event Schemas

1. **Maintain backward compatibility** with existing events
2. **Add migration logic** for old event formats
3. **Update validation functions** to handle both old and new formats
4. **Provide clear upgrade paths** for existing data
5. **Document breaking changes** and migration steps

### Version Management

The system uses event `created_at` timestamps for version resolution:
- Latest events take precedence
- Edit events properly reference originals
- Deduplication preserves most recent versions

This ensures the application always displays the most current data while maintaining compatibility with historical events.