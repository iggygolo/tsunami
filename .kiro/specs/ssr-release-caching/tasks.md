# Implementation Plan: SSR Release Caching

## Overview

This implementation plan creates a Static Site Generation (SSG) system for music releases by extending the existing build process. The approach reuses existing Nostr data fetching logic and integrates seamlessly with the current Vite build pipeline to generate cached JSON files and pre-rendered HTML pages.

## Tasks

- [x] 1. Create SSG build script foundation
  - Create `scripts/build-ssg.ts` with core SSG generation logic
  - Reuse existing Nostr fetching functions from `build-rss.ts`
  - Set up TypeScript interfaces for cache file formats
  - _Requirements: 4.1, 4.2_

- [ ]* 1.1 Write property test for build output completeness
  - **Property 1: Build Output Completeness**
  - **Validates: Requirements 1.2, 4.5, 6.2**

- [x] 2. Implement release data caching
  - [x] 2.1 Create release cache generation function
    - Generate `releases.json` with latest 20 releases
    - Include complete track data for each release
    - Add metadata (generation time, data source, relay info)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Create latest release cache generation
    - Generate `latest-release.json` for homepage
    - Include fallback structure for missing data
    - _Requirements: 1.5_

- [ ]* 2.3 Write property test for data fetching consistency
  - **Property 2: Data Fetching Consistency**
  - **Validates: Requirements 1.1, 4.2**

- [ ]* 2.4 Write property test for cache data completeness
  - **Property 3: Cache Data Completeness**
  - **Validates: Requirements 1.3, 1.4, 6.3**

- [ ] 3. Implement HTML page pre-rendering
  - [ ] 3.1 Create page rendering utilities
    - Create `src/utils/pageRenderer.ts` for HTML generation
    - Implement React server-side rendering for release pages
    - Generate proper meta tags and structured data
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Pre-render release pages
    - Generate static HTML for latest 10 releases
    - Create directory structure (`releases/[id]/index.html`)
    - Include asset preload hints and hydration data
    - _Requirements: 2.1, 2.2_

- [ ]* 3.3 Write property test for pre-rendered content integrity
  - **Property 4: Pre-rendered Content Integrity**
  - **Validates: Requirements 2.1, 2.2, 5.1**

- [ ] 4. Checkpoint - Verify build process integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create client-side cache integration
  - [x] 5.1 Create static cache hooks
    - Create `src/hooks/useStaticReleaseCache.ts`
    - Implement cache-first loading strategy with Nostr fallback
    - Add cache staleness detection and background refresh
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Update existing components to use cached data
    - Modify homepage to use cached release data
    - Update release list components for cache integration
    - Ensure smooth fallback to existing Nostr queries
    - _Requirements: 3.1, 3.2, 3.4_

- [ ]* 5.3 Write property test for client cache loading
  - **Property 6: Client Cache Loading**
  - **Validates: Requirements 3.1, 3.2**

- [ ]* 5.4 Write property test for fallback behavior consistency
  - **Property 5: Fallback Behavior Consistency**
  - **Validates: Requirements 1.5, 2.5, 3.4, 5.5**

- [ ] 6. Implement React hydration support
  - [ ] 6.1 Add hydration preservation logic
    - Ensure pre-rendered content is preserved during hydration
    - Add hydration error boundaries and fallback mechanisms
    - Test with existing interactive features (audio playback, navigation)
    - _Requirements: 2.4, 5.1, 5.2, 5.5_

- [ ]* 6.2 Write property test for hydration preservation
  - **Property 7: Hydration Preservation**
  - **Validates: Requirements 2.4, 5.2**

- [ ] 7. Add cache refresh mechanisms
  - [ ] 7.1 Implement background cache refresh
    - Add staleness detection based on cache timestamps
    - Implement background Nostr data fetching for stale cache
    - Update UI smoothly when fresh data arrives
    - _Requirements: 3.3, 5.4_

- [ ]* 7.2 Write property test for cache refresh behavior
  - **Property 8: Cache Refresh Behavior**
  - **Validates: Requirements 3.3, 5.4**

- [x] 8. Integrate SSG with build pipeline
  - [x] 8.1 Update build scripts
    - Modify `package.json` build command to include SSG step
    - Add build statistics and progress logging
    - Ensure proper error handling and fallback data preservation
    - _Requirements: 4.1, 4.3, 4.4, 6.5_

  - [x] 8.2 Add error handling and recovery
    - Handle Nostr relay failures gracefully
    - Preserve existing cache files on generation failure
    - Provide clear error messages and build statistics
    - _Requirements: 4.4, 6.5_

- [ ]* 8.3 Write property test for build process integration
  - **Property 9: Build Process Integration**
  - **Validates: Requirements 4.1, 4.3**

- [ ]* 8.4 Write property test for error recovery
  - **Property 10: Error Recovery**
  - **Validates: Requirements 4.4, 6.5**

- [ ] 9. Add cache freshness validation
  - [ ] 9.1 Implement cache invalidation strategy
    - Add cache version tracking for invalidation
    - Ensure new releases appear in next build's cache
    - Add client-side cache validation logic
    - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 9.2 Write property test for cache freshness
  - **Property 11: Cache Freshness**
  - **Validates: Requirements 6.1**

- [x] 10. Final integration and testing
  - [x] 10.1 End-to-end integration testing
    - Test complete build-to-deployment pipeline
    - Verify all generated files are included in deployment
    - Test cache loading and hydration in production-like environment
    - _Requirements: 4.5_

  - [x] 10.2 Performance optimization
    - Optimize build time for SSG generation
    - Minimize cache file sizes
    - Test with various numbers of releases
    - _Requirements: Performance considerations_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation reuses existing Nostr fetching logic to minimize complexity
- All generated files are static and compatible with any static hosting solution