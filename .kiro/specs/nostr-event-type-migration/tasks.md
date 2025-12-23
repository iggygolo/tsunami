# Implementation Plan: Nostr Event Type Migration

## Overview

This implementation plan focuses on migrating from Nostr event types 30054 (releases) and 30055 (trailers) to 36787 (individual tracks) and 34139 (playlists). The approach eliminates legacy event types entirely and implements a clean track/playlist structure.

## Tasks

- [x] 1. Update event kind constants
  - Remove PODCAST_KINDS.RELEASE (30054) and PODCAST_KINDS.TRAILER (30055) constants
  - Ensure MUSIC_TRACK (36787) and MUSIC_PLAYLIST (34139) constants are properly defined
  - Update all imports and references to use new constants
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 1.1 Write unit tests for constant definitions
  - Test that legacy constants no longer exist
  - Test that new constants are properly defined
  - **Validates: Requirements 3.1, 3.2**

- [x] 2. Update event publishing logic
  - [x] 2.1 Modify release publishing to create individual track events (kind 36787)
    - Update usePublishRelease hook to create separate events for each track
    - Ensure each track event has proper metadata and tags
    - _Requirements: 1.1, 4.1_

  - [x] 2.2 Add playlist event creation for multi-track releases
    - Create kind 34139 playlist events that reference track events
    - Use addressable event format (36787:pubkey:identifier) for track references
    - _Requirements: 1.2, 4.2, 4.5_

  - [x] 2.3 Update single track publishing logic
    - Ensure single tracks create only kind 36787 events (no playlist)
    - Maintain all existing metadata and Lightning Network configurations
    - _Requirements: 1.3, 4.3, 4.4_

  - [ ]* 2.4 Write property tests for publishing logic
    - **Property 1: Multiple Track Publishing**
    - **Property 2: Playlist Creation with Track References**
    - **Property 3: Single Track Publishing**
    - **Validates: Requirements 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.5**

- [x] 3. Remove trailer functionality
  - [x] 3.1 Remove trailer publishing logic
    - Delete usePublishTrailer hook and related functions
    - Remove trailer-related constants and types
    - _Requirements: 2.1_

  - [x] 3.2 Remove trailer UI components
    - Delete trailer creation and management forms
    - Remove trailer-related navigation and menu items
    - _Requirements: 2.2_

  - [ ]* 3.3 Write unit tests for trailer removal
    - Test that trailer UI components no longer exist
    - **Validates: Requirements 2.2**

- [x] 4. Update event querying logic
  - [x] 4.1 Modify query hooks to use new event kinds
    - Update usePodcastReleases to query kind 36787 and kind 34139 events
    - Remove queries for legacy event types (30054, 30055)
    - _Requirements: 5.1, 5.5_

  - [x] 4.2 Implement track reference resolution
    - Add logic to resolve playlist track references to complete track data
    - Ensure efficient querying and caching of resolved tracks
    - _Requirements: 5.2_

  - [ ]* 4.3 Write property tests for querying logic
    - **Property 7: Query Event Type Filtering**
    - **Property 8: Track Reference Resolution**
    - **Validates: Requirements 5.1, 5.2**

- [x] 5. Update display components
  - [x] 5.1 Modify release display components
    - Update ReleaseCard and ReleasePage to handle individual track events
    - Ensure playlist events display track listings correctly
    - _Requirements: 5.3_

  - [x] 5.2 Update audio player integration
    - Ensure PersistentAudioPlayer works with kind 36787 track events
    - Update playlist playback to work with track references
    - _Requirements: 5.3_

  - [ ]* 5.3 Write unit tests for display components
    - Test track and playlist display functionality
    - **Validates: Requirements 5.3**

- [x] 6. Update RSS generation
  - [x] 6.1 Modify RSS generator for new event types
    - Update rssGenerator.ts to work with kind 36787 and kind 34139 events
    - Remove trailer event processing from RSS feeds
    - Ensure RSS output maintains compatibility with podcast aggregators
    - _Requirements: 2.3_

  - [ ]* 6.2 Write property tests for RSS generation
    - **Property 9: RSS Generation Exclusion**
    - **Validates: Requirements 2.3**

- [x] 7. Update social features
  - [x] 7.1 Modify comment system for new event types
    - Update comment hooks to work with kind 36787 and kind 34139 events
    - Ensure addressable event references work correctly
    - _Requirements: 5.2_

  - [x] 7.2 Update analytics and metrics
    - Modify analytics hooks to track individual track and playlist engagement
    - Ensure Lightning Network zap tracking works with new event types
    - _Requirements: 4.4_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update validation and error handling
  - [x] 9.1 Add validation for new event structures
    - Validate track events have required fields and proper kind (36787)
    - Validate playlist events have proper track references and kind (34139)
    - _Requirements: 1.4, 1.5_

  - [x] 9.2 Add error handling for track reference resolution
    - Handle cases where playlist references point to non-existent tracks
    - Provide graceful degradation when track resolution fails
    - _Requirements: 5.2_

  - [ ]* 9.3 Write property tests for validation
    - **Property 4: Legacy Event Type Elimination**
    - **Property 5: Correct Event Kind Usage**
    - **Property 6: Metadata Preservation**
    - **Validates: Requirements 1.4, 1.5, 3.3, 3.4, 4.4**

- [x] 10. Final integration and cleanup
  - [x] 10.1 Remove all legacy event type references
    - Search codebase for any remaining references to kinds 30054 and 30055
    - Update documentation and comments to reflect new event structure
    - _Requirements: 3.5_

  - [x] 10.2 Update build scripts and configurations
    - Ensure build-rss.ts script works with new event types
    - Update any configuration files that reference legacy event kinds
    - _Requirements: 2.3_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Remove remaining backwards compatibility
  - [x] 12.1 Update RSS generator to use new event types
    - Modify useRSSFeedGenerator to query kind 36787 and kind 34139 events
    - Remove PODCAST_KINDS.RELEASE references from RSS generation
    - Update RSS feed generation to work with track and playlist events
    - _Requirements: 2.3, 5.1_

  - [x] 12.2 Update ReleaseDiscussions component for new event types
    - Modify addressable event references from kind 30054 to kind 34139
    - Update comment queries to reference playlist events correctly
    - Ensure social features work with new event structure
    - _Requirements: 5.1, 5.2_

  - [x] 12.3 Update documentation and remaining references
    - Remove legacy event type references from documentation files
    - Update README.md to reflect new event structure
    - Clean up any remaining 30054/30055 references in comments
    - _Requirements: 3.5_

  - [ ]* 12.4 Write integration tests for backwards compatibility removal
    - Test that RSS generation works with new event types only
    - Test that social features work with playlist/track events
    - **Validates: Requirements 2.3, 5.1, 5.2**

- [x] 13. Final cleanup checkpoint
  - Ensure all legacy references are removed, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation completely removes legacy event types (30054, 30055)
- New functionality uses only kind 36787 (tracks) and kind 34139 (playlists)