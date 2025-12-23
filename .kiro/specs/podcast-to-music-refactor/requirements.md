# Requirements Document

## Introduction

This specification defines the requirements for migrating the Nostr music publishing system from the current podcast-based event structure to the new Music Track Event Kind 36787 specification. This change will provide proper music-specific metadata, improved discoverability, and better alignment with music industry standards while maintaining compatibility with existing Lightning Network integrations.

## Glossary

- **Music_Track_Event**: Nostr event kind 36787 containing metadata about an audio file
- **Addressable_Event**: Nostr event that can be updated using a unique identifier in the 'd' tag
- **Track_Publisher**: System component responsible for creating and publishing music track events
- **Metadata_Mapper**: Component that converts existing podcast metadata to music track format
- **Blossom_Server**: Decentralized file storage system for hosting audio and media files
- **Zap_Split**: Lightning Network payment distribution mechanism for multiple recipients
- **Legacy_Converter**: System component that migrates existing podcast events to music track events

## Requirements

### Requirement 1: Music Track Event Structure

**User Story:** As a music artist, I want my tracks published as proper music events, so that they are correctly categorized and discoverable as music content rather than podcast episodes.

#### Acceptance Criteria

1. WHEN publishing a new track, THE Track_Publisher SHALL create a Nostr event with kind 36787
2. WHEN creating a music track event, THE Track_Publisher SHALL include a unique identifier in the 'd' tag
3. WHEN publishing a track, THE Track_Publisher SHALL include required tags: d, title, artist, url, and t (with value "music")
4. WHEN the track has lyrics or credits, THE Track_Publisher SHALL include them in the content field using plain text or Markdown
5. THE Music_Track_Event SHALL be addressable and updatable using the unique identifier

### Requirement 2: Required Metadata Implementation

**User Story:** As a music discovery platform, I want consistent required metadata for all tracks, so that I can properly index and display music content.

#### Acceptance Criteria

1. WHEN creating a track event, THE Track_Publisher SHALL include the 'd' tag with a unique identifier for the track
2. WHEN publishing a track, THE Track_Publisher SHALL include the 'title' tag with the track name
3. WHEN publishing a track, THE Track_Publisher SHALL include the 'artist' tag with the artist name
4. WHEN publishing a track, THE Track_Publisher SHALL include the 'url' tag with a direct link to the audio file
5. WHEN publishing a track, THE Track_Publisher SHALL include at least one 't' tag with the value "music"

### Requirement 3: Optional Metadata Support

**User Story:** As a music artist, I want to include comprehensive metadata about my tracks, so that listeners have complete information about my music.

#### Acceptance Criteria

1. WHEN a track has album artwork, THE Track_Publisher SHALL include the 'image' tag with the artwork URL
2. WHEN a track has a music video, THE Track_Publisher SHALL include the 'video' tag with the video file URL
3. WHEN a track is part of an album, THE Track_Publisher SHALL include the 'album' tag with the album name
4. WHEN a track has a position in an album, THE Track_Publisher SHALL include the 'track_number' tag
5. WHEN a track has a release date, THE Track_Publisher SHALL include the 'released' tag in ISO 8601 format (YYYY-MM-DD)
6. WHEN a track has genre information, THE Track_Publisher SHALL include additional 't' tags for each genre
7. WHEN a track has language information, THE Track_Publisher SHALL include the 'language' tag with ISO 639-1 code
8. WHEN a track contains explicit content, THE Track_Publisher SHALL include the 'explicit' tag set to "true"
9. WHEN technical metadata is available, THE Track_Publisher SHALL include 'duration', 'format', 'bitrate', and 'sample_rate' tags

### Requirement 4: Lightning Network Integration

**User Story:** As a music artist, I want to receive Lightning Network payments for my tracks, so that I can monetize my music directly through the platform.

#### Acceptance Criteria

