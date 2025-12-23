# Requirements Document

## Introduction

This specification defines the requirements for migrating from Nostr event types 30054 (releases) and 30055 (trailers) to a new structure using 36787 (individual tracks) and 34139 (playlists). This is a clean migration that eliminates the old event types entirely.

## Glossary

- **Music_Track_Event**: Nostr event kind 36787 for individual audio tracks
- **Music_Playlist_Event**: Nostr event kind 34139 for collections of tracks (replaces releases)
- **Track_Reference**: Addressable event reference to a kind 36787 track event

## Requirements

### Requirement 1: Replace Release Events with Track and Playlist Events

**User Story:** As a music artist, I want my releases converted to individual track events with optional playlist grouping, so that each track can be discovered independently while maintaining album structure.

#### Acceptance Criteria

1. WHEN publishing a release with multiple tracks, THE system SHALL create individual kind 36787 events for each track
2. WHEN publishing a release with multiple tracks, THE system SHALL create a kind 34139 playlist event that references all tracks
3. WHEN publishing a single track, THE system SHALL create only a kind 36787 event (no playlist needed)
4. THE system SHALL no longer create kind 30054 release events
5. THE system SHALL use only the new event types going forward

### Requirement 2: Remove Trailer Events Completely

**User Story:** As a platform administrator, I want to eliminate trailer events entirely, so that the system focuses on tracks and playlists only.

#### Acceptance Criteria

1. THE system SHALL no longer create kind 30055 trailer events
2. THE user interface SHALL remove all trailer creation and management options
3. THE RSS generation SHALL not include trailer events
4. THE system documentation SHALL be updated to remove trailer references
5. THE codebase SHALL remove all trailer-related functionality

### Requirement 3: Update Event Kind Constants

**User Story:** As a developer, I want the event type constants updated to reflect the new structure, so that the system uses the correct event types.

#### Acceptance Criteria

1. THE PODCAST_KINDS.RELEASE constant SHALL be removed completely
2. THE PODCAST_KINDS.TRAILER constant SHALL be removed completely
3. THE system SHALL use MUSIC_TRACK (36787) for individual tracks
4. THE system SHALL use MUSIC_PLAYLIST (34139) for track collections
5. THE system SHALL update all references to use the new constants

### Requirement 4: Update Event Publishing Logic

**User Story:** As a music artist, I want my content published using the new track and playlist structure, so that it follows the updated Nostr music specifications.

#### Acceptance Criteria

1. WHEN publishing multiple tracks, THE system SHALL create individual kind 36787 events for each track
2. WHEN publishing multiple tracks, THE system SHALL create a kind 34139 playlist event with track references
3. WHEN publishing a single track, THE system SHALL create only a kind 36787 event
4. THE track events SHALL maintain all existing metadata and Lightning Network configurations
5. THE playlist events SHALL reference tracks using addressable event format (36787:pubkey:identifier)

### Requirement 5: Update Event Querying

**User Story:** As a platform user, I want to see content using the new event structure, so that the system is consistent and clean.

#### Acceptance Criteria

1. WHEN querying for music content, THE system SHALL fetch kind 36787 and kind 34139 events only
2. WHEN displaying playlists, THE system SHALL resolve track references to show complete track information
3. WHEN displaying individual tracks, THE system SHALL show track metadata directly
4. THE queries SHALL be optimized for the new event structure
5. THE system SHALL no longer query for legacy event types