# Implementation Plan: Homepage Layout Improvement

## Overview

This implementation plan reorganizes the Tsunami homepage to focus on music discovery with the following layout: Latest Release → Recent Releases → Featured Artists → Tsunami Stats → Navigation Cards.

## Tasks

- [x] 1. Remove unwanted social sections from homepage
  - Remove Community CTA banner section
  - Remove Top Supporters section (ZapLeaderboard)
  - Remove Recent Activity section
  - Remove Community Feed section with PostCard components
  - Clean up unused imports (ZapLeaderboard, RecentActivity, PostCard, useCommunityPosts)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2. Enhance Featured Artists section for accurate track counting and previews
  - [x] 2.1 Update track counting logic to only include artist-created tracks
    - Filter tracks where track.artistPubkey === artist.pubkey
    - Exclude tracks that artists added to playlists but didn't create
    - _Requirements: 3.3, 3.4_

  - [x] 2.2 Add latest track detection and preview functionality
    - Find each artist's most recent released track by creation date
    - Add track preview UI with play/pause controls
    - Display latest track title and metadata
    - _Requirements: 3.5, 3.8_

  - [x] 2.3 Update FeaturedArtists component interface and UI
    - Enhance artist data structure to include latest track info
    - Add track preview controls to artist cards
    - Update responsive layout to accommodate new elements
    - _Requirements: 3.6, 3.7_

  - [ ]* 2.4 Write property tests for artist track counting accuracy
    - **Property 3: Artist Track Count Accuracy**
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 2.5 Write property tests for latest track selection
    - **Property 4: Latest Track Selection**
    - **Validates: Requirements 3.5, 3.8**

- [x] 3. Reorder existing sections for optimal music discovery flow
  - Move Recent Releases section to appear immediately after Latest Release hero
  - Move Featured Artists section to appear after Recent Releases
  - Maintain proper spacing and section hierarchy
  - Ensure responsive layout is preserved
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 4. Create Tsunami Stats component
  - [x] 4.1 Create TsunamiStats component with responsive card layout
    - Design card grid layout for statistics display
    - Add semantic icons for each statistic type
    - Implement loading states with skeleton placeholders
    - _Requirements: 5.1, 5.6, 7.1_

  - [x] 4.2 Implement statistics calculation logic
    - Calculate total releases from useStaticReleaseCache
    - Calculate total tracks by summing tracks across all releases
    - Calculate total artists from unique artist pubkeys
    - Integrate community stats from useCommunityStats hook
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [ ]* 4.3 Write property tests for statistics calculations
    - **Property 7: Statistics Accuracy**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [x] 5. Integrate TsunamiStats into homepage layout
  - Add TsunamiStats section after Featured Artists
  - Ensure proper spacing and visual hierarchy
  - Test responsive behavior across screen sizes
  - _Requirements: 5.1, 7.5_

- [x] 5. Update Recent Releases to exclude latest release
  - Modify ReleaseList filtering to exclude the latest release
  - Ensure no duplicate content between hero and recent sections
  - Maintain 6-item limit for recent releases
  - _Requirements: 2.3, 2.2_

- [ ]* 6. Write property tests for section ordering and content
  - [ ]* 6.1 Write property test for section ordering consistency
    - **Property 1: Section Ordering Consistency**
    - **Validates: Requirements 1.1, 2.1, 3.1, 5.1, 6.1**

  - [ ]* 6.2 Write property test for no duplicate content
    - **Property 3: No Duplicate Content Display**
    - **Validates: Requirements 1.1, 2.3**

  - [ ]* 6.3 Write property test for removed sections absence
    - **Property 4: Removed Sections Absence**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 7. Verify and maintain existing functionality
  - Ensure Latest Release hero section functionality is preserved
  - Verify Featured Artists section works correctly
  - Test Navigation Cards section remains functional
  - Confirm SEO meta tags and accessibility features
  - _Requirements: 1.2, 1.3, 1.4, 3.2, 3.3, 6.2, 6.3, 8.1, 8.2, 8.3_

- [ ]* 8. Add comprehensive unit tests
  - Test TsunamiStats component rendering with various data states
  - Test statistics calculation edge cases (empty data, invalid data)
  - Test responsive layout behavior
  - Test loading and error states
  - _Requirements: 7.1, 7.3, 7.4_

- [x] 10. Final integration and testing
  - Test complete homepage flow from loading to final render
  - Verify performance improvements from removed sections
  - Test Enhanced Featured Artists with accurate track counting and previews
  - Test navigation between homepage and other pages
  - Ensure all requirements are met
  - _Requirements: 7.2, 7.3, 8.4, 8.5_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster implementation
- Each task references specific requirements for traceability
- **Enhanced Featured Artists**: Major focus on accurate track counting (only artist-created tracks) and latest track previews
- The implementation focuses on reorganizing existing components with key enhancements to Featured Artists
- Statistics calculation leverages existing data hooks for consistency
- Removed sections improve page performance and focus on music discovery