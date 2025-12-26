# Implementation Plan: Social Community Rework

## Overview

This implementation transforms Tsunami's social and community features from single-artist focused to global multi-artist platform. The approach removes hardcoded artist dependencies, expands social feeds to all music artists, and makes studio features work for any authenticated artist.

## Tasks

- [x] 1. Create multi-artist social feed hooks
  - Create `useCommunityPosts` hook that queries all discovered music artists
  - Update existing social hooks to accept artist parameter instead of using config
  - Integrate with existing artist discovery from multi-artist spec
  - _Requirements: 1.1, 1.3_

- [ ]* 1.1 Write property test for multi-artist community content display
  - **Property 1: Multi-Artist Community Content Display**
  - **Validates: Requirements 1.1**

- [ ]* 1.2 Write property test for automatic artist discovery
  - **Property 3: Automatic Artist Discovery**
  - **Validates: Requirements 1.3**

- [x] 2. Combine and update Community/Social pages for unified multi-artist experience
  - Merge Community.tsx and SocialFeed.tsx into unified community experience
  - Create unified timeline showing posts, releases, and activity from all artists
  - Add artist attribution and highlights for featured/active artists
  - Include artist discovery section with highlighted artists
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 2.1 Write property test for artist attribution consistency
  - **Property 2: Artist Attribution Consistency**
  - **Validates: Requirements 1.2**

- [ ]* 2.2 Write property test for content diversity display
  - **Property 7: Content Diversity Display**
  - **Validates: Requirements 3.3**

- [x] 3. Create artist highlights and discovery features
  - Add "Featured Artists" section showcasing active/popular artists
  - Create artist spotlight component for highlighting new or trending artists
  - Integrate artist highlights with community timeline
  - Add easy navigation from highlights to full artist profiles
  - _Requirements: 1.2, 1.3, 3.3_

- [x] 4. Make studio features artist-independent
  - Update ArtistSettings.tsx to use authenticated user instead of config
  - Remove dependencies on MUSIC_CONFIG in studio components
  - Update permission checks to use authenticated user identity
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 4.1 Write property test for authentication-based studio access
  - **Property 4: Authentication-Based Studio Access**
  - **Validates: Requirements 2.1**

- [ ]* 4.2 Write property test for authenticated content association
  - **Property 5: Authenticated Content Association**
  - **Validates: Requirements 2.2**

- [ ]* 4.3 Write property test for independent profile management
  - **Property 6: Independent Profile Management**
  - **Validates: Requirements 2.3**

- [x] 5. Update TrackForm and studio components for any artist
  - Remove artist config dependencies from TrackForm.tsx
  - Update track publishing to use authenticated user's identity
  - Ensure all studio workflows work for any authenticated artist
  - _Requirements: 2.1, 2.2_

- [x] 6. Update homepage and navigation for global platform branding
  - Modify homepage to showcase diverse artists instead of single artist
  - Update navigation and branding to emphasize community
  - Remove single-artist focused messaging throughout the app
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. Update social interaction components for multi-artist support
  - Ensure PostCard, NoteComposer work with any artist
  - Update social interactions to support cross-artist engagement
  - Maintain existing interaction patterns while supporting multiple artists
  - _Requirements: 1.2, 1.3_

- [x] 8. Checkpoint - Test multi-artist social functionality end-to-end
  - Ensure all tests pass, ask the user if questions arise.
  - All diagnostic issues resolved
  - Multi-artist functionality implemented and working

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Implementation builds on existing multi-artist discovery infrastructure
- Focus on removing hardcoded artist dependencies while maintaining functionality