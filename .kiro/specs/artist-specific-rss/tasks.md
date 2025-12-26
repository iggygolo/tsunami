# Implementation Plan: Artist-Specific RSS

## Overview

Transform RSS from global to artist-specific feeds by adding RSS toggle to artist settings, modifying the build process to generate individual RSS files, and updating the UI to display RSS badges on artist pages.

## Tasks

- [x] 1. Update artist metadata interface and settings
  - [x] 1.1 Add RSS toggle to ArtistSettings component
    - Add Switch component for RSS enabled/disabled
    - Update form data interface to include `rssEnabled: boolean`
    - Integrate with existing save functionality
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 1.2 Write property test for RSS settings persistence
    - **Property 1: RSS Settings Persistence**
    - **Validates: Requirements 1.2, 1.3, 5.1**

  - [x] 1.3 Update useArtistMetadata hook for RSS settings
    - Add RSS settings to ArtistMetadata interface
    - Handle missing RSS settings with default disabled state
    - Ensure backward compatibility with existing metadata
    - _Requirements: 1.4, 1.5, 5.2, 5.5_

  - [ ]* 1.4 Write property test for RSS default state
    - **Property 2: RSS Default State**
    - **Validates: Requirements 1.5, 5.5**

- [x] 2. Checkpoint - Ensure settings functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Modify build process for per-artist RSS generation
  - [x] 3.1 Update build-static-data.ts script
    - Add function to fetch artist metadata with RSS settings
    - Modify RSS generation to create individual artist feeds
    - Remove global RSS generation functionality
    - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2_

  - [ ]* 3.2 Write property test for conditional RSS generation
    - **Property 3: Conditional RSS Generation**
    - **Validates: Requirements 2.2, 2.3**

  - [x] 3.3 Implement artist-specific RSS content filtering
    - Filter tracks and playlists by artist pubkey
    - Generate RSS feeds with only artist's content
    - Save RSS files to `/rss/{artistPubkey}.xml` path
    - _Requirements: 2.4, 2.5, 7.1_

  - [ ]* 3.4 Write property test for artist content filtering
    - **Property 4: Artist Content Filtering**
    - **Validates: Requirements 2.4, 7.1**

  - [ ]* 3.5 Write property test for RSS file path format
    - **Property 5: RSS File Path Format**
    - **Validates: Requirements 2.5, 3.6**

- [ ] 4. Create artist page RSS display components
  - [x] 4.1 Create ArtistRSSBadge component
    - Display RSS badge when artist has RSS enabled
    - Include RSS link with correct format
    - Follow existing design system patterns
    - _Requirements: 3.1, 3.2, 3.6_

  - [ ]* 4.2 Write property test for artist page RSS display
    - **Property 7: Artist Page RSS Display**
    - **Validates: Requirements 3.1, 3.4**

  - [x] 4.3 Integrate RSS badge into artist pages
    - Add RSS badge to relevant artist page components
    - Conditionally display based on RSS enabled status
    - Ensure proper styling and positioning
    - _Requirements: 3.1, 3.4_

- [ ] 5. Remove global RSS functionality
  - [x] 5.1 Remove global RSS navigation links
    - Remove RSS links from navigation components
    - Clean up unused RSS navigation code
    - _Requirements: 4.1, 4.2_

  - [ ]* 5.2 Write unit tests for global RSS removal
    - Test that global RSS navigation elements are not present
    - _Requirements: 4.1, 4.2_

  - [x] 5.3 Add migration notice for deprecated RSS URLs
    - Create migration notice page component
    - Add redirect from old `/rss.xml` to migration notice
    - Include links to individual artist RSS feeds
    - _Requirements: 4.5, 8.1, 8.2, 8.3_

- [ ] 6. Add RSS format validation and error handling
  - [x] 6.1 Implement RSS format validation
    - Ensure generated RSS feeds are valid XML
    - Include required RSS elements and iTunes tags
    - Handle malformed data gracefully
    - _Requirements: 2.6, 7.2_

  - [ ]* 6.2 Write property test for RSS format compliance
    - **Property 6: RSS Format Compliance**
    - **Validates: Requirements 2.6, 7.2**

  - [x] 6.3 Add error handling for build process
    - Continue build if individual RSS generation fails
    - Log detailed error information
    - Provide fallback behavior for missing metadata
    - _Requirements: 6.6_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- RSS functionality builds on existing artist metadata system
- Build process modifications extend current static generation