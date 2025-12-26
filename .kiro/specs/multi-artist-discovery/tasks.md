# Implementation Plan: Multi-Artist Discovery

## Overview

This implementation transforms the Tsunami music application from a single-artist showcase into a multi-artist discovery platform. The approach focuses on removing artist filters from Nostr queries, adding artist attribution to all music content, and implementing basic artist filtering and profile functionality.

## Tasks

- [x] 1. Update core data fetching to support multiple artists
  - Remove artist filters from useReleases and useMusicTracks hooks
  - Update Nostr queries to fetch from all artists instead of just configured artist
  - Ensure existing event validation and conversion logic works with multi-artist data
  - _Requirements: 1.1, 5.1_

- [ ]* 1.1 Write property test for multi-artist content discovery
  - **Property 1: Multi-Artist Content Discovery**
  - **Validates: Requirements 1.1, 5.1**

- [x] 2. Create artist information utilities and caching
  - Create utility functions to extract artist info from events and profiles
  - Implement simple caching for artist names and images
  - Add functions to convert pubkeys to npubs and get display names
  - _Requirements: 5.2, 9.3, 9.5_

- [ ]* 2.1 Write property test for artist name fallback behavior
  - **Property 9: Artist Name Fallback Behavior**
  - **Validates: Requirements 7.5, 9.3, 9.5**

- [x] 3. Create ArtistLink component for consistent artist attribution
  - Build reusable component to display artist name and image with link to profile
  - Support optional image display and custom styling
  - Integrate with artist info utilities for name and image resolution
  - _Requirements: 1.2, 3.1, 7.1_

- [ ]* 3.1 Write property test for artist name and image display
  - **Property 2: Artist Name and Image Display**
  - **Validates: Requirements 1.2, 3.1, 7.1**

- [x] 4. Enhance ReleaseCard and ReleaseList components with artist attribution
  - Add ArtistLink component to release cards to show artist info
  - Update ReleaseList to display artist information for each release
  - Ensure artist attribution is prominent and clickable
  - _Requirements: 3.4, 3.5_

- [ ]* 4.1 Write property test for release detail artist information
  - **Property 8: Release Detail Artist Information**
  - **Validates: Requirements 3.4**

- [x] 5. Implement artist filtering functionality
  - Create ArtistFilter dropdown component with list of discovered artists
  - Add "All Artists" option as default selection
  - Integrate filter with ReleaseList to show filtered results
  - Maintain existing sort order and pagination when filtering
  - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.5_

- [ ]* 5.1 Write property test for artist filtering functionality
  - **Property 3: Artist Filtering Functionality**
  - **Validates: Requirements 1.4, 4.2, 4.3, 4.5**

- [ ]* 5.2 Write property test for artist filter UI presence
  - **Property 7: Artist Filter UI Presence**
  - **Validates: Requirements 4.1, 3.2**

- [x] 6. Update homepage to display multi-artist content
  - Modify homepage to show latest release from any artist (not just configured artist)
  - Update recent releases grid to include releases from multiple artists
  - Ensure artist attribution is shown on homepage release displays
  - _Requirements: 6.1, 6.4_

- [ ]* 6.1 Write property test for multi-artist homepage content
  - **Property 6: Multi-Artist Homepage Content**
  - **Validates: Requirements 6.1, 6.4**

- [x] 7. Enhance artist profile pages to work with multi-artist system
  - Update existing artist profile route (/:npub) to show only that artist's content
  - Ensure profile pages display artist information and complete discography
  - Add artist info display using the new artist utilities
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ]* 7.1 Write property test for artist profile navigation
  - **Property 4: Artist Profile Navigation**
  - **Validates: Requirements 2.1, 2.3**

- [ ]* 7.2 Write property test for artist profile content display
  - **Property 5: Artist Profile Content Display**
  - **Validates: Requirements 2.2, 2.5**

- [x] 8. Update static site generation to support multi-artist content
  - Modify build scripts to generate static data from all artists
  - Update RSS generation to include releases from multiple artists
  - Ensure static caching works with multi-artist data
  - _Requirements: 5.4, 5.5_

- [x] 9. Checkpoint - Test multi-artist functionality end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- The implementation maintains backward compatibility with existing UI patterns
- Focus on simplicity while ensuring artist attribution is clear and consistent