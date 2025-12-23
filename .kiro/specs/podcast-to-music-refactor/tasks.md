# Implementation Plan: Podcast to Music Track Event Migration

## Overview

This implementation plan focuses on adding support for the new Music Track Event Kind 36787 specification alongside the existing podcast system. The approach prioritizes simplicity by implementing the new format without migrating existing content, allowing for a gradual transition.

## Tasks

- [x] 1. Update configuration and constants
  - Add MUSIC_TRACK event kind (36787) to PODCAST_KINDS constant
  - Update TypeScript interfaces to support music track metadata
  - _Requirements: 1.1, 2.1_

- [ ]* 1.1 Write unit tests for event structure validation
  - Test that published events have correct kind and required tags
  - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5**

- [x] 2. Create music track data models
  - [x] 2.1 Define MusicTrackData interface with all required and optional fields
    - Include required fields: identifier, title, artist, audioUrl
    - Include optional fields: album, trackNumber, releaseDate, duration, etc.
    - _Requirements: 1.2, 2.2, 2.3, 2.4_

  - [x] 2.2 Create MusicTrackFormData interface for UI forms
    - Map form inputs to music track metadata
    - Support file uploads for audio, video, and artwork
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.3 Write unit tests for data model validation
    - Test required and optional field handling
    - **Validates: Requirements 1.2, 2.1, 9.1**

- [x] 3. Implement music track event publisher
  - [x] 3.1 Create MusicTrackPublisher class
    - Implement publishTrack method for creating kind 36787 events
    - Include all required tags: d, title, artist, url, t="music"
    - Handle optional metadata tags conditionally
    - _Requirements: 1.1, 1.3, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Add content field handling for lyrics and credits
    - Support plain text and Markdown formatting
    - Combine lyrics and credits in structured format
    - _Requirements: 1.4_

  - [ ]* 3.3 Write unit tests for content field handling
    - Test lyrics and credits formatting
    - **Validates: Requirements 1.4**

  - [x] 3.4 Implement Lightning Network zap split support
    - Add zap tags with addresses and split percentages
    - Validate that splits sum to 100%
    - _Requirements: 4.1, 4.2_

  - [ ]* 3.5 Write unit tests for zap split validation
    - Test that splits sum to 100% and handle edge cases
    - **Validates: Requirements 4.1, 4.2**

- [x] 4. Create music track publishing hook
  - [x] 4.1 Implement usePublishMusicTrack hook
    - Use MusicTrackPublisher to create events
    - Handle file uploads for audio, video, and artwork
    - Integrate with existing upload mechanisms
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_

  - [x] 4.2 Add updateMusicTrack functionality for addressable events
    - Publish new event with same 'd' tag for updates
    - Preserve original metadata where appropriate
    - _Requirements: 1.5, 9.2_

  - [ ]* 4.3 Write unit tests for addressable event updates
    - Test that updates use same 'd' tag with new event ID
    - **Validates: Requirements 1.5, 9.2**

  - [ ]* 4.4 Write unit tests for conditional metadata
    - Test that optional tags are included only when data is provided
    - **Validates: Requirements 3.1, 3.5, 3.6, 3.7**

- [ ] 5. Update user interface for music tracks
  - [ ] 5.1 Create MusicTrackForm component
    - Replace podcast terminology with music terminology
    - Add fields for all music-specific metadata
    - Support audio and video file uploads
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 5.2 Add zap split configuration UI
    - Allow multiple collaborator addresses and percentages
    - Validate that splits sum to 100%
    - _Requirements: 7.4_

  - [ ] 5.3 Update existing forms to support both formats
    - Add toggle or option to choose between podcast and music formats
    - Maintain existing workflows for backward compatibility
    - _Requirements: 7.5_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement music track querying and display
  - [x] 7.1 Create useMusicTracks hook for fetching kind 36787 events
    - Query for music track events by artist
    - Handle addressable event deduplication
    - _Requirements: 8.1, 9.3_

  - [x] 7.2 Update display components for music track events
    - Show title, artist, album information prominently
    - Display artwork from image tag
    - Support video playback when available
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 7.3 Add support for NIP-25 reactions and NIP-22 comments
    - Ensure existing comment/reaction systems work with new event kind
    - _Requirements: 8.5_

- [ ] 8. Update RSS generation for music tracks
  - [ ] 8.1 Extend RSS generator to support music track events
    - Include music track events in RSS feeds
    - Map music metadata to appropriate RSS/iTunes tags
    - Maintain compatibility with existing podcast events
    - _Requirements: 10.2_

  - [ ]* 8.2 Write unit tests for RSS compatibility
    - Test that RSS generation works with music track events
    - **Validates: Requirements 10.2**

- [x] 9. Add naddr identifier support
  - [x] 9.1 Update nip19Utils to support music track events
    - Generate naddr identifiers for kind 36787 events
    - Ensure proper addressable event format compliance
    - _Requirements: 9.4, 9.5_

  - [ ]* 9.2 Write unit tests for naddr encoding
    - Test naddr generation for music track events
    - **Validates: Requirements 9.4, 9.5**

- [x] 10. Integration and testing
  - [x] 10.1 Add URL format validation
    - Validate audio, video, and image URLs
    - Ensure URLs work across different clients
    - _Requirements: 5.3_

  - [ ]* 10.2 Write unit tests for URL validation
    - Test URL format validation for audio, video, and image files
    - **Validates: Requirements 5.3**

  - [x] 10.3 Update existing components to handle both event types
    - Ensure audio player works with both podcast and music events
    - Update analytics and statistics to include music tracks
    - _Requirements: 10.1, 10.3_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation maintains backward compatibility with existing podcast events
- New music track functionality is additive and doesn't break existing workflows