1. WHEN an artist has a Lightning address, THE Track_Publisher SHALL include 'zap' tags for payment splits
2. WHEN multiple collaborators should receive payments, THE Track_Publisher SHALL support multiple 'zap' tags with different addresses and split percentages
3. WHEN no zap tags are present, THE system SHALL use the author's profile Lightning address for payments
4. WHEN processing zap payments, THE system SHALL follow the existing zap split mechanism
5. THE Lightning integration SHALL maintain compatibility with existing NWC (Nostr Wallet Connect) functionality

### Requirement 5: File Storage Integration

**User Story:** As a platform operator, I want audio files stored on reliable decentralized storage, so that music remains accessible and permanent.

#### Acceptance Criteria

1. WHEN uploading audio files, THE system SHALL prefer Blossom servers for permanent storage
2. WHEN uploading video files, THE system SHALL support Blossom servers or other permanent storage solutions
3. WHEN generating file URLs, THE system SHALL use direct links that work across different clients
4. WHEN files are uploaded to Blossom, THE system SHALL verify file integrity and accessibility
5. THE file storage SHALL maintain compatibility with existing upload mechanisms

### Requirement 6: Legacy Migration Support

**User Story:** As a platform administrator, I want existing podcast-based music content migrated to the new format, so that all music is consistently represented.

#### Acceptance Criteria

1. WHEN migrating existing content, THE Legacy_Converter SHALL identify podcast events that represent music tracks
2. WHEN converting podcast events, THE Metadata_Mapper SHALL map existing metadata to the new music track format
3. WHEN migrating content, THE system SHALL preserve all existing metadata where possible
4. WHEN migration is complete, THE system SHALL maintain references to original events for backward compatibility
5. THE migration process SHALL not break existing client functionality during the transition

### Requirement 7: User Interface Updates

**User Story:** As a music artist, I want an updated interface that reflects music-specific terminology and options, so that I can easily publish and manage my tracks.

#### Acceptance Criteria

1. WHEN creating new content, THE interface SHALL use music terminology (track, artist, album) instead of podcast terminology
2. WHEN editing track metadata, THE interface SHALL provide fields for all supported music-specific tags
3. WHEN uploading files, THE interface SHALL support both audio and video file uploads
4. WHEN setting up payments, THE interface SHALL allow configuration of zap splits for collaborators
5. THE interface SHALL maintain familiar workflows while updating terminology and options

### Requirement 8: Client Compatibility

**User Story:** As a Nostr client developer, I want clear specifications for displaying music track events, so that I can properly render music content in my application.

#### Acceptance Criteria

1. WHEN displaying track information, THE client SHALL show title, artist, and album information prominently
2. WHEN artwork is available, THE client SHALL display the image from the 'image' tag
3. WHEN video is available, THE client SHALL allow users to choose between audio and video playback
4. WHEN technical metadata is present, THE client SHALL display duration, format, and quality information
5. THE client SHALL support NIP-25 reactions and NIP-22 comments on music track events

### Requirement 9: Event Addressability and Updates

**User Story:** As a music artist, I want to update my track information after publishing, so that I can correct metadata or add missing information.

#### Acceptance Criteria

1. WHEN creating a track event, THE Track_Publisher SHALL generate a unique 'd' tag identifier
2. WHEN updating track metadata, THE Track_Publisher SHALL publish a new event with the same 'd' tag
3. WHEN clients encounter multiple events with the same 'd' tag, THE client SHALL use the most recent event
4. WHEN generating naddr identifiers, THE system SHALL use the proper format for addressable events
5. THE addressable event system SHALL maintain consistency with existing Nostr specifications

### Requirement 10: Backward Compatibility

**User Story:** As a platform user, I want existing functionality to continue working during the transition, so that my current workflows are not disrupted.

#### Acceptance Criteria

1. WHEN legacy podcast events exist, THE system SHALL continue to display them correctly
2. WHEN new music track events are created, THE system SHALL maintain compatibility with existing RSS generation
3. WHEN clients don't support music track events, THE system SHALL provide fallback mechanisms
4. WHEN migrating content, THE system SHALL preserve all existing Lightning Network payment configurations
5. THE transition SHALL not break existing integrations with external services