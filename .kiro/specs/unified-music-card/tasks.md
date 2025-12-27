# Implementation Plan: Unified Music Card

## Overview

Create a unified music card component that consolidates GlassReleaseCard and TrendingTrackCard into a single reusable component.

## Tasks

- [x] 1. Create UnifiedMusicCard component
  - Create component file with TypeScript interfaces
  - Implement content type detection (release vs track)
  - Add glass styling and square aspect ratio
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Add image display with fallback
  - Display content image or music icon fallback
  - Handle image loading errors gracefully
  - _Requirements: 2.3, 3.3, 3.4, 11.1_

- [x] 3. Integrate playback controls
  - Add play/pause button with loading states
  - Integrate with existing playback hooks based on content type
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Add social interaction buttons
  - Implement like, share, and zap buttons with standardized colors
  - Position in bottom-right corner with glass styling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Add status indicators
  - Show playing indicator and explicit badge
  - Implement priority logic (playing over explicit)
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 6. Implement navigation
  - Generate appropriate links based on content type
  - Make card clickable while preventing event bubbling on buttons
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7. Add artist attribution
  - Use ArtistLinkCompact component
  - Handle missing artist data gracefully
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 8. Checkpoint - Test core functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update TrendingTracksSection
  - Replace TrendingTrackCard with UnifiedMusicCard
  - Preserve all existing functionality
  - _Requirements: 12.2_

- [x] 10. Replace GlassReleaseCard usage
  - Update all components using GlassReleaseCard
  - Ensure consistent behavior across the app
  - _Requirements: 12.1_

- [x] 11. Final validation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify no breaking changes

## Notes

- Focus on reusing existing hooks and utilities
- Maintain backward compatibility during migration
- Each task builds incrementally on previous work