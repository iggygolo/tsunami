# Implementation Plan: Trending Tracks Discovery

## Overview

This implementation plan creates a trending tracks section on the main page by leveraging existing components and infrastructure. The approach reuses ReleaseCard components and converts individual tracks to release format for consistent UI display.

## Tasks

- [x] 1. Create trending tracks hook and utilities
  - Create `useTrendingTracks` hook to fetch and rank tracks
  - Implement trending score calculation function
  - Add artist diversity filtering utility
  - _Requirements: 2.1, 2.2, 2.3, 3.4_

- [ ]* 1.1 Write property test for trending score calculation
  - **Property 1: Trending Score Calculation**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ]* 1.2 Write property test for artist diversity filtering
  - **Property 2: Artist Diversity**
  - **Validates: Requirements 3.4**

- [x] 2. Create TrendingTracksSection component
  - Build main section component using existing patterns
  - Integrate with useTrendingTracks hook
  - Handle loading and error states
  - Convert tracks to releases using trackToRelease()
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 2.1 Write unit tests for TrendingTracksSection
  - Test component rendering with mock data
  - Test loading and error states
  - Test track-to-release conversion

- [x] 3. Integrate section into main page
  - Add TrendingTracksSection to Index page
  - Position between hero and recent releases sections
  - Ensure proper spacing and visual separation
  - _Requirements: 8.1, 8.2_

- [ ]* 3.1 Write property test for section positioning
  - **Property 4: Section Positioning**
  - **Validates: Requirements 8.1**

- [x] 4. Implement responsive grid layout
  - Create horizontal scrollable grid for track cards
  - Ensure responsive behavior across device sizes
  - Apply consistent styling with existing components
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

- [ ]* 4.1 Write property test for visual consistency
  - **Property 3: Track Display Consistency**
  - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 5. Add audio playback integration
  - Ensure ReleaseCard play buttons work with converted tracks
  - Test universal audio player integration
  - Handle tracks without audio URLs
  - _Requirements: 4.1, 4.2, 4.5_

- [ ]* 5.1 Write unit tests for audio integration
  - Test play button functionality
  - Test handling of tracks without audio
  - Test universal audio player integration

- [x] 6. Implement conditional rendering and empty states
  - Hide section when no trending tracks available
  - Show section with fewer items when less than 8 tracks
  - Add "View All Tracks" navigation link
  - _Requirements: 8.3, 8.4, 8.5_

- [ ]* 6.1 Write unit tests for conditional rendering
  - Test empty state handling
  - Test minimum display threshold
  - Test navigation link functionality

- [x] 7. Final integration and testing
  - Ensure all components work together
  - Test with real Nostr data
  - Verify performance and caching behavior
  - _Requirements: 5.1, 5.2_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Reuses existing components (ReleaseCard, ArtistLinkCompact) for consistency
- Leverages existing hooks (useMusicTracks, useMusicTracksWithStats) for data fetching
- Uses trackToRelease() conversion for UI compatibility