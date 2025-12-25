# Implementation Plan: Track-First Publishing

## Overview

This implementation transforms the studio workflow from release-first to track-first publishing. The approach is simple: create forms that publish the correct Nostr events (Kind 36787 for tracks, Kind 34139 for playlists), and the existing app infrastructure will handle everything else automatically.

## Tasks

- [x] 1. Update studio navigation for track-first workflow
  - Add new navigation items for "Tracks" and "Playlists"
  - Update StudioLayout component with new routes
  - _Requirements: 7.1, 7.2_

- [x] 2. Create track publishing functionality
  - [x] 2.1 Create TrackForm component
    - Build form with title, artist, description, audio upload, cover image, lyrics, credits
    - Add file upload validation for audio formats (MP3, FLAC, M4A, OGG)
    - _Requirements: 1.1, 1.2_

  - [ ]* 2.2 Write property test for track form validation
    - **Property 1: Track events have correct structure**
    - **Validates: Requirements 1.3**

  - [x] 2.3 Create usePublishTrack hook
    - Upload files first, then create Nostr event (Kind 36787) with correct tags
    - Handle file upload completion before publishing
    - _Requirements: 1.3, 1.4_

  - [ ]* 2.4 Write property test for track publishing
    - **Property 4: File uploads complete before publishing**
    - **Validates: Requirements 1.2**

- [x] 3. Create track library management
  - [x] 3.1 Create TrackLibrary component
    - Display user's published tracks with title, cover, duration
    - Add search and filtering functionality
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 3.2 Create track editing functionality
    - Load existing track data into TrackForm for editing
    - Update existing Nostr event while preserving identifier
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ]* 3.3 Write property test for track updates
    - **Property 5: Track metadata preservation**
    - **Validates: Requirements 3.2**

- [x] 4. Create playlist publishing functionality
  - [x] 4.1 Create PlaylistForm component
    - Build form with title, description, cover image
    - Add track selection from user's published tracks
    - _Requirements: 4.1, 4.5_

  - [x] 4.2 Create usePublishPlaylist hook
    - Create Nostr event (Kind 34139) with track references as "a" tags
    - Ensure correct track reference format: "36787:pubkey:identifier"
    - _Requirements: 4.2, 4.4_

  - [ ]* 4.3 Write property test for playlist publishing
    - **Property 2: Playlist events have correct structure**
    - **Validates: Requirements 4.4**

  - [ ]* 4.4 Write property test for track references
    - **Property 3: Track references are valid**
    - **Validates: Requirements 4.2**

- [x] 5. Create playlist management
  - [x] 5.1 Create PlaylistManager component
    - Display user's playlists with metadata and track count
    - Add playlist editing and deletion functionality
    - _Requirements: 6.1, 6.5_

  - [x] 5.2 Implement playlist track reordering
    - Update playlist event with new track order in "a" tags
    - Preserve track metadata during reordering
    - _Requirements: 6.2, 6.3_

  - [ ]* 5.3 Write property test for playlist track ordering
    - **Property 6: Playlist track ordering**
    - **Validates: Requirements 6.2**

- [x] 6. Create studio pages and routing
  - [x] 6.1 Create /studio/tracks page
    - Display TrackLibrary component
    - Add "New Track" button and track management actions
    - _Requirements: 2.1, 2.3_

  - [x] 6.2 Create /studio/playlists page
    - Display PlaylistManager component
    - Add "New Playlist" button and playlist management actions
    - _Requirements: 4.1_

  - [x] 6.3 Create track and playlist creation/editing routes
    - Add routes for /studio/tracks/new, /studio/tracks/edit/:id
    - Add routes for /studio/playlists/new, /studio/playlists/edit/:id
    - _Requirements: 7.2_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integration and final testing
  - [x] 8.1 Test track publishing end-to-end
    - Verify tracks appear in existing music discovery interfaces
    - Test audio playback with published tracks
    - _Requirements: 8.1, 8.2_

  - [x] 8.2 Test playlist publishing end-to-end
    - Verify playlists appear alongside existing releases
    - Test playlist playback and track ordering
    - _Requirements: 8.3, 8.4_

  - [ ]* 8.3 Write integration tests for backward compatibility
    - Test that existing releases and new playlists work together
    - _Requirements: 8.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Focus on publishing correct Nostr events - existing app handles the rest
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases