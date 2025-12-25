# Requirements Document

## Introduction

This feature reworks the music publishing workflow from a release-first approach to a track-first approach. Users will publish individual tracks with complete metadata (description, cover image, lyrics, credits), then organize these tracks into playlists/releases. This provides more flexibility, allowing tracks to be part of multiple playlists and enabling independent editing of tracks and playlists.

## Glossary

- **Track**: An individual music track with complete metadata (title, description, cover image, lyrics, credits, audio file)
- **Playlist**: A collection of tracks with its own metadata (title, description, cover image, track order)
- **Release**: A special type of playlist that represents an album, EP, or single release
- **Studio**: The content creation interface for managing tracks and playlists
- **Track_Library**: The user's collection of published individual tracks
- **Track_Editor**: Interface for creating and editing individual tracks
- **Playlist_Editor**: Interface for creating and editing playlists/releases
- **Track_Reference**: A pointer to an existing track used in playlists
- **Nostr_Event**: The underlying data structure for publishing tracks and playlists to the network

## Requirements

### Requirement 1: Individual Track Publishing

**User Story:** As a musician, I want to publish individual tracks with complete metadata, so that each track stands alone as a complete musical work with all its information.

#### Acceptance Criteria

1. WHEN creating a new track, THE Track_Editor SHALL allow input of title, description, cover image, lyrics, and credits
2. WHEN uploading audio, THE Track_Editor SHALL accept common audio formats (MP3, FLAC, M4A, OGG)
3. WHEN saving a track, THE System SHALL publish it as an individual Nostr event (Kind 36787)
4. WHEN a track is published, THE System SHALL add it to the user's Track_Library
5. WHEN track metadata is incomplete, THE Track_Editor SHALL allow saving as draft and publishing later

### Requirement 2: Track Library Management

**User Story:** As a musician, I want to view and manage all my published tracks in one place, so that I can easily find and reuse tracks across multiple playlists.

#### Acceptance Criteria

1. WHEN accessing the studio, THE System SHALL display a Track_Library showing all user's published tracks
2. WHEN viewing the Track_Library, THE System SHALL show track title, cover image, duration, and publish status
3. WHEN selecting a track, THE System SHALL provide options to edit, delete, or add to playlist
4. WHEN searching tracks, THE System SHALL filter by title, description, or tags
5. WHEN tracks are updated, THE Track_Library SHALL reflect changes immediately

### Requirement 3: Track Editing

**User Story:** As a musician, I want to edit individual tracks after publishing, so that I can update metadata, fix errors, or improve descriptions without affecting playlists.

#### Acceptance Criteria

1. WHEN editing a track, THE Track_Editor SHALL load existing metadata for modification
2. WHEN saving track changes, THE System SHALL update the original Nostr event
3. WHEN a track is updated, THE System SHALL preserve its identity across all playlists that reference it
4. WHEN track audio is replaced, THE System SHALL maintain the same track identifier
5. WHEN track changes are saved, THE System SHALL notify playlists that reference the track

### Requirement 4: Playlist Creation and Management

**User Story:** As a musician, I want to create playlists by selecting from my existing tracks, so that I can organize music into albums, EPs, or themed collections.

#### Acceptance Criteria

1. WHEN creating a playlist, THE Playlist_Editor SHALL show the user's Track_Library for selection
2. WHEN adding tracks to a playlist, THE System SHALL create Track_References rather than duplicating track data
3. WHEN arranging playlist tracks, THE Playlist_Editor SHALL allow drag-and-drop reordering
4. WHEN saving a playlist, THE System SHALL publish it as a Nostr event (Kind 34139)
5. WHEN a playlist is created, THE System SHALL allow setting separate title, description, and cover image

### Requirement 5: Multi-Playlist Track Usage

**User Story:** As a musician, I want to include the same track in multiple playlists, so that I can create different collections (like "Best Of" albums) without republishing tracks.

#### Acceptance Criteria

1. WHEN adding a track to a playlist, THE System SHALL allow the same track to be added to multiple playlists
2. WHEN a track appears in multiple playlists, THE System SHALL maintain a single source of truth for track metadata
3. WHEN viewing a track, THE System SHALL show all playlists that include it
4. WHEN a track is updated, THE System SHALL reflect changes in all playlists that reference it
5. WHEN removing a track from a playlist, THE System SHALL only remove the reference, not delete the track

### Requirement 6: Playlist Editing

**User Story:** As a musician, I want to edit playlists independently from tracks, so that I can update playlist information, reorder tracks, or change artwork without affecting individual tracks.

#### Acceptance Criteria

1. WHEN editing a playlist, THE Playlist_Editor SHALL allow modification of title, description, and cover image
2. WHEN reordering tracks, THE Playlist_Editor SHALL update track positions without affecting track metadata
3. WHEN adding tracks to an existing playlist, THE System SHALL insert Track_References at the specified position
4. WHEN removing tracks from a playlist, THE System SHALL remove only the Track_Reference
5. WHEN playlist changes are saved, THE System SHALL update the playlist Nostr event

### Requirement 7: Studio Workflow Integration

**User Story:** As a musician, I want the studio interface to support the track-first workflow, so that I can efficiently manage both individual tracks and playlists in one place.

#### Acceptance Criteria

1. WHEN accessing the studio, THE System SHALL provide separate sections for Track_Library and playlist management
2. WHEN creating content, THE System SHALL offer options to create new tracks or new playlists
3. WHEN managing content, THE System SHALL show clear relationships between tracks and playlists
4. WHEN navigating the studio, THE System SHALL maintain context between track and playlist editing
5. WHEN publishing content, THE System SHALL provide clear feedback about publication status

### Requirement 8: Backward Compatibility

**User Story:** As a user of the existing app, I want the rest of the application to continue functioning normally, so that music discovery, playback, and social features work without disruption.

#### Acceptance Criteria

1. WHEN displaying music content, THE System SHALL render both old releases and new playlists consistently
2. WHEN playing music, THE Audio_Player SHALL work with both release tracks and playlist tracks
3. WHEN browsing music, THE System SHALL show both releases and playlists in music discovery interfaces
4. WHEN interacting with music, THE System SHALL support zapping, commenting, and sharing for both formats
5. WHEN loading existing releases, THE System SHALL continue to support the current release format during transition

### Requirement 9: Data Migration Strategy

**User Story:** As a developer, I want existing releases to work with the new system, so that users don't lose access to previously published music.

#### Acceptance Criteria

1. WHEN loading existing releases, THE System SHALL continue to display them using current rendering logic
2. WHEN users want to edit old releases, THE System SHALL provide migration tools to convert to track-first format
3. WHEN migrating releases, THE System SHALL preserve all metadata and track information
4. WHEN migration is complete, THE System SHALL maintain the same public URLs and identifiers
5. WHEN both formats coexist, THE System SHALL handle them transparently in all interfaces

### Requirement 10: Track Metadata Completeness

**User Story:** As a musician, I want to include comprehensive metadata with each track, so that listeners have complete information about the music and its creation.

#### Acceptance Criteria

1. WHEN creating a track, THE Track_Editor SHALL support lyrics input with formatting preservation
2. WHEN adding credits, THE Track_Editor SHALL allow multiple credit entries (producer, songwriter, performer, etc.)
3. WHEN setting track details, THE Track_Editor SHALL support genre, language, explicit content flags, and release date
4. WHEN uploading cover art, THE Track_Editor SHALL accept common image formats and resize appropriately
5. WHEN track metadata is saved, THE System SHALL validate required fields and provide helpful error messages