# Design Document: Nostr Event Type Migration

## Overview

This design outlines the migration from the current Nostr event system using kinds 30054 (releases) and 30055 (trailers) to a new structure using kinds 36787 (individual tracks) and 34139 (playlists). The migration transforms the current release-based system where multiple tracks are stored as JSON content within a single event, into individual track events with optional playlist groupings for collections.

The new architecture provides better discoverability, allows individual track engagement, and aligns with music industry standards while maintaining all existing functionality including Lightning Network payments, RSS generation, and social features.

## Architecture

### Current Architecture
```
Release Event (kind 30054)
├── Addressable event with 'd' tag
├── JSON content containing track array
├── Release-level metadata in tags
└── Single event per album/release

Trailer Event (kind 30055)
├── Addressable event with 'd' tag
├── Single track metadata
└── Trailer-specific tags
```

### New Architecture
```
Individual Track Events (kind 36787)
├── One addressable event per track
├── Track-specific metadata in tags
├── Direct audio file references
└── Independent engagement metrics

Playlist Events (kind 34139)
├── Addressable event with 'd' tag
├── Ordered list of track references
├── Playlist-level metadata
└── References to track events via addressable format
```

## Components and Interfaces

### Core Components

#### EventKindMigrator
Handles the migration of event type constants and publishing logic.

```typescript
interface EventKindMigrator {
  updateConstants(): void;
  migratePublishingLogic(): void;
  updateQueryLogic(): void;
}
```

#### TrackEventPublisher
Publishes individual music track events (kind 36787).

```typescript
interface TrackEventPublisher {
  publishTrack(trackData: TrackData): Promise<string>;
  updateTrack(trackId: string, trackData: TrackData): Promise<string>;
}
```

#### PlaylistEventPublisher
Publishes playlist events (kind 34139) that reference track events.

```typescript
interface PlaylistEventPublisher {
  publishPlaylist(playlistData: PlaylistData): Promise<string>;
  updatePlaylist(playlistId: string, playlistData: PlaylistData): Promise<string>;
  addTrackToPlaylist(playlistId: string, trackReference: TrackReference): Promise<string>;
  removeTrackFromPlaylist(playlistId: string, trackReference: TrackReference): Promise<string>;
}
```

#### EventQueryManager
Manages querying for the new event types.

```typescript
interface EventQueryManager {
  queryTracks(filters: TrackFilters): Promise<TrackEvent[]>;
  queryPlaylists(filters: PlaylistFilters): Promise<PlaylistEvent[]>;
  resolvePlaylistTracks(playlist: PlaylistEvent): Promise<TrackEvent[]>;
}
```

## Data Models

### TrackData
Data structure for individual music tracks.

```typescript
interface TrackData {
  // Required fields
  identifier: string;           // 'd' tag - unique identifier
  title: string;               // Track title
  artist: string;              // Artist name
  audioUrl: string;            // Direct URL to audio file
  
  // Optional metadata
  album?: string;              // Album name
  trackNumber?: number;        // Position in album
  releaseDate?: string;        // ISO 8601 date
  duration?: number;           // Track length in seconds
  
  // Media files
  imageUrl?: string;           // Album artwork URL
  videoUrl?: string;           // Music video URL
  
  // Content
  lyrics?: string;             // Track lyrics
  credits?: string;            // Production credits
  
  // Lightning Network
  zapSplits?: ZapSplit[];      // Payment distribution
}
```

### PlaylistData
Data structure for music playlists/albums.

```typescript
interface PlaylistData {
  // Required fields
  identifier: string;          // 'd' tag - unique identifier
  title: string;              // Playlist/album title
  artist: string;             // Artist name
  trackReferences: TrackReference[]; // Ordered list of tracks
  
  // Optional metadata
  description?: string;        // Playlist description
  releaseDate?: string;        // ISO 8601 date
  imageUrl?: string;          // Playlist artwork URL
  
  // Lightning Network
  zapSplits?: ZapSplit[];     // Payment distribution
}
```

### TrackReference
Reference to a track event using addressable event format.

```typescript
interface TrackReference {
  kind: 36787;                // Music Track event kind
  pubkey: string;             // Track author's pubkey
  identifier: string;         // Track's 'd' tag identifier
}
```

### TrackEvent
Complete track event structure.

```typescript
interface TrackEvent {
  id: string;                 // Event ID
  kind: 36787;               // Event kind
  pubkey: string;            // Author pubkey
  created_at: number;        // Unix timestamp
  content: string;           // Lyrics/credits content
  tags: string[][];          // Event tags
  sig: string;               // Event signature
}
```

### PlaylistEvent
Complete playlist event structure.

