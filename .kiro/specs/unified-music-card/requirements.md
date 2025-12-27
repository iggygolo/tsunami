# Requirements Document

## Introduction

This specification defines the requirements for creating a unified music card component that standardizes the display of both music releases and individual tracks across the Tsunami platform. The goal is to eliminate code duplication between GlassReleaseCard and TrendingTrackCard components while providing a consistent, reusable interface for displaying music content with playback controls and social interactions.

## Glossary

- **Music_Card**: A unified component that can display either a music release or individual track
- **Release**: A collection of tracks (playlist/album) represented by a MusicRelease object
- **Track**: An individual music track represented by a MusicTrackData object
- **Social_Actions**: Interactive buttons for like, share, and zap functionality
- **Glass_Style**: Semi-transparent styling with backdrop blur effects used throughout the platform
- **Playback_Controls**: Play/pause button overlay that integrates with the universal audio player
- **Content_Type**: Discriminator indicating whether the card displays a release or track
- **Universal_Audio_Player**: The global audio player system used across the platform

## Requirements

### Requirement 1: Unified Component Interface

**User Story:** As a developer, I want a single music card component that can display both releases and tracks, so that I can maintain consistent UI patterns without code duplication.

#### Acceptance Criteria

1. THE Music_Card SHALL accept either a MusicRelease or MusicTrackData object as its primary data prop
2. THE Music_Card SHALL automatically detect the content type and render appropriate metadata
3. THE Music_Card SHALL provide a consistent API regardless of whether displaying a release or track
4. THE Music_Card SHALL maintain backward compatibility with existing usage patterns
5. THE Music_Card SHALL use TypeScript discriminated unions to ensure type safety

### Requirement 2: Visual Consistency and Glass Styling

**User Story:** As a user, I want all music cards to have the same visual appearance and behavior, so that the interface feels cohesive and predictable.

#### Acceptance Criteria

1. THE Music_Card SHALL use glass morphism styling with semi-transparent backgrounds and backdrop blur
2. THE Music_Card SHALL maintain square aspect ratio for the main image area
3. THE Music_Card SHALL display content image with fallback to music icon when no image is available
4. THE Music_Card SHALL show hover effects with scale transform and opacity changes
5. THE Music_Card SHALL use consistent border radius, shadows, and transition animations

### Requirement 3: Adaptive Content Display

**User Story:** As a user, I want to see appropriate information for both releases and tracks, so that I can understand what type of content I'm viewing.

#### Acceptance Criteria

1. WHEN displaying a release, THE Music_Card SHALL show release title, artist name, and track count
2. WHEN displaying a track, THE Music_Card SHALL show track title, artist name, and duration if available
3. WHEN content has an image, THE Music_Card SHALL display the image with proper aspect ratio and object fit
4. WHEN content lacks an image, THE Music_Card SHALL show a consistent fallback music icon
5. THE Music_Card SHALL use the same typography hierarchy for titles and artist names

### Requirement 4: Universal Playback Integration

**User Story:** As a music listener, I want to play releases and tracks directly from any music card, so that I can quickly sample content without navigation.

#### Acceptance Criteria

1. WHEN a user clicks the play button on a release, THE Music_Card SHALL start playing the release using useUniversalTrackPlayback
2. WHEN a user clicks the play button on a track, THE Music_Card SHALL start playing the track using the universal audio player
3. WHEN content is currently playing, THE Music_Card SHALL show a pause button instead of play button
4. WHEN content is loading, THE Music_Card SHALL show a loading spinner in the play button
5. WHEN content has no playable audio, THE Music_Card SHALL disable the play button with appropriate messaging

### Requirement 5: Social Interaction Standardization

**User Story:** As a user, I want consistent social interaction buttons on all music cards, so that I can like, share, and zap content using familiar patterns.

#### Acceptance Criteria

1. THE Music_Card SHALL display like, share, and zap buttons in the bottom-right corner
2. THE Social_Actions SHALL use the standardized color system (red for like, cyan for share, yellow for zap)
3. THE Social_Actions SHALL show glass style when inactive and colored backgrounds when hovered or active
4. THE Social_Actions SHALL integrate with existing interaction hooks (useReleaseInteractions, useTrackInteractions)
5. THE Social_Actions SHALL handle the creation of appropriate Nostr events for each content type

