# Design Document: Podcast to Music Track Event Migration

## Overview

This design outlines the migration from the current podcast-based Nostr event system (kind 30054) to the new Music Track Event Kind 36787 specification. The migration will transform how music tracks are published, stored, and discovered on the Nostr network while maintaining backward compatibility and preserving existing Lightning Network integrations.

The current system uses addressable podcast release events (kind 30054) that contain multiple tracks as JSON content. The new system will publish individual music track events (kind 36787) with proper music-specific metadata, enabling better discoverability and alignment with music industry standards.

## Architecture

### Current Architecture
```
Podcast Release Event (kind 30054)
├── Addressable event with 'd' tag
├── JSON content containing track array
├── Release-level metadata in tags
└── Single event per album/release
```

### New Architecture
```
Music Track Events (kind 36787)
├── Individual addressable event per track
├── Music-specific metadata in tags
├── Optional content for lyrics/credits
└── Direct audio file references
```

### Migration Strategy

The migration will follow a dual-publishing approach during the transition period:

1. **Phase 1**: Implement new Music Track Event publishing alongside existing system
2. **Phase 2**: Migrate existing content to new format
3. **Phase 3**: Deprecate old system (future consideration)

## Components and Interfaces

### Core Components

#### MusicTrackPublisher
Responsible for creating and publishing Music Track Events (kind 36787).

```typescript
interface MusicTrackPublisher {
  publishTrack(trackData: MusicTrackData): Promise<string>;
  updateTrack(trackId: string, trackData: MusicTrackData): Promise<string>;
  deleteTrack(trackId: string): Promise<string>;
}
```

#### MetadataMapper
Converts between podcast release format and music track format.

```typescript
interface MetadataMapper {
  releaseToTracks(release: PodcastRelease): MusicTrackData[];
  trackToRelease(tracks: MusicTrackData[]): PodcastRelease;
  mapLegacyMetadata(podcastEvent: NostrEvent): MusicTrackData[];
}
```

#### LegacyMigrator
Handles migration of existing podcast events to music track events.

```typescript
interface LegacyMigrator {
  migrateRelease(releaseId: string): Promise<string[]>;
  migrateAllReleases(): Promise<MigrationResult>;
  validateMigration(originalId: string, newIds: string[]): Promise<boolean>;
}
```

#### EventValidator
Validates Music Track Events against the specification.

```typescript
interface EventValidator {
  validateMusicTrackEvent(event: NostrEvent): ValidationResult;
  validateRequiredTags(tags: string[][]): boolean;
  validateOptionalTags(tags: string[][]): boolean;
}
```

## Data Models

### MusicTrackData
Core data structure for music track information.

```typescript
interface MusicTrackData {
  // Required fields
  identifier: string;           // 'd' tag - unique identifier
  title: string;               // Track title
  artist: string;              // Artist name
  audioUrl: string;            // Direct URL to audio file
  
  // Optional metadata
  album?: string;              // Album name
  trackNumber?: number;        // Position in album
  releaseDate?: string;        // ISO 8601 date (YYYY-MM-DD)
  duration?: number;           // Track length in seconds
  format?: string;             // Audio format (mp3, flac, m4a, ogg)
  bitrate?: string;            // Audio bitrate (e.g., "320kbps")
  sampleRate?: string;         // Sample rate in Hz
  
  // Media files
  imageUrl?: string;           // Album artwork URL
  videoUrl?: string;           // Music video URL
  
  // Content and metadata
  lyrics?: string;             // Track lyrics
  credits?: string;            // Production credits
  language?: string;           // ISO 639-1 language code
  explicit?: boolean;          // Explicit content flag
  genres?: string[];           // Genre/category tags
  
  // Lightning Network
  zapSplits?: ZapSplit[];      // Payment distribution
}
```

### ZapSplit
Lightning Network payment split configuration.

```typescript
interface ZapSplit {
  address: string;             // Lightning address or node ID
  percentage: number;          // Split percentage (0-100)
  name?: string;               // Recipient name
  type: 'lnaddress' | 'node';  // Address type
}
```