```typescript
interface PlaylistEvent {
  id: string;                // Event ID
  kind: 34139;              // Event kind
  pubkey: string;           // Author pubkey
  created_at: number;       // Unix timestamp
  content: string;          // Playlist description
  tags: string[][];         // Event tags including track references
  sig: string;              // Event signature
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*
### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Properties 1.1 and 4.1 both test multiple track publishing - consolidated into Property 1
- Properties 1.2 and 4.2 both test playlist creation with track references - consolidated into Property 2  
- Properties 1.3 and 4.3 both test single track publishing - consolidated into Property 3
- Properties 1.4, 1.5, 2.1, and 5.5 all test elimination of old event types - consolidated into Property 4
- Properties 3.3 and 3.4 test correct event kind usage - consolidated into Property 5

### Core Properties

**Property 1: Multiple Track Publishing**
*For any* release with multiple tracks, publishing it should create individual kind 36787 events for each track with correct metadata
**Validates: Requirements 1.1, 4.1**

**Property 2: Playlist Creation with Track References**
*For any* release with multiple tracks, publishing it should create a kind 34139 playlist event that references all tracks using addressable event format (36787:pubkey:identifier)
**Validates: Requirements 1.2, 4.2, 4.5**

**Property 3: Single Track Publishing**
*For any* single track, publishing it should create only one kind 36787 event and no playlist event
**Validates: Requirements 1.3, 4.3**

**Property 4: Legacy Event Type Elimination**
*For any* publishing operation, the system should never create kind 30054 or kind 30055 events
**Validates: Requirements 1.4, 1.5, 2.1, 5.5**

**Property 5: Correct Event Kind Usage**
*For any* published content, track events should use kind 36787 and playlist events should use kind 34139
**Validates: Requirements 3.3, 3.4**

**Property 6: Metadata Preservation**
*For any* track with metadata and Lightning Network configuration, the published kind 36787 event should contain all the original data
**Validates: Requirements 4.4**

**Property 7: Query Event Type Filtering**
*For any* music content query, the results should contain only kind 36787 and kind 34139 events
**Validates: Requirements 5.1**

**Property 8: Track Reference Resolution**
*For any* playlist with track references, resolving the references should return complete track information from the corresponding kind 36787 events
**Validates: Requirements 5.2**

**Property 9: RSS Generation Exclusion**
*For any* generated RSS feed, it should not contain any trailer-related content or references to kind 30055 events
**Validates: Requirements 2.3**

## Error Handling

### Event Publishing Errors
- **Invalid Track Data**: Validate required fields before creating kind 36787 events
- **Missing Track References**: Ensure playlist events have valid track references
- **Duplicate Identifiers**: Prevent publishing events with conflicting 'd' tag values
- **Invalid Event Kinds**: Reject attempts to create legacy event types (30054, 30055)

### Query Errors
- **Unresolved Track References**: Handle cases where playlist references point to non-existent tracks
- **Invalid Event Structure**: Skip malformed events during query processing
- **Network Failures**: Graceful degradation when track resolution fails

### Migration Errors
- **Constant Update Failures**: Ensure all code references are updated to new event kinds
- **UI Component Removal**: Verify all trailer-related UI elements are properly removed
- **RSS Generation Issues**: Handle edge cases in RSS feed generation with new event structure

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Event structure validation with known track and playlist data
- UI component removal verification
- RSS generation with specific content scenarios
- Constant definition and usage verification

**Property-Based Tests**: Verify universal properties across all inputs
- Generate random track and playlist data to verify event structure compliance
- Test publishing behavior with various track count scenarios
- Validate query filtering across random event sets
- Verify metadata preservation with randomly generated configurations

### Property-Based Testing Configuration

**Testing Framework**: Use `fast-check` for TypeScript property-based testing
**Test Iterations**: Minimum 100 iterations per property test
**Test Tagging**: Each property test must reference its design document property

Example test tag format:
```typescript
// Feature: nostr-event-type-migration, Property 1: Multiple Track Publishing
```

### Test Categories

**Event Publishing Tests**:
- Property 1: Multiple track publishing creates individual events
- Property 2: Playlist creation with correct track references
- Property 3: Single track publishing behavior
- Property 4: Legacy event type elimination
- Property 5: Correct event kind usage
- Property 6: Metadata preservation during publishing

**Query and Display Tests**:
- Property 7: Query event type filtering
- Property 8: Track reference resolution
- Property 9: RSS generation exclusion of trailers

**Integration Tests**:
- Complete publishing workflow from form submission to event creation
- Track reference resolution in playlist display
- RSS feed generation with mixed track and playlist content
- Lightning Network payment flow with new event structure

### Performance Testing

**Event Publishing Performance**:
- Measure time to publish individual tracks vs. multiple tracks with playlist
- Track reference resolution performance in large playlists
- Query performance with new event type filtering

**Migration Performance**:
- Code constant update verification
- UI component removal impact on bundle size
- RSS generation performance with new event structure

## Implementation Notes

### Migration Strategy

**Phase 1: Update Constants and Core Logic**
- Remove PODCAST_KINDS.RELEASE and PODCAST_KINDS.TRAILER constants
- Update all publishing logic to use new event kinds
- Modify query logic to filter for new event types only

**Phase 2: Update User Interface**
- Remove all trailer-related UI components and options
- Update publishing forms to support track/playlist structure
- Modify display components to handle new event types

**Phase 3: Update Supporting Systems**
- Modify RSS generation to work with new event structure
- Update social features to work with individual tracks and playlists
- Ensure Lightning Network integration works with new event types

### Technical Considerations

**Event Structure Optimization**:
- Ensure playlist events efficiently reference tracks without duplication
- Optimize track metadata storage in individual events
- Consider event size limits for playlists with many tracks

**Query Optimization**:
- Index new event kinds for efficient querying
- Optimize track reference resolution for playlist display
- Ensure query performance scales with number of tracks and playlists

**Social Feature Integration**:
- Ensure comments work on individual track events
- Support reactions and engagement metrics on both tracks and playlists
- Maintain addressable event functionality for social features

### Security Considerations

**Event Validation**:
- Validate track references in playlist events point to valid tracks
- Ensure event kind consistency throughout the system
- Prevent creation of legacy event types through validation

**Data Integrity**:
- Verify track metadata is preserved during publishing
- Ensure playlist track order is maintained
- Validate Lightning Network configurations in new event structure