### Requirement 6: Status Indicators and Badges

**User Story:** As a user, I want to see visual indicators for playing status and content warnings, so that I can understand the current state and content appropriateness.

#### Acceptance Criteria

1. WHEN content is currently playing, THE Music_Card SHALL show a "Playing" indicator in the top-left corner
2. WHEN content is marked as explicit, THE Music_Card SHALL show an "E" badge in the top-left corner when not playing
3. THE Status_Indicators SHALL use consistent styling with backdrop blur and appropriate colors
4. THE Status_Indicators SHALL animate appropriately (pulse for playing indicator)
5. THE Status_Indicators SHALL prioritize playing status over explicit badge when both apply

### Requirement 7: Navigation and Link Generation

**User Story:** As a user, I want to click on music cards to navigate to detailed views, so that I can explore content further.

#### Acceptance Criteria

1. WHEN displaying a release, THE Music_Card SHALL generate links using generateReleaseLink function
2. WHEN displaying a track, THE Music_Card SHALL generate links using generateTrackLink function
3. THE Music_Card SHALL make the entire card area clickable for navigation
4. THE Music_Card SHALL prevent event bubbling when clicking on interactive elements (play button, social actions)
5. THE Music_Card SHALL include prefetching on hover for improved navigation performance

### Requirement 8: Artist Attribution Integration

**User Story:** As a user, I want to see consistent artist attribution on all music cards, so that I can easily identify and navigate to artist profiles.

#### Acceptance Criteria

1. THE Music_Card SHALL use the ArtistLinkCompact component for artist attribution
2. THE Music_Card SHALL extract artist information from either release or track data appropriately
3. THE Music_Card SHALL handle cases where artist information is missing or incomplete
4. THE Music_Card SHALL maintain consistent text sizing and styling for artist links
5. THE Music_Card SHALL support both pubkey-based and name-based artist identification

### Requirement 9: Responsive Design and Layout

**User Story:** As a user on different devices, I want music cards to display appropriately across all screen sizes, so that I can browse music comfortably on any device.

#### Acceptance Criteria

1. THE Music_Card SHALL maintain square aspect ratio across all screen sizes
2. THE Music_Card SHALL scale social action buttons appropriately for touch interfaces
3. THE Music_Card SHALL adjust text sizing based on available space
4. THE Music_Card SHALL support flexible grid layouts (2, 3, 4, or 6 columns)
5. THE Music_Card SHALL maintain minimum and maximum sizes for optimal readability

### Requirement 10: Performance and Accessibility

**User Story:** As a user, I want music cards to load quickly and be accessible, so that I can browse music efficiently regardless of my abilities or connection speed.

#### Acceptance Criteria

1. THE Music_Card SHALL implement lazy loading for images to improve page performance
2. THE Music_Card SHALL provide appropriate alt text for images and screen readers
3. THE Music_Card SHALL support keyboard navigation for all interactive elements
4. THE Music_Card SHALL maintain proper focus management and visual focus indicators
5. THE Music_Card SHALL follow WCAG accessibility guidelines for color contrast and interaction

### Requirement 11: Error Handling and Fallbacks

**User Story:** As a user, I want music cards to handle missing or invalid data gracefully, so that I can still browse content even when some information is unavailable.

#### Acceptance Criteria

1. WHEN image URLs are invalid or fail to load, THE Music_Card SHALL show the fallback music icon
2. WHEN artist information is missing, THE Music_Card SHALL show "Unknown Artist" with appropriate styling
3. WHEN playback fails, THE Music_Card SHALL show appropriate error states without breaking the interface
4. WHEN social interactions fail, THE Music_Card SHALL provide user feedback and maintain button states
5. THE Music_Card SHALL log errors appropriately for debugging while maintaining user experience

### Requirement 12: Component Migration Strategy

**User Story:** As a developer, I want to migrate existing components to use the unified card, so that I can eliminate code duplication while maintaining existing functionality.

#### Acceptance Criteria

1. THE Unified_Music_Card SHALL replace GlassReleaseCard in all existing usage locations
2. THE Unified_Music_Card SHALL replace TrendingTrackCard within TrendingTracksSection
3. THE Migration SHALL maintain all existing props and behavior for backward compatibility
4. THE Migration SHALL not break any existing tests or functionality
5. THE Migration SHALL include deprecation warnings for old components before removal