### MigrationResult
Result of migration operations.

```typescript
interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  errors: string[];
  trackEventIds: string[];
}
```

### ValidationResult
Result of event validation.

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  invalidOptional: string[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Properties 1.2, 2.1, and 9.1 all test unique identifier generation - consolidated into Property 1
- Properties 2.2, 2.3, 2.4, 2.5 all test required tag presence - consolidated into Property 2  
- Properties 3.1, 3.5, 3.6, 3.7 all test conditional tag inclusion - consolidated into Property 3
- Properties 1.5 and 9.2 both test addressable event updates - consolidated into Property 4
- Properties 6.2 and 6.3 both test migration data preservation - consolidated into Property 5

### Core Properties

**Property 1: Event Structure and Required Tags**
*For any* valid music track data, publishing it should create an event with kind 36787 containing all required tags (d, title, artist, url, t="music") with correct values
**Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5**

**Property 2: Unique Identifier Generation**
*For any* set of published music track events, all 'd' tag identifiers should be unique across the entire set
**Validates: Requirements 1.2, 2.1, 9.1**

**Property 3: Content Field Population**
*For any* track with lyrics or credits, the published event's content field should contain the provided text in plain text or Markdown format
**Validates: Requirements 1.4**

**Property 4: Addressable Event Updates**
*For any* music track, publishing an update with the same identifier should create a new event with the same 'd' tag but different event ID
**Validates: Requirements 1.5, 9.2**

**Property 5: Conditional Tag Inclusion**
*For any* track with optional metadata (image, release date, genres, language), the corresponding tags should be present if and only if the metadata is provided
**Validates: Requirements 3.1, 3.5, 3.6, 3.7**

**Property 6: Lightning Network Integration**
*For any* track with zap split configuration, the published event should contain 'zap' tags with correct addresses and percentages that sum to 100
**Validates: Requirements 4.1, 4.2**

**Property 7: URL Format Validation**
*For any* generated file URL, it should be a valid HTTP/HTTPS URL that follows standard URL format conventions
**Validates: Requirements 5.3**

**Property 8: Migration Data Preservation**
*For any* podcast release event, migrating it to music track events should preserve all compatible metadata without data loss
**Validates: Requirements 6.2, 6.3, 6.4, 10.4**

**Property 9: Legacy Event Identification**
*For any* set of Nostr events, the migration system should correctly identify only those that represent music content based on event structure and metadata
**Validates: Requirements 6.1**

**Property 10: Naddr Encoding Compliance**
*For any* music track event, generating its naddr identifier should produce a valid addressable event identifier that follows NIP-19 specification
**Validates: Requirements 9.4, 9.5**

**Property 11: RSS Generation Compatibility**
*For any* set of music track events, the RSS generation system should produce valid RSS XML that maintains compatibility with existing feed readers
**Validates: Requirements 10.2**

<function_calls>
<invoke name="prework">
<parameter name="featureName">podcast-to-music-refactor

## Error Handling

### Event Validation Errors
- **Invalid Event Kind**: Reject events that don't use kind 36787
- **Missing Required Tags**: Validate presence of d, title, artist, url, and t="music" tags
- **Invalid Tag Format**: Validate tag structure and value formats (ISO dates, language codes, URLs)
- **Duplicate Identifiers**: Prevent publishing events with conflicting 'd' tag values

### File Upload Errors
- **Upload Failures**: Graceful handling of Blossom server upload failures with retry logic
- **Invalid File Types**: Reject non-audio files for audio uploads, non-image files for artwork
- **File Size Limits**: Enforce reasonable file size limits for audio and video files
- **Corrupted Files**: Validate file integrity before publishing event references

### Migration Errors
- **Invalid Source Events**: Skip events that don't match expected podcast release structure
- **Metadata Mapping Failures**: Log and continue when specific metadata cannot be mapped
- **Partial Migration**: Handle cases where some tracks in a release fail to migrate
- **Rollback Capability**: Provide mechanism to revert failed migrations

### Lightning Network Errors
- **Invalid Addresses**: Validate Lightning addresses before including in zap tags
- **Split Percentage Errors**: Ensure zap splits sum to 100% and handle rounding errors
- **Payment Failures**: Graceful degradation when payment processing fails

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Event structure validation with known good/bad examples
- Migration of specific podcast releases with known metadata
- Error handling for specific failure scenarios
- Integration with existing Lightning Network and file upload systems

**Property-Based Tests**: Verify universal properties across all inputs
- Generate random track metadata and verify event structure compliance
- Test migration with randomly generated podcast events
- Validate addressable event behavior with random update sequences
- Verify URL format compliance across random input variations

### Property-Based Testing Configuration

**Testing Framework**: Use `fast-check` for TypeScript property-based testing
**Test Iterations**: Minimum 100 iterations per property test
**Test Tagging**: Each property test must reference its design document property

Example test tag format:
```typescript
// Feature: podcast-to-music-refactor, Property 1: Event Structure and Required Tags
```

### Test Categories

**Core Event Publishing Tests**:
- Property 1: Event structure and required tags validation
- Property 2: Unique identifier generation across multiple events
- Property 3: Content field population with lyrics/credits
- Property 4: Addressable event update mechanism

**Metadata Handling Tests**:
- Property 5: Conditional tag inclusion based on provided metadata
- Property 6: Lightning Network zap split configuration
- Property 7: URL format validation for file references

**Migration and Compatibility Tests**:
- Property 8: Data preservation during podcast-to-music migration
- Property 9: Legacy event identification accuracy
- Property 10: Naddr encoding compliance with NIP-19
- Property 11: RSS generation compatibility maintenance

### Integration Testing

**End-to-End Workflows**:
- Complete track publishing workflow from form submission to event publication
- Migration workflow from podcast release to individual track events
- RSS feed generation with mixed legacy and new events
- Lightning Network payment flow with new event structure

**Backward Compatibility**:
- Existing RSS feed readers can still parse enhanced feeds
- Legacy clients can gracefully handle new event types
- Payment systems continue to work with new zap tag structure

### Performance Testing

**Event Publishing Performance**:
- Measure time to publish individual tracks vs. batch releases
- File upload performance with Blossom servers
- Event validation performance with large metadata sets

**Migration Performance**:
- Batch migration of large numbers of podcast releases
- Memory usage during migration of releases with many tracks
- Network efficiency when publishing multiple track events

## Implementation Notes

### Migration Strategy Details

**Phase 1: Parallel Publishing**
- Implement new Music Track Event publishing alongside existing system
- Allow users to opt-in to new format for new releases
- Maintain full backward compatibility with existing events

**Phase 2: Content Migration**
- Provide migration tools for existing podcast releases
- Batch migrate historical content with user consent
- Maintain references between old and new events for compatibility

**Phase 3: System Transition**
- Gradually deprecate podcast release event creation
- Update RSS generation to prefer music track events
- Provide legacy support for existing podcast events

### Technical Considerations

**Event Size Optimization**:
- Keep event sizes reasonable by using external file references
- Optimize tag structure to minimize redundancy
- Consider compression for large lyrics/credits content

**Relay Compatibility**:
- Ensure new event kind is supported by major Nostr relays
- Provide fallback mechanisms for relays that don't support kind 36787
- Test event propagation across different relay implementations

**Client Integration**:
- Provide clear documentation for client developers
- Create reference implementations for common use cases
- Maintain compatibility with existing Nostr music clients

### Security Considerations

**Content Validation**:
- Sanitize user-provided content in lyrics and credits fields
- Validate file URLs to prevent malicious redirects
- Implement rate limiting for event publishing

**Payment Security**:
- Validate Lightning addresses before including in events
- Ensure zap split percentages cannot be manipulated
- Maintain audit trail for payment configurations

**Migration Security**:
- Verify ownership before migrating podcast events
- Prevent unauthorized migration of other users' content
- Maintain data integrity during migration process