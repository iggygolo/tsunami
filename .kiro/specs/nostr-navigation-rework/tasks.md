# Implementation Plan: Nostr Navigation Rework

## Overview

This implementation creates dedicated navigation for Nostr music events with separate TrackPage and ReleasePage components, standardized URL patterns, and robust event resolution. The system replaces fragile navigation with reliable `/track/{pubkey}/{identifier}` and `/release/{pubkey}/{identifier}` URLs.

## Tasks

- [x] 1. Create URL routing infrastructure
  - Add new routes to AppRouter for track and release pages
  - Create URL parameter extraction utilities
  - Implement URL generation functions
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 2. Implement EventResolver hook
  - [x] 2.1 Create useEventResolver hook with multi-relay querying
    - Implement parallel relay queries with timeout handling
    - Add retry logic with exponential backoff
    - Include caching with TTL support
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 2.2 Create usePlaylistResolution hook
    - Query for playlists containing specific tracks
    - Filter and validate playlist events
    - Cache playlist resolution results
    - _Requirements: 5.5, 7.1_

- [ ] 3. Build TrackPage component
  - [x] 3.1 Create TrackPage component structure
    - Set up component with pubkey/identifier props
    - Implement event resolution using useEventResolver
    - Add loading and error states
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Implement track metadata display
    - Display title, artist, description, and cover art
    - Show lyrics and credits when available
    - Include audio player integration
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 3.3 Add playlist cross-navigation
    - Display all playlists containing the track
    - Show parent track references
    - Create navigation links to playlists
    - _Requirements: 5.5, 7.1_

- [ ] 4. Build ReleasePage component
  - [x] 4.1 Create ReleasePage component structure
    - Set up component with pubkey/identifier props
    - Implement event resolution for releases
    - Add loading and error states
    - _Requirements: 2.1, 2.2_

  - [x] 4.2 Implement release metadata display
    - Display release title, description, and cover art
    - Show release credits and additional metadata
    - Include playlist-style playback controls
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 4.3 Add track listing and navigation
    - Display complete track listing with proper ordering
    - Create navigation links to individual tracks
    - Handle missing track data gracefully
    - _Requirements: 2.3, 6.2, 6.5, 7.2_

- [ ] 5. Implement error handling
  - [x] 5.1 Add event resolution error handling
    - Handle not found, network, and parsing errors
    - Display appropriate error messages
    - Provide navigation back to main areas
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 5.2 Add URL validation and error handling
    - Validate pubkey and identifier formats
    - Handle invalid URL patterns
    - Show parameter validation errors
    - _Requirements: 1.4, 4.4_

- [x] 6. Integrate with existing systems
  - [x] 6.1 Update existing components to use new URLs
    - Modified track and release links throughout the app
    - Updated sharing functionality for new URL patterns
    - Ensured social interactions work with new pages
    - _Requirements: 1.3, 2.4_

  - [x] 6.2 Add performance optimizations
    - Implemented efficient caching strategies with 5-minute stale time
    - Added progressive loading utilities for large releases
    - Included memory management and cache cleanup utilities
    - Created prefetch utilities for improved navigation performance
    - _Requirements: 9.1, 9.3, 9.5_

- [x] 7. Final integration and testing
  - [x] 7.1 Wire all components together
    - Connected TrackPage and ReleasePage to routing
    - Ensured cross-navigation works bidirectionally
    - Verified all error states function properly
    - _Requirements: 1.1, 2.1, 7.1, 7.2_

  - [x] 7.2 Verify cache invalidation
    - Tested that updated events reflect on pages
    - Ensured parallel queries work correctly
    - Validated performance optimizations
    - _Requirements: 1.5, 2.5, 9.2_

## Notes

- Each task builds incrementally on previous components
- Event resolution hooks are reused across both page types
- Existing event conversion logic from `eventConversions.ts` is maintained
- All components follow the established dark theme guidelines
- Cross-navigation ensures seamless user experience between tracks